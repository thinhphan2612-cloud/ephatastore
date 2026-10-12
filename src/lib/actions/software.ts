"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth";
import { logAdmin } from "@/lib/admin-audit";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { isPlatform, SEMVER_RE, type Platform } from "@/lib/software/version";
import { attempt, type ActionResult } from "@/lib/action-result";
import { generateLicenseKey } from "@/lib/software/license";

const FILES_BUCKET = "product-files";

async function assertAdmin() {
  const admin = await getAdminUser();
  if (!admin) throw new Error("Không có quyền admin.");
  return admin;
}

/**
 * Bước 1 upload bộ cài: kiểm tra + tạo signed upload URL.
 * Browser upload THẲNG lên Storage (Vercel giới hạn body function ~4.5MB).
 */
export async function createReleaseUpload(input: {
  productId: string;
  platform: Platform;
  version: string;
  fileName: string;
}): Promise<ActionResult<{ path: string; token: string }>> {
  return attempt(async () => {
    await assertAdmin();
    if (!isPlatform(input.platform)) throw new Error("Nền tảng không hợp lệ.");
    const version = input.version.trim();
    if (!SEMVER_RE.test(version)) throw new Error("Phiên bản phải dạng semver, vd 1.2.8.");

    const supabase = createStoreAdminClient();
    const { data: prod } = await supabase
      .from("products")
      .select("id")
      .eq("id", input.productId)
      .eq("type", "software")
      .maybeSingle();
    if (!prod) throw new Error("Sản phẩm phần mềm không tồn tại.");

    const { count } = await supabase
      .from("software_releases")
      .select("id", { count: "exact", head: true })
      .eq("product_id", input.productId)
      .eq("platform", input.platform)
      .eq("version", version);
    if (count) throw new Error(`Đã có bản ${version} cho ${input.platform}.`);

    const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `software/${input.productId}/${input.platform}/${version}/${safeName}`;
    const { data, error } = await supabase.storage
      .from(FILES_BUCKET)
      .createSignedUploadUrl(path, { upsert: true });
    if (error || !data) throw new Error(`Lỗi tạo link upload: ${error?.message}`);
    return { path, token: data.token };
  });
}

/** Bước 2: file đã lên Storage → ghi software_releases. */
export async function saveRelease(input: {
  productId: string;
  platform: Platform;
  version: string;
  path: string;
  fileName: string;
  sizeBytes: number;
  notes: string;
}): Promise<ActionResult<void>> {
  return attempt(async () => {
    const admin = await assertAdmin();
    const version = input.version.trim();
    const prefix = `software/${input.productId}/${input.platform}/${version}/`;
    if (!isPlatform(input.platform) || !SEMVER_RE.test(version) || !input.path.startsWith(prefix))
      throw new Error("Dữ liệu phiên bản không hợp lệ.");

    const supabase = createStoreAdminClient();
    const { error } = await supabase.from("software_releases").insert({
      product_id: input.productId,
      platform: input.platform,
      version,
      storage_path: input.path,
      file_name: input.fileName,
      size_bytes: input.sizeBytes,
      notes: input.notes.trim(),
    });
    if (error) {
      if (error.code === "23505") throw new Error(`Đã có bản ${version} cho ${input.platform}.`);
      throw new Error(error.message);
    }
    await logAdmin(admin, "release.create", { type: "product", id: input.productId }, {
      platform: input.platform,
      version,
      file: input.fileName,
    });
    revalidatePath(`/admin/products/${input.productId}/edit`);
  });
}

/** Xóa một phiên bản (row + file). */
export async function deleteRelease(formData: FormData) {
  const admin = await assertAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const supabase = createStoreAdminClient();
  const { data: rel } = await supabase
    .from("software_releases")
    .select("product_id,storage_path,platform,version")
    .eq("id", id)
    .maybeSingle();
  if (!rel) return;
  const { error } = await supabase.from("software_releases").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.storage.from(FILES_BUCKET).remove([rel.storage_path]);
  await logAdmin(admin, "release.delete", { type: "product", id: rel.product_id }, { platform: rel.platform, version: rel.version });
  revalidatePath(`/admin/products/${rel.product_id}/edit`);
}

// ---- Key tặng / key thử (vd cho người duyệt Microsoft Store) ----
// Dùng chung bảng licenses: key tặng luôn có `note` (key mua thì note null). Không trừ point, không ghi purchases.

const mask = (key: string) => key.replace(/-[A-Z0-9]{4}-[A-Z0-9]{4}-/, "-****-****-");

/**
 * Tạo key tặng cho một phần mềm. Có email → gắn vào tài khoản đó (hiện ở Thư viện của họ, quyền dùng nguồn "admin");
 * không có email → key rời, chỉ admin thấy (đưa cho người duyệt Microsoft Store / đối tác).
 */
export async function createGiftKey(input: {
  productId: string;
  note: string;
  deviceLimit: number;
  email?: string;
}): Promise<ActionResult<{ key: string }>> {
  return attempt(async () => {
    const admin = await assertAdmin();
    const note = input.note.trim().slice(0, 120);
    if (note.length < 3) throw new Error("Ghi chú cho key (vd “Microsoft Store review 10/2026”) — tối thiểu 3 ký tự.");
    const deviceLimit = Math.min(20, Math.max(1, Math.floor(Number(input.deviceLimit) || 0)));
    const supabase = createStoreAdminClient();
    const { data: prod } = await supabase
      .from("products")
      .select("id,slug")
      .eq("id", input.productId)
      .eq("type", "software")
      .maybeSingle();
    if (!prod) throw new Error("Không tìm thấy phần mềm.");

    let userId: string | null = null;
    const email = (input.email ?? "").trim().toLowerCase();
    if (email) {
      // ilike để không phân biệt hoa thường; thoát % và _ (ký tự đại diện) để không khớp nhầm email khác.
      const exact = email.replace(/[%_\\]/g, (c) => `\\${c}`);
      const { data: prof } = await supabase.from("profiles").select("id").ilike("email", exact).maybeSingle();
      if (!prof) throw new Error(`Không có tài khoản Ephata nào dùng email ${email}.`);
      userId = prof.id;
      const { count } = await supabase
        .from("licenses")
        .select("id", { count: "exact", head: true })
        .eq("product_id", prod.id)
        .eq("store_user_id", userId);
      if (count) throw new Error("Tài khoản này đã có key của phần mềm này (đã mua hoặc đã được tặng).");
    }

    // Key trùng (rất hiếm) → thử lại vài lần.
    let key = "";
    let licenseId = "";
    for (let i = 0; i < 4 && !licenseId; i++) {
      key = generateLicenseKey(prod.slug);
      const { data, error } = await supabase
        .from("licenses")
        .insert({ product_id: prod.id, key, store_user_id: userId, device_limit: deviceLimit, note })
        .select("id")
        .maybeSingle();
      if (data) licenseId = data.id;
      else if (error && error.code !== "23505") throw new Error(error.message);
    }
    if (!licenseId) throw new Error("Không tạo được key, thử lại.");

    if (userId) {
      const { error } = await supabase
        .from("entitlements")
        .upsert(
          { store_user_id: userId, product_id: prod.id, source: "admin", expires_at: null },
          { onConflict: "store_user_id,product_id", ignoreDuplicates: true }
        );
      if (error) {
        await supabase.from("licenses").delete().eq("id", licenseId); // không để key mồ côi
        throw new Error(error.message);
      }
    }

    await logAdmin(admin, "license.gift", { type: "product", id: prod.id }, { key: mask(key), note, device_limit: deviceLimit, email: email || null });
    revalidatePath(`/admin/products/${prod.id}/edit`);
    return { key };
  });
}

/** Khóa / mở lại một key tặng (chỉ key có note — không đụng key khách mua). */
export async function setGiftKeyStatus(licenseId: string, active: boolean): Promise<ActionResult<null>> {
  return attempt(async () => {
    const admin = await assertAdmin();
    const supabase = createStoreAdminClient();
    const { data: lic } = await supabase
      .from("licenses")
      .update({ status: active ? "active" : "revoked" })
      .eq("id", licenseId)
      .not("note", "is", null)
      .select("product_id,key")
      .maybeSingle();
    if (!lic) throw new Error("Không tìm thấy key tặng.");
    await logAdmin(admin, active ? "license.gift_restore" : "license.gift_revoke", { type: "product", id: lic.product_id }, { key: mask(lic.key) });
    revalidatePath(`/admin/products/${lic.product_id}/edit`);
    return null;
  });
}

/** Gỡ mọi thiết bị khỏi một key tặng (người duyệt cài lại máy / cấp lại cho đợt duyệt mới). */
export async function resetGiftKeyDevices(licenseId: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    const admin = await assertAdmin();
    const supabase = createStoreAdminClient();
    const { data: lic } = await supabase
      .from("licenses")
      .select("id,product_id,key")
      .eq("id", licenseId)
      .not("note", "is", null)
      .maybeSingle();
    if (!lic) throw new Error("Không tìm thấy key tặng.");
    const { error } = await supabase.from("license_devices").delete().eq("license_id", lic.id);
    if (error) throw new Error(error.message);
    await logAdmin(admin, "license.gift_reset_devices", { type: "product", id: lic.product_id }, { key: mask(lic.key) });
    revalidatePath(`/admin/products/${lic.product_id}/edit`);
    return null;
  });
}

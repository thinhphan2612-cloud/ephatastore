"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "@/lib/auth";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { isPlatform, SEMVER_RE, type Platform } from "@/lib/software/version";

const FILES_BUCKET = "product-files";

async function assertAdmin() {
  if (!(await getAdminUser())) throw new Error("Không có quyền admin.");
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
}): Promise<{ path: string; token: string }> {
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
}): Promise<void> {
  await assertAdmin();
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
  revalidatePath(`/admin/products/${input.productId}/releases`);
}

/** Xóa một phiên bản (row + file). */
export async function deleteRelease(formData: FormData) {
  await assertAdmin();
  const id = String(formData.get("id") ?? "").trim();
  const supabase = createStoreAdminClient();
  const { data: rel } = await supabase
    .from("software_releases")
    .select("product_id,storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!rel) return;
  const { error } = await supabase.from("software_releases").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await supabase.storage.from(FILES_BUCKET).remove([rel.storage_path]);
  revalidatePath(`/admin/products/${rel.product_id}/releases`);
}

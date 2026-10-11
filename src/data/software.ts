import "server-only";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { issueToken, keyFromToken, LicenseError, normalizeKey } from "@/lib/software/license";
import { compareVersions, type Platform } from "@/lib/software/version";

/**
 * Dữ liệu phần mềm bán key: phiên bản bộ cài, license + thiết bị.
 * Service_role (bypass RLS) — các bảng này không có policy.
 */

export interface SoftwareRelease {
  id: string;
  platform: Platform;
  version: string;
  storage_path: string;
  file_name: string;
  size_bytes: number | null;
  notes: string;
  created_at: string;
}

const RELEASE_SELECT = "id,platform,version,storage_path,file_name,size_bytes,notes,created_at";

/** Mọi phiên bản của sản phẩm, mới nhất (semver) trước. */
export async function listReleases(productId: string): Promise<SoftwareRelease[]> {
  const supabase = createStoreAdminClient();
  const { data, error } = await supabase
    .from("software_releases")
    .select(RELEASE_SELECT)
    .eq("product_id", productId);
  if (error) throw new Error(error.message);
  return ((data ?? []) as SoftwareRelease[]).sort((a, b) =>
    compareVersions(b.version, a.version)
  );
}

/** Bản mới nhất của mỗi nền tảng. */
export async function latestReleases(
  productId: string
): Promise<Partial<Record<Platform, SoftwareRelease>>> {
  const out: Partial<Record<Platform, SoftwareRelease>> = {};
  for (const r of await listReleases(productId)) out[r.platform] ??= r;
  return out;
}

export interface SoftwareProduct {
  id: string;
  slug: string;
  title: string;
  ms_store_url: string | null;
  license_device_limit: number;
  license_offline_days: number;
}

/** Sản phẩm software đang bán theo slug. */
export async function getSoftwareProduct(slug: string): Promise<SoftwareProduct | null> {
  const supabase = createStoreAdminClient();
  const { data } = await supabase
    .from("products")
    .select("id,slug,title,ms_store_url,license_device_limit,license_offline_days")
    .eq("slug", slug)
    .eq("type", "software")
    .eq("published", true)
    .maybeSingle();
  return (data as SoftwareProduct | null) ?? null;
}

// ---- Key của user ----

/** Key user đã mua cho sản phẩm, hoặc null. */
export async function getMyLicenseKey(userId: string, productId: string): Promise<string | null> {
  const supabase = createStoreAdminClient();
  const { data } = await supabase
    .from("licenses")
    .select("key")
    .eq("store_user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();
  return data?.key ?? null;
}

/** product_id → key, cho /library. */
export async function getMyLicenseKeys(userId: string): Promise<Map<string, string>> {
  const supabase = createStoreAdminClient();
  const { data } = await supabase
    .from("licenses")
    .select("product_id,key")
    .eq("store_user_id", userId);
  return new Map((data ?? []).map((r) => [r.product_id as string, r.key as string]));
}

// ---- API cho app ----

interface LicenseRow {
  id: string;
  status: string;
  device_limit: number;
  product: { slug: string; license_offline_days: number } | null;
}

/** Tìm key + kiểm đúng sản phẩm, còn hiệu lực. */
async function findLicense(key: string, product: string): Promise<LicenseRow> {
  const supabase = createStoreAdminClient();
  const { data } = await supabase
    .from("licenses")
    .select("id,status,device_limit,product:products(slug,license_offline_days)")
    .eq("key", normalizeKey(key))
    .maybeSingle();
  const lic = data as unknown as LicenseRow | null;
  if (!lic) throw new LicenseError("LICENSE_NOT_FOUND");
  if (lic.product?.slug !== product) throw new LicenseError("PRODUCT_MISMATCH");
  if (lic.status !== "active") throw new LicenseError("LICENSE_REVOKED");
  return lic;
}

function tokenFor(lic: LicenseRow, product: string, key: string, deviceId: string) {
  return issueToken({
    product,
    key: normalizeKey(key),
    deviceId,
    offlineDays: lic.product?.license_offline_days ?? 30,
  });
}

export async function activateLicense(input: {
  product: string;
  key: string;
  deviceId: string;
  platform?: string;
  appVersion?: string;
}): Promise<string> {
  const lic = await findLicense(input.key, input.product);
  const supabase = createStoreAdminClient();

  // Đếm + ghi thiết bị trong MỘT transaction có khóa key (0024) — kích hoạt song song không vượt giới hạn.
  const { data: res, error } = await supabase.rpc("activate_license_device", {
    p_license: lic.id,
    p_device: input.deviceId,
    p_platform: input.platform ?? null,
    p_version: input.appVersion ?? null,
  });
  if (error) throw new Error(error.message);
  if (res === "DEVICE_LIMIT") throw new LicenseError("DEVICE_LIMIT");

  return tokenFor(lic, input.product, input.key, input.deviceId);
}

export async function refreshLicense(input: {
  product: string;
  licenseToken: string;
  deviceId: string;
  appVersion?: string;
}): Promise<string> {
  const key = keyFromToken(input.licenseToken);
  const lic = await findLicense(key, input.product);
  const supabase = createStoreAdminClient();

  // Thiết bị phải đã đăng ký (admin xóa thiết bị → app về trạng thái chưa kích hoạt).
  const { data } = await supabase
    .from("license_devices")
    .update({ last_seen: new Date().toISOString(), app_version: input.appVersion ?? null })
    .eq("license_id", lic.id)
    .eq("device_id", input.deviceId)
    .select("id");
  if (!data?.length) throw new LicenseError("LICENSE_NOT_FOUND");

  return tokenFor(lic, input.product, key, input.deviceId);
}

export async function deactivateLicense(input: {
  product: string;
  licenseToken: string;
  deviceId: string;
}): Promise<void> {
  const key = keyFromToken(input.licenseToken);
  const supabase = createStoreAdminClient();
  const { data } = await supabase
    .from("licenses")
    .select("id,product:products(slug)")
    .eq("key", key)
    .maybeSingle();
  const lic = data as unknown as { id: string; product: { slug: string } | null } | null;
  if (!lic) throw new LicenseError("LICENSE_NOT_FOUND");
  if (lic.product?.slug !== input.product) throw new LicenseError("PRODUCT_MISMATCH");
  // Key bị thu hồi vẫn cho giải phóng thiết bị.
  const { error } = await supabase
    .from("license_devices")
    .delete()
    .eq("license_id", lic.id)
    .eq("device_id", input.deviceId);
  if (error) throw new Error(error.message);
}

/** Gỡ thiết bị (khách tự làm): 1 lần / 30 ngày / key. */
export const DEVICE_RESET_DAYS = 30;

export interface MyLicense {
  id: string;
  key: string;
  deviceLimit: number;
  devices: { id: string; platform: string | null; lastSeen: string }[];
  /** null = gỡ được ngay; có giá trị = lần gỡ tiếp theo từ thời điểm này. */
  resetAvailableAt: string | null;
}

/** Key + thiết bị đã kích hoạt của user (productId → key) — cho Thư viện. */
export async function getMyLicenses(userId: string): Promise<Map<string, MyLicense>> {
  const supabase = createStoreAdminClient();
  const { data } = await supabase
    .from("licenses")
    .select("id,product_id,key,device_limit,devices_reset_at,license_devices(id,platform,last_seen)")
    .eq("store_user_id", userId);
  const out = new Map<string, MyLicense>();
  for (const r of data ?? []) {
    const next = r.devices_reset_at ? new Date(r.devices_reset_at).getTime() + DEVICE_RESET_DAYS * 86400000 : 0;
    out.set(r.product_id as string, {
      id: r.id,
      key: r.key,
      deviceLimit: r.device_limit,
      devices: ((r.license_devices ?? []) as { id: string; platform: string | null; last_seen: string }[])
        .map((d) => ({ id: d.id, platform: d.platform, lastSeen: d.last_seen }))
        .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen)),
      resetAvailableAt: next > Date.now() ? new Date(next).toISOString() : null,
    });
  }
  return out;
}

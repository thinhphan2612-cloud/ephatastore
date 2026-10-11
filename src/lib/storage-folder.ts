import "server-only";
import type { createStoreAdminClient } from "@/lib/supabase/store-admin";

/** Xóa đệ quy mọi file trong 1 thư mục của bucket (best-effort). */
export async function removeStorageFolder(
  supabase: ReturnType<typeof createStoreAdminClient>,
  bucket: string,
  prefix: string
) {
  const { data } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 });
  if (!data?.length) return;
  const files: string[] = [];
  const folders: string[] = [];
  for (const item of data) {
    // Supabase trả thư mục với id === null.
    if (item.id === null) folders.push(`${prefix}/${item.name}`);
    else files.push(`${prefix}/${item.name}`);
  }
  if (files.length) await supabase.storage.from(bucket).remove(files);
  for (const f of folders) await removeStorageFolder(supabase, bucket, f);
}

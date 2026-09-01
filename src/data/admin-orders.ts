import "server-only";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

export interface AdminUser {
  id: string;
  email: string | null;
  giaoly_linked: boolean;
  plan: string | null;
  created_at: string;
  owned_count: number;
}

export async function adminListUsers(): Promise<AdminUser[]> {
  const supabase = createStoreAdminClient();
  const { data: profs, error } = await supabase
    .from("profiles")
    .select("id,email,giaoly_user_id,plan,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = profs ?? [];
  // đếm entitlements theo user
  const counts = new Map<string, number>();
  const { data: ents } = await supabase.from("entitlements").select("store_user_id");
  for (const e of ents ?? []) {
    counts.set(e.store_user_id, (counts.get(e.store_user_id) ?? 0) + 1);
  }

  return rows.map((p) => ({
    id: p.id,
    email: p.email,
    giaoly_linked: !!p.giaoly_user_id,
    plan: p.plan,
    created_at: p.created_at,
    owned_count: counts.get(p.id) ?? 0,
  }));
}

export interface UserItem {
  product_id: string;
  title: string;
  slug: string;
  granted_at: string;
}

export async function adminGetUserItems(userId: string): Promise<UserItem[]> {
  const supabase = createStoreAdminClient();
  const { data, error } = await supabase
    .from("entitlements")
    .select("product_id,granted_at,product:products(title,slug)")
    .eq("store_user_id", userId)
    .order("granted_at", { ascending: false });
  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as {
    product_id: string;
    granted_at: string;
    product: { title: string; slug: string } | null;
  }[]).map((e) => ({
    product_id: e.product_id,
    title: e.product?.title ?? "Sản phẩm",
    slug: e.product?.slug ?? "",
    granted_at: e.granted_at,
  }));
}

export async function adminGetUserEmail(userId: string): Promise<string | null> {
  const supabase = createStoreAdminClient();
  const { data } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  return data?.email ?? null;
}

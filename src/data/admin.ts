import "server-only";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";

export interface AdminProductRow {
  id: string;
  slug: string;
  title: string;
  type: string;
  price_vnd: number;
  original_price_vnd: number | null;
  min_plan: "free" | "pro" | null;
  tier: "free" | "pro";
  price_month: number;
  trial: boolean;
  trial_days: number;
  active: boolean;
  giaoly_pro_free: boolean;
  icon: string | null;
  published: boolean;
  featured: boolean;
  is_new: boolean;
  is_popular: boolean;
  publisher: { name: string } | null;
}

export interface AdminProductDetail {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  description_html: string | null;
  game_url_prev: string | null;
  type: string;
  category_id: string;
  publisher_id: string;
  price_vnd: number;
  original_price_vnd: number | null;
  cover_url: string | null;
  tags: string[] | null;
  min_plan: "free" | "pro" | null;
  released_at: string | null;
  featured: boolean;
  is_new: boolean;
  is_popular: boolean;
  published: boolean;
  download_path: string | null;
  game_url: string | null;
  app_url: string | null;
  giaoly_feature_key: string | null;
  license_device_limit: number;
  license_offline_days: number;
  ms_store_url: string | null;
  tier: "free" | "pro";
  price_month: number;
  trial: boolean;
  trial_days: number;
  giaoly_pro_free: boolean;
  uses_wallet: boolean;
  /** Đã có khóa bí mật server cho app ngoài (không gửi hash ra client). */
  has_app_secret: boolean;
}

export async function adminListProducts(): Promise<AdminProductRow[]> {
  const supabase = createStoreAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,slug,title,type,price_vnd,original_price_vnd,min_plan,tier,price_month,trial,trial_days,active,giaoly_pro_free,icon,published,featured,is_new,is_popular,publisher:publishers(name)"
    )
    .order("title", { ascending: true });
  if (error) throw new Error(error.message);
  return data as unknown as AdminProductRow[];
}

export async function adminGetProduct(id: string): Promise<AdminProductDetail | null> {
  const supabase = createStoreAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,slug,title,tagline,description,description_html,type,category_id,publisher_id,price_vnd,original_price_vnd,cover_url,tags,min_plan,released_at,featured,is_new,is_popular,published,download_path,game_url,game_url_prev,app_url,giaoly_feature_key,license_device_limit,license_offline_days,ms_store_url,tier,price_month,trial,trial_days,giaoly_pro_free,uses_wallet,app_secret_hash"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const { app_secret_hash, ...rest } = data as typeof data & { app_secret_hash: string | null };
  return { ...(rest as unknown as Omit<AdminProductDetail, "has_app_secret">), has_app_secret: !!app_secret_hash };
}

export async function adminListCategories(): Promise<{ id: string; name: string }[]> {
  const supabase = createStoreAdminClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id,name")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
}

export interface AdminCoupon {
  id: string;
  code: string;
  kind: "percent" | "amount";
  value: number;
  active: boolean;
  used_count: number;
  max_uses: number | null;
  expires_at: string | null;
}

export async function adminListCoupons(): Promise<AdminCoupon[]> {
  const supabase = createStoreAdminClient();
  const { data, error } = await supabase
    .from("discount_codes")
    .select("id,code,kind,value,active,used_count,max_uses,expires_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AdminCoupon[];
}

export async function adminListPublishers(): Promise<{ id: string; name: string }[]> {
  const supabase = createStoreAdminClient();
  const { data, error } = await supabase
    .from("publishers")
    .select("id,name")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

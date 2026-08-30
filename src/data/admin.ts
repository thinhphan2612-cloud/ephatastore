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
  published: boolean;
  featured: boolean;
  is_new: boolean;
  is_popular: boolean;
  category: { name: string } | null;
  publisher: { name: string } | null;
}

export interface AdminProductDetail {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
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
  giaoly_feature_key: string | null;
}

export async function adminListProducts(): Promise<AdminProductRow[]> {
  const supabase = createStoreAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,slug,title,type,price_vnd,original_price_vnd,min_plan,published,featured,is_new,is_popular,category:categories(name),publisher:publishers(name)"
    )
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data as unknown as AdminProductRow[];
}

export async function adminGetProduct(id: string): Promise<AdminProductDetail | null> {
  const supabase = createStoreAdminClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,slug,title,tagline,description,type,category_id,publisher_id,price_vnd,original_price_vnd,cover_url,tags,min_plan,released_at,featured,is_new,is_popular,published,download_path,game_url,giaoly_feature_key"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as AdminProductDetail | null;
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

export async function adminListPublishers(): Promise<{ id: string; name: string }[]> {
  const supabase = createStoreAdminClient();
  const { data, error } = await supabase
    .from("publishers")
    .select("id,name")
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
}

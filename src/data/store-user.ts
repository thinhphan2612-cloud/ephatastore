import "server-only";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import type { Product } from "@/lib/types";

/**
 * Truy cập dữ liệu gắn với user đăng nhập (đơn hàng, sở hữu).
 * Luôn nhận store_user_id đã xác thực từ getCurrentUser() ở phía gọi.
 * Dùng service_role (bypass RLS) — KHÔNG bao giờ nhận userId từ input client.
 */

const PRODUCT_SELECT =
  "id,slug,title,tagline,description,type,price_vnd,original_price_vnd,cover_url,tags,min_plan,tier,price_month,trial,trial_days,active,icon,rating,rating_count,released_at,featured,is_new,is_popular,publisher:publishers(id,slug,name,avatar_url,verified)";

interface Row {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  type: Product["type"];
  price_vnd: number;
  original_price_vnd: number | null;
  cover_url: string | null;
  tags: string[] | null;
  min_plan: "free" | "pro" | null;
  tier: "free" | "pro";
  price_month: number;
  trial: boolean;
  trial_days: number;
  active: boolean;
  icon: string | null;
  rating: number | string;
  rating_count: number;
  released_at: string;
  featured: boolean;
  is_new: boolean;
  is_popular: boolean;
  publisher: {
    id: string;
    slug: string;
    name: string;
    avatar_url: string | null;
    verified: boolean;
  } | null;
}

function mapRow(r: Row): Product {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    tagline: r.tagline,
    description: r.description,
    type: r.type,
    categoryId: "",
    categorySlugs: [],
    publisher: {
      id: r.publisher?.id ?? "",
      slug: r.publisher?.slug ?? "",
      name: r.publisher?.name ?? "Không rõ",
      avatarUrl: r.publisher?.avatar_url ?? undefined,
      verified: r.publisher?.verified ?? false,
    },
    price: r.price_vnd,
    originalPrice: r.original_price_vnd ?? undefined,
    coverUrl: r.cover_url ?? "",
    gallery: [],
    tags: r.tags ?? [],
    minPlan: r.min_plan,
    tier: r.tier ?? (r.min_plan === "pro" ? "pro" : "free"),
    priceMonth: r.price_month ?? r.price_vnd ?? 0,
    trial: r.trial ?? false,
    trialDays: r.trial_days ?? 7,
    active: r.active ?? true,
    icon: r.icon ?? undefined,
    rating: Number(r.rating),
    ratingCount: r.rating_count,
    releasedAt: r.released_at,
    featured: r.featured,
    isNew: r.is_new,
    isPopular: r.is_popular,
  };
}

/** Các sản phẩm user đã sở hữu. */
export async function getMyLibrary(userId: string): Promise<Product[]> {
  const supabase = createStoreAdminClient();
  const { data, error } = await supabase
    .from("entitlements")
    .select(`product:products(${PRODUCT_SELECT})`)
    .eq("store_user_id", userId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order("granted_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? [])
    .map((e) => (e as unknown as { product: Row | null }).product)
    .filter((p): p is Row => !!p)
    .map(mapRow);
}

export interface OrderView {
  id: string;
  status: string;
  order_code: string | null;
  subtotal_vnd: number;
  discount_code: string | null;
  discount_vnd: number;
  total_vnd: number;
  created_at: string;
  items: { title: string; slug: string; unit_price_vnd: number }[];
}

/** Đơn hàng của user (kiểm tra sở hữu qua giaoly_user_id). null nếu không thuộc user. */
export async function getOrderForUser(
  orderId: string,
  userId: string
): Promise<OrderView | null> {
  const supabase = createStoreAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      "id,status,order_code,subtotal_vnd,discount_code,discount_vnd,total_vnd,created_at,store_user_id,order_items(unit_price_vnd,product:products(title,slug))"
    )
    .eq("id", orderId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.store_user_id !== userId) return null;

  type ItemRow = {
    unit_price_vnd: number;
    product: { title: string; slug: string } | null;
  };
  return {
    id: data.id,
    status: data.status,
    order_code: data.order_code ?? null,
    subtotal_vnd: data.subtotal_vnd ?? data.total_vnd,
    discount_code: data.discount_code ?? null,
    discount_vnd: data.discount_vnd ?? 0,
    total_vnd: data.total_vnd,
    created_at: data.created_at,
    items: ((data.order_items ?? []) as unknown as ItemRow[]).map((it) => ({
      title: it.product?.title ?? "Sản phẩm",
      slug: it.product?.slug ?? "",
      unit_price_vnd: it.unit_price_vnd,
    })),
  };
}

/** true nếu user đang có Full Topping (all-access) còn hạn. */
export async function hasActiveTopping(userId: string): Promise<boolean> {
  const supabase = createStoreAdminClient();
  const { count, error } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("store_user_id", userId)
    .gt("expires_at", new Date().toISOString());
  if (error) return false;
  return (count ?? 0) > 0;
}

/** true nếu user đã sở hữu product. */
export async function isOwned(userId: string, productId: string): Promise<boolean> {
  const supabase = createStoreAdminClient();
  const { count, error } = await supabase
    .from("entitlements")
    .select("id", { count: "exact", head: true })
    .eq("store_user_id", userId)
    .eq("product_id", productId)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

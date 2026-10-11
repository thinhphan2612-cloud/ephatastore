import "server-only";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import type { Product } from "@/lib/types";

/**
 * Truy cập dữ liệu gắn với user đăng nhập (đơn hàng, sở hữu).
 * Luôn nhận store_user_id đã xác thực từ getCurrentUser() ở phía gọi.
 * Dùng service_role (bypass RLS) — KHÔNG bao giờ nhận userId từ input client.
 */

const PRODUCT_SELECT =
  "id,slug,title,tagline,description,type,price_vnd,original_price_vnd,cover_url,tags,min_plan,tier,price_month,trial,trial_days,active,giaoly_pro_free,uses_wallet,icon,app_url,rating,rating_count,released_at,featured,is_new,is_popular,publisher:publishers(id,slug,name,avatar_url,verified)";

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
  giaoly_pro_free: boolean;
  uses_wallet: boolean;
  icon: string | null;
  app_url: string | null;
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
    giaolyProFree: r.type !== "software" && (r.giaoly_pro_free ?? false),
    usesWallet: r.uses_wallet ?? false,
    icon: r.icon ?? undefined,
    appUrl: r.app_url ?? undefined,
    rating: Number(r.rating),
    ratingCount: r.rating_count,
    releasedAt: r.released_at,
    featured: r.featured,
    isNew: r.is_new,
    isPopular: r.is_popular,
  };
}

/** Các sản phẩm user đã sở hữu. */
/** Một mục trong Thư viện: sản phẩm + hạn dùng (null = vĩnh viễn) + nguồn quyền. */
export interface LibraryItem {
  product: Product;
  expiresAt: string | null;
  /** purchase | free | trial | giaoly_pro | admin … */
  source: string;
  active: boolean;
  /** Số ngày còn lại (làm tròn lên) khi có hạn; null = vĩnh viễn. */
  daysLeft: number | null;
}

/** Thư viện: quyền còn hạn + quyền đã hết hạn trong 180 ngày gần đây (để người dùng biết và gia hạn). */
export async function getMyLibrary(userId: string): Promise<LibraryItem[]> {
  const supabase = createStoreAdminClient();
  const since = new Date(Date.now() - 180 * 86400000).toISOString();
  const { data, error } = await supabase
    .from("entitlements")
    .select(`expires_at,source,product:products(${PRODUCT_SELECT})`)
    .eq("store_user_id", userId)
    .or(`expires_at.is.null,expires_at.gt.${since}`)
    .order("granted_at", { ascending: false });
  if (error) throw new Error(error.message);
  const now = Date.now();
  return (data ?? [])
    .map((e) => e as unknown as { expires_at: string | null; source: string | null; product: Row | null })
    .filter((e) => !!e.product)
    .map((e) => ({
      product: mapRow(e.product!),
      expiresAt: e.expires_at,
      source: e.source ?? "purchase",
      active: !e.expires_at || new Date(e.expires_at).getTime() > now,
      daysLeft: e.expires_at ? Math.ceil((new Date(e.expires_at).getTime() - now) / 86400000) : null,
    }));
}

/** Quyền của user với một sản phẩm (kể cả đã hết hạn) — null nếu chưa từng có. */
export async function getEntitlement(
  userId: string,
  productId: string
): Promise<{ expiresAt: string | null; source: string; active: boolean } | null> {
  const { data } = await createStoreAdminClient()
    .from("entitlements")
    .select("expires_at,source")
    .eq("store_user_id", userId)
    .eq("product_id", productId)
    .maybeSingle();
  if (!data) return null;
  return {
    expiresAt: data.expires_at,
    source: data.source ?? "purchase",
    active: !data.expires_at || new Date(data.expires_at).getTime() > Date.now(),
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

/** Hạn Full Topping xa nhất còn hiệu lực (ISO) hoặc null. */
export async function getToppingUntil(userId: string): Promise<string | null> {
  const { data } = await createStoreAdminClient()
    .from("subscriptions")
    .select("expires_at")
    .eq("store_user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.expires_at ?? null;
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

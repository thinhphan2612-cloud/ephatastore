import { cache } from "react";
import type { Product } from "@/lib/types";
import { createStoreClient } from "@/lib/supabase/store";
import { parseGallery } from "@/lib/gallery";

/**
 * Tầng dữ liệu sản phẩm — đọc từ Supabase store.
 * Dataset nhỏ nên tải hết 1 lần/request (cache) rồi lọc trong JS.
 */

// shape hàng trả về từ Supabase (snake_case + embed)
interface ProductRow {
  id: string;
  slug: string;
  title: string;
  tagline: string;
  description: string;
  description_html: string | null;
  type: Product["type"];
  price_vnd: number;
  original_price_vnd: number | null;
  cover_url: string | null;
  gallery: unknown;
  logo_url: string | null;
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
  game_url: string | null;
  giaoly_feature_key: string | null;
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
  categories: { category: { slug: string } | null }[] | null;
}

const SELECT =
  "id,slug,title,tagline,description,description_html,type,price_vnd,original_price_vnd,cover_url,gallery,logo_url,tags,min_plan,tier,price_month,trial,trial_days,active,giaoly_pro_free,uses_wallet,icon,app_url,game_url,giaoly_feature_key,rating,rating_count,released_at,featured,is_new,is_popular,publisher:publishers(id,slug,name,avatar_url,verified),categories:product_categories(category:categories(slug))";

function mapRow(r: ProductRow): Product {
  const categorySlugs = (r.categories ?? [])
    .map((x) => x.category?.slug)
    .filter((s): s is string => !!s);
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    tagline: r.tagline,
    description: r.description,
    descriptionHtml: r.description_html,
    type: r.type,
    categoryId: categorySlugs[0] ?? "",
    categorySlugs,
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
    gallery: parseGallery(r.gallery),
    logoUrl: r.logo_url ?? undefined,
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
    gameUrl: r.game_url ?? undefined,
    giaolyFeatureKey: r.giaoly_feature_key ?? undefined,
    rating: Number(r.rating),
    ratingCount: r.rating_count,
    releasedAt: r.released_at,
    featured: r.featured,
    isNew: r.is_new,
    isPopular: r.is_popular,
  };
}

/** Tải toàn bộ sản phẩm published (dedupe trong 1 request). */
const loadProducts = cache(async (): Promise<Product[]> => {
  const supabase = createStoreClient();
  const { data, error } = await supabase
    .from("products")
    .select(SELECT)
    .eq("published", true)
    .order("released_at", { ascending: false });

  if (error) throw new Error(`Lỗi tải sản phẩm: ${error.message}`);
  return (data as unknown as ProductRow[]).map(mapRow).filter((p) => p.active);
});

/** true nếu product thuộc danh mục slug (chính hoặc phụ). */
function inCategory(p: Product, slug: string): boolean {
  return p.categoryId === slug || p.categorySlugs.includes(slug);
}

export async function getAllProducts(): Promise<Product[]> {
  return loadProducts();
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const all = await loadProducts();
  return all.find((p) => p.slug === slug);
}

export async function getFeatured(): Promise<Product[]> {
  const all = await loadProducts();
  return all.filter((p) => p.featured);
}

export async function getNewReleases(): Promise<Product[]> {
  const all = await loadProducts();
  return all
    .filter((p) => p.isNew)
    .sort((a, b) => +new Date(b.releasedAt) - +new Date(a.releasedAt));
}

export async function getPopular(): Promise<Product[]> {
  const all = await loadProducts();
  return all
    .filter((p) => p.isPopular)
    .sort((a, b) => b.ratingCount - a.ratingCount);
}

export async function getRelated(product: Product, limit = 4): Promise<Product[]> {
  const all = await loadProducts();
  return all
    .filter((p) => p.id !== product.id && inCategory(p, product.categoryId))
    .slice(0, limit);
}

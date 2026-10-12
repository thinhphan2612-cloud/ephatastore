import { fold } from "@/lib/fold";
import { kindsFor } from "@/lib/purchase-kinds";
import type { Product } from "@/lib/types";

/** Bộ lọc cửa hàng (trang chủ + /browse) — nằm trên URL để gửi link / bấm Back vẫn đúng. */
export type SortKey = "featured" | "new" | "price-asc" | "price-desc";
export type PriceKey = "" | "free" | "paid";
export interface CatalogQuery {
  q: string;
  cat: string;
  price: PriceKey;
  type: string;
  sort: SortKey;
}

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Nổi bật" },
  { key: "new", label: "Mới nhất" },
  { key: "price-asc", label: "Giá thấp → cao" },
  { key: "price-desc", label: "Giá cao → thấp" },
];

type Params = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function readQuery(sp: Params): CatalogQuery {
  const price = one(sp.price);
  const sort = one(sp.sort);
  return {
    q: one(sp.q).trim().slice(0, 80),
    cat: one(sp.cat),
    price: price === "free" || price === "paid" ? price : "",
    type: one(sp.type),
    sort: SORTS.some((s) => s.key === sort) ? (sort as SortKey) : "featured",
  };
}

/** Lọc theo mọi điều kiện, trừ nhóm `skip` (để đếm số cho từng lựa chọn của nhóm đó). */
export function filterProducts(list: Product[], q: CatalogQuery, skip?: "cat" | "price" | "type"): Product[] {
  const k = fold(q.q);
  return list.filter((p) => {
    if (k && !fold(p.title).includes(k) && !fold(p.tagline).includes(k) && !p.tags.some((t) => fold(t).includes(k))) return false;
    if (skip !== "cat" && q.cat && p.categoryId !== q.cat && !p.categorySlugs.includes(q.cat)) return false;
    if (skip !== "price" && q.price === "free" && p.tier !== "free") return false;
    if (skip !== "price" && q.price === "paid" && p.tier === "free") return false;
    if (skip !== "type" && q.type && p.type !== q.type) return false;
    return true;
  });
}

/** Giá khách thấy (VND): miễn phí = 0, thuê bao = gói năm, còn lại = giá 1 lần. */
export function displayPrice(p: Product): number {
  if (p.tier === "free") return 0;
  return kindsFor(p.type)[0] === "annual" ? p.priceMonth * 12 : p.priceMonth;
}

export function sortProducts(list: Product[], sort: SortKey): Product[] {
  const rank = (p: Product) => (p.featured ? 0 : p.isNew ? 1 : 2);
  const time = (p: Product) => +new Date(p.releasedAt || 0);
  const out = [...list];
  if (sort === "featured") out.sort((a, b) => rank(a) - rank(b) || time(b) - time(a));
  else if (sort === "new") out.sort((a, b) => time(b) - time(a));
  else if (sort === "price-asc") out.sort((a, b) => displayPrice(a) - displayPrice(b));
  else out.sort((a, b) => displayPrice(b) - displayPrice(a));
  return out;
}

/** URL của bộ lọc sau khi đổi `patch` (bỏ giá trị mặc định cho gọn). */
export function catalogHref(base: string, q: CatalogQuery, patch: Partial<CatalogQuery> = {}): string {
  const n = { ...q, ...patch };
  const params = new URLSearchParams();
  if (n.q) params.set("q", n.q);
  if (n.cat) params.set("cat", n.cat);
  if (n.price) params.set("price", n.price);
  if (n.type) params.set("type", n.type);
  if (n.sort !== "featured") params.set("sort", n.sort);
  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

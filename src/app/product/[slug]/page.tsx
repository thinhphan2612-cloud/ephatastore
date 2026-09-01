import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelated } from "@/data/products";
import { CATEGORY_BY_ID } from "@/data/categories";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentUserPlan } from "@/lib/plan";
import { getGiaolyContext } from "@/lib/giaoly-context";
import { isOwned, hasActiveTopping } from "@/data/store-user";
import { getSettings } from "@/data/settings";
import { claimProduct, startTrial, claimFreedom } from "@/lib/actions/store";
import { formatPrice } from "@/lib/format";
import { TYPE_LABEL } from "@/lib/labels";
import { OwnedActions } from "@/components/owned-actions";
import { AddToGiaolyButton } from "@/components/add-to-giaoly-button";
import { ProductRow } from "@/components/product-row";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return { title: product?.title ?? "Sản phẩm", description: product?.tagline };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const category = CATEGORY_BY_ID.get(product.categoryId);
  const related = await getRelated(product);
  const isGame = product.type === "game";
  const isProTier = product.tier === "pro";

  const user = await getCurrentUser();
  const plan = user ? await getCurrentUserPlan() : "free";
  const linked = user ? !!(await getGiaolyContext()) : false;
  const ownedEnt = user ? await isOwned(user.id, product.id) : false;
  const topping = user && !isGame && isProTier ? await hasActiveTopping(user.id) : false;

  const annual = product.priceMonth * 12;
  const { freedomDays } = await getSettings();
  const giaolyUrl = process.env.NEXT_PUBLIC_APP_GIAOLY_URL ?? "#";
  const hasPro = plan === "pro";

  return (
    <div className="mx-auto w-[min(1180px,calc(100%-40px))] py-10">
      <nav className="mb-5 text-sm text-text-faint">
        <Link href="/" className="hover:text-text">
          Cửa hàng
        </Link>
        {category && (
          <>
            <span className="mx-1.5">/</span>
            <Link href={`/category/${category.slug}`} className="hover:text-text">
              {category.name}
            </Link>
          </>
        )}
        <span className="mx-1.5">/</span>
        <span className="text-text-muted">{product.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-3xl border border-border">
            <div
              className="media-placeholder absolute inset-0"
              style={product.coverUrl ? { background: `center/cover url(${product.coverUrl})` } : undefined}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/70" />
            <span className="relative z-10 text-[64px]">{product.icon ?? "✦"}</span>
          </div>
          <div>
            <h2 className="font-display mb-2 text-2xl font-bold">Giới thiệu</h2>
            <p className="leading-relaxed text-text-muted">{product.description}</p>
          </div>
          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((t) => (
                <span key={t} className="rounded-full border border-border bg-white/[0.03] px-3 py-1 text-sm text-text-muted">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-border bg-surface p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div className="grid h-14 w-14 place-items-center rounded-2xl border border-accent/30 bg-accent/10 text-[25px] text-accent">
                {product.icon ?? "✦"}
              </div>
              <span
                className={`rounded-full border px-2.5 py-1.5 text-[9px] font-black tracking-[0.14em] ${
                  isProTier ? "border-accent text-accent" : "border-success text-success"
                }`}
              >
                {isGame ? "GAME" : isProTier ? "PRO" : "FREE"}
              </span>
            </div>
            <div className="mb-1 text-xs uppercase tracking-[0.13em] text-text-faint">
              {TYPE_LABEL[product.type]}
            </div>
            <h1 className="font-display text-[26px] font-bold">{product.title}</h1>
            <p className="mt-1 text-text-muted">{product.tagline}</p>

            {isGame ? (
              /* ===== GAME: free với Pro Giáo Lý Số ===== */
              <>
                <div className="mt-5 rounded-2xl border border-border bg-white/[0.03] p-4 text-sm">
                  <div className="font-semibold text-text">Game trên Ephata Store</div>
                  <p className="mt-1 text-text-muted">
                    {hasPro
                      ? "Bạn có gói Pro Giáo Lý Số — chơi miễn phí và thêm được vào Giáo Lý Số."
                      : "Miễn phí với gói Pro Giáo Lý Số (admin hoặc GLV)."}
                  </p>
                </div>
                <div className="mt-5 space-y-2">
                  {hasPro ? (
                    <>
                      <OwnedActions product={product} className="w-full" />
                      <AddToGiaolyButton productId={product.id} />
                    </>
                  ) : (
                    <GiaolyGate user={!!user} linked={linked} giaolyUrl={giaolyUrl} slug={product.slug} />
                  )}
                </div>
              </>
            ) : !isProTier ? (
              /* ===== SẢN PHẨM FREE ===== */
              <>
                <div className="mt-5 rounded-2xl border border-border bg-white/[0.03] p-4 text-sm">
                  <b className="text-[24px]">
                    0đ <small className="text-xs font-semibold text-text-muted">/ miễn phí</small>
                  </b>
                </div>
                <div className="mt-5 space-y-2">
                  {ownedEnt ? (
                    <OwnedActions product={product} className="w-full" />
                  ) : (
                    <form action={claimProduct}>
                      <input type="hidden" name="product_id" value={product.id} />
                      <input type="hidden" name="slug" value={product.slug} />
                      <button type="submit" className="w-full rounded-xl bg-accent px-4 py-3 font-extrabold text-accent-contrast hover:bg-accent-hover">
                        Nhận miễn phí →
                      </button>
                    </form>
                  )}
                </div>
              </>
            ) : (
              /* ===== SẢN PHẨM PRO (mua trên store) ===== */
              <>
                <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-white/[0.03] p-4">
                  <div>
                    <span className="mb-1.5 block text-[11px] text-text-faint">Giá sử dụng</span>
                    <b className="text-[27px]">
                      {formatPrice(product.priceMonth)}
                      <small className="text-xs font-semibold text-text-muted">/tháng</small>
                    </b>
                  </div>
                  <div className="border-l border-border pl-4 text-xs leading-5 text-text-muted">
                    Thanh toán theo năm ·{" "}
                    <strong className="text-text">{formatPrice(annual)}/năm</strong>
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  {ownedEnt || topping ? (
                    <>
                      <OwnedActions product={product} className="w-full" />
                      <Link href="/library" className="block text-center text-xs text-text-faint hover:text-text">
                        Mở Thư viện
                      </Link>
                    </>
                  ) : (
                    <>
                      <form action={claimProduct}>
                        <input type="hidden" name="product_id" value={product.id} />
                        <input type="hidden" name="slug" value={product.slug} />
                        <button type="submit" className="w-full rounded-xl bg-accent px-4 py-3 font-extrabold text-accent-contrast hover:bg-accent-hover">
                          Mua gói năm →
                        </button>
                      </form>
                      <form action={claimFreedom}>
                        <input type="hidden" name="product_id" value={product.id} />
                        <input type="hidden" name="slug" value={product.slug} />
                        <button type="submit" className="w-full rounded-xl border border-border-strong bg-white/5 px-4 py-3 text-sm font-bold text-text hover:border-accent/50">
                          Mua lẻ {freedomDays} ngày · {formatPrice(product.priceMonth)}
                        </button>
                      </form>
                      {product.trial && (
                        <form action={startTrial}>
                          <input type="hidden" name="product_id" value={product.id} />
                          <input type="hidden" name="slug" value={product.slug} />
                          <button type="submit" className="w-full rounded-xl border border-border px-4 py-3 text-sm font-bold text-text-muted hover:border-accent/50 hover:text-text">
                            Dùng thử {product.trialDays} ngày miễn phí
                          </button>
                        </form>
                      )}
                      <Link href="/topping" className="block pt-1 text-center text-xs text-accent-hover hover:underline">
                        hoặc mở khoá tất cả PRO với Full Topping →
                      </Link>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <div className="mt-12">
          <ProductRow title="Sản phẩm liên quan" products={related} />
        </div>
      )}
    </div>
  );
}

function GiaolyGate({
  user,
  linked,
  giaolyUrl,
  slug,
}: {
  user: boolean;
  linked: boolean;
  giaolyUrl: string;
  slug: string;
}) {
  if (!user) {
    return (
      <Link
        href={`/login?next=/product/${slug}`}
        className="block w-full rounded-xl bg-accent px-4 py-3 text-center font-extrabold text-accent-contrast hover:bg-accent-hover"
      >
        Đăng nhập để chơi →
      </Link>
    );
  }
  if (!linked) {
    return (
      <>
        <Link href="/account" className="block w-full rounded-xl bg-accent px-4 py-3 text-center font-extrabold text-accent-contrast hover:bg-accent-hover">
          Liên kết Giáo Lý Số →
        </Link>
        <p className="text-center text-xs text-text-faint">Cần liên kết Giáo Lý Số (có Pro) để chơi.</p>
      </>
    );
  }
  return (
    <>
      <a href={giaolyUrl} className="block w-full rounded-xl bg-accent px-4 py-3 text-center font-extrabold text-accent-contrast hover:bg-accent-hover">
        Nâng cấp gói Pro Giáo Lý Số →
      </a>
      <p className="text-center text-xs text-text-faint">Tài khoản của bạn chưa có Pro Giáo Lý Số.</p>
    </>
  );
}

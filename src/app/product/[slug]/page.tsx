import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelated } from "@/data/products";
import { CATEGORY_BY_ID } from "@/data/categories";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentUserPlan } from "@/lib/plan";
import { isOwned, hasActiveTopping } from "@/data/store-user";
import { getSettings } from "@/data/settings";
import { claimProduct, startTrial } from "@/lib/actions/store";
import { vndToPoints } from "@/lib/points";
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
  const isHostedTool = product.type === "tool" && !!product.gameUrl;
  const isProTier = product.tier === "pro";

  const user = await getCurrentUser();
  const plan = user ? await getCurrentUserPlan() : "free";
  const ownedEnt = user ? await isOwned(user.id, product.id) : false;
  const topping = user && !isGame && isProTier ? await hasActiveTopping(user.id) : false;

  const annual = product.priceMonth * 12;
  const annualPoints = vndToPoints(annual);
  const freedomPoints = vndToPoints(product.priceMonth);
  const gamePoints = vndToPoints(product.priceMonth);
  const perpetualPoints = vndToPoints(product.priceMonth);
  const { freedomDays } = await getSettings();
  const hasPro = plan === "pro";
  const isFreeGame = isGame && !isProTier && product.priceMonth <= 0;
  const isDownloadable = product.type === "asset" || product.type === "image";

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
                {isHostedTool ? "CÔNG CỤ" : isGame ? "GAME" : isProTier ? "PRO" : "FREE"}
              </span>
            </div>
            <div className="mb-1 text-xs uppercase tracking-[0.13em] text-text-faint">
              {TYPE_LABEL[product.type]}
            </div>
            <h1 className="font-display text-[26px] font-bold">{product.title}</h1>
            <p className="mt-1 text-text-muted">{product.tagline}</p>

            {isHostedTool ? (
              /* ===== CÔNG CỤ WEB host nội bộ: mở tự do, AI trừ point ===== */
              <>
                <div className="mt-5 rounded-2xl border border-border bg-white/[0.03] p-4 text-sm">
                  <div className="font-semibold text-text">Công cụ web trên Ephata Store</div>
                  <p className="mt-1 text-text-muted">
                    Mở và dùng trực tiếp trong store. Tác vụ AI sẽ trừ point trong Ví của bạn.
                  </p>
                </div>
                <div className="mt-5 space-y-2">
                  {user ? (
                    <Link
                      href={`/play/${product.slug}`}
                      className="block w-full rounded-xl bg-accent px-4 py-3 text-center font-extrabold text-accent-contrast hover:bg-accent-hover"
                    >
                      Mở công cụ →
                    </Link>
                  ) : (
                    <Link
                      href={`/login?next=/play/${product.slug}`}
                      className="block w-full rounded-xl bg-accent px-4 py-3 text-center font-extrabold text-accent-contrast hover:bg-accent-hover"
                    >
                      Đăng nhập để dùng →
                    </Link>
                  )}
                  <Link href="/wallet" className="block text-center text-xs text-text-faint hover:text-text">
                    Nạp point cho tác vụ AI →
                  </Link>
                </div>
              </>
            ) : isGame ? (
              /* ===== GAME: Pro Giáo Lý Số free, còn lại mua bằng point ===== */
              <>
                <div className="mt-5 rounded-2xl border border-border bg-white/[0.03] p-4 text-sm">
                  <div className="font-semibold text-text">Game trên Ephata Store</div>
                  <p className="mt-1 text-text-muted">
                    {hasPro
                      ? "Bạn có gói Pro Giáo Lý Số — chơi miễn phí và thêm được vào Giáo Lý Số."
                      : isFreeGame
                        ? "Game miễn phí — chơi ngay."
                        : "Có Pro Giáo Lý Số thì chơi miễn phí, hoặc mua bằng point."}
                  </p>
                </div>
                <div className="mt-5 space-y-2">
                  {hasPro || ownedEnt || isFreeGame ? (
                    <>
                      <OwnedActions product={product} className="w-full" />
                      {hasPro && <AddToGiaolyButton productId={product.id} />}
                    </>
                  ) : (
                    <Link
                      href={`/buy/${product.id}?kind=perpetual`}
                      className="block w-full rounded-xl bg-accent px-4 py-3 text-center font-extrabold text-accent-contrast hover:bg-accent-hover"
                    >
                      Mua bằng point · {gamePoints.toLocaleString("vi-VN")} point →
                    </Link>
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
            ) : isDownloadable ? (
              /* ===== FILE TẢI VỀ: mua vĩnh viễn ===== */
              <>
                <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-white/[0.03] p-4">
                  <div>
                    <span className="mb-1.5 block text-[11px] text-text-faint">Mua vĩnh viễn</span>
                    <b className="text-[27px]">
                      {perpetualPoints.toLocaleString("vi-VN")}
                      <small className="ml-1 text-xs font-semibold text-text-muted">point</small>
                    </b>
                  </div>
                  <div className="border-l border-border pl-4 text-xs leading-5 text-text-muted">
                    {hasPro ? (
                      <strong className="text-accent">Miễn phí với Pro Giáo Lý Số</strong>
                    ) : (
                      <>≈ {formatPrice(product.priceMonth)} · tải về dùng mãi</>
                    )}
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  {hasPro || ownedEnt ? (
                    <OwnedActions product={product} className="w-full" />
                  ) : (
                    <Link
                      href={`/buy/${product.id}?kind=perpetual`}
                      className="block w-full rounded-xl bg-accent px-4 py-3 text-center font-extrabold text-accent-contrast hover:bg-accent-hover"
                    >
                      Mua · {perpetualPoints.toLocaleString("vi-VN")} point (vĩnh viễn) →
                    </Link>
                  )}
                </div>
              </>
            ) : (
              /* ===== SẢN PHẨM PRO (tool/feature — thuê bao) ===== */
              <>
                <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-white/[0.03] p-4">
                  <div>
                    <span className="mb-1.5 block text-[11px] text-text-faint">Gói năm</span>
                    <b className="text-[27px]">
                      {annualPoints.toLocaleString("vi-VN")}
                      <small className="ml-1 text-xs font-semibold text-text-muted">point</small>
                    </b>
                  </div>
                  <div className="border-l border-border pl-4 text-xs leading-5 text-text-muted">
                    {hasPro ? (
                      <strong className="text-accent">Miễn phí với Pro Giáo Lý Số</strong>
                    ) : (
                      <>≈ {formatPrice(annual)} · 100đ = 1 point</>
                    )}
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  {hasPro || ownedEnt || topping ? (
                    <>
                      <OwnedActions product={product} className="w-full" />
                      <Link href="/library" className="block text-center text-xs text-text-faint hover:text-text">
                        Mở Thư viện
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/buy/${product.id}?kind=annual`}
                        className="block w-full rounded-xl bg-accent px-4 py-3 text-center font-extrabold text-accent-contrast hover:bg-accent-hover"
                      >
                        Mua gói năm · {annualPoints.toLocaleString("vi-VN")} point →
                      </Link>
                      <Link
                        href={`/buy/${product.id}?kind=freedom`}
                        className="block w-full rounded-xl border border-border-strong bg-white/5 px-4 py-3 text-center text-sm font-bold text-text hover:border-accent/50"
                      >
                        Mua lẻ {freedomDays} ngày · {freedomPoints.toLocaleString("vi-VN")} point
                      </Link>
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

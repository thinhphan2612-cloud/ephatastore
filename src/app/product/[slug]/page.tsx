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
  const isPro = product.tier === "pro";

  const user = await getCurrentUser();
  const settings = await getSettings();
  const mode = settings.accessMode;
  const annual = product.priceMonth * 12;
  const giaolyUrl = process.env.NEXT_PUBLIC_APP_GIAOLY_URL ?? "#";

  // Xác định quyền dùng theo chế độ.
  let owned = false;
  let plan: "free" | "pro" = "free";
  let linked = false;
  if (mode === "giaoly_pro") {
    if (user) {
      plan = await getCurrentUserPlan();
      linked = !!(await getGiaolyContext());
    }
    owned = plan === "pro";
  } else {
    const topping = user && isPro ? await hasActiveTopping(user.id) : false;
    owned = (user ? await isOwned(user.id, product.id) : false) || topping;
  }

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
                <span
                  key={t}
                  className="rounded-full border border-border bg-white/[0.03] px-3 py-1 text-sm text-text-muted"
                >
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
                  isPro ? "border-accent text-accent" : "border-success text-success"
                }`}
              >
                {isPro ? "PRO" : "FREE"}
              </span>
            </div>

            <div className="mb-1 text-xs uppercase tracking-[0.13em] text-text-faint">
              {TYPE_LABEL[product.type]}
            </div>
            <h1 className="font-display text-[26px] font-bold">{product.title}</h1>
            <p className="mt-1 text-text-muted">{product.tagline}</p>

            {mode === "giaoly_pro" ? (
              /* ===== GIAI ĐOẠN ĐẦU: gate bằng gói Pro giaoly ===== */
              <>
                <div className="mt-5 rounded-2xl border border-border bg-white/[0.03] p-4 text-sm">
                  <div className="font-semibold text-text">Truy cập Ephata Store</div>
                  <p className="mt-1 text-text-muted">
                    {owned
                      ? "Giáo xứ của bạn có gói Pro Giáo Lý Số — dùng miễn phí toàn bộ Store."
                      : "Miễn phí với gói Pro của Giáo Lý Số (giaoly.com.vn). Cần gói Pro để dùng."}
                  </p>
                </div>

                <div className="mt-5 space-y-2">
                  {owned ? (
                    <>
                      <OwnedActions product={product} className="w-full" />
                      <Link
                        href="/library"
                        className="block text-center text-xs text-text-faint hover:text-text"
                      >
                        Mở Thư viện
                      </Link>
                    </>
                  ) : !user ? (
                    <Link
                      href={`/login?next=/product/${product.slug}`}
                      className="block w-full rounded-xl bg-accent px-4 py-3 text-center font-extrabold text-accent-contrast hover:bg-accent-hover"
                    >
                      Đăng nhập để dùng →
                    </Link>
                  ) : !linked ? (
                    <>
                      <Link
                        href="/account"
                        className="block w-full rounded-xl bg-accent px-4 py-3 text-center font-extrabold text-accent-contrast hover:bg-accent-hover"
                      >
                        Liên kết Giáo Lý Số →
                      </Link>
                      <p className="text-center text-xs text-text-faint">
                        Cần liên kết Giáo Lý Số (có gói Pro) để dùng Store.
                      </p>
                    </>
                  ) : (
                    <>
                      <a
                        href={giaolyUrl}
                        className="block w-full rounded-xl bg-accent px-4 py-3 text-center font-extrabold text-accent-contrast hover:bg-accent-hover"
                      >
                        Nâng cấp gói Pro Giáo Lý Số →
                      </a>
                      <p className="text-center text-xs text-text-faint">
                        Giáo xứ của bạn chưa có gói Pro Giáo Lý Số.
                      </p>
                    </>
                  )}
                </div>
              </>
            ) : (
              /* ===== GIAI ĐOẠN SAU: bán trên store ===== */
              <>
                <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-white/[0.03] p-4">
                  <div>
                    <span className="mb-1.5 block text-[11px] text-text-faint">Giá sử dụng</span>
                    {isPro ? (
                      <b className="text-[27px]">
                        {formatPrice(product.priceMonth)}
                        <small className="text-xs font-semibold text-text-muted">/tháng</small>
                      </b>
                    ) : (
                      <b className="text-[27px]">
                        0đ <small className="text-xs font-semibold text-text-muted">/ miễn phí</small>
                      </b>
                    )}
                  </div>
                  <div className="border-l border-border pl-4 text-xs leading-5 text-text-muted">
                    {isPro ? (
                      <>
                        Thanh toán theo năm ·{" "}
                        <strong className="text-text">{formatPrice(annual)}/năm</strong>
                      </>
                    ) : (
                      "Không yêu cầu thanh toán."
                    )}
                  </div>
                </div>

                <div className="mt-5 space-y-2">
                  {owned ? (
                    <>
                      <OwnedActions product={product} className="w-full" />
                      <Link
                        href="/library"
                        className="block text-center text-xs text-text-faint hover:text-text"
                      >
                        Mở Thư viện
                      </Link>
                    </>
                  ) : (
                    <>
                      <form action={claimProduct}>
                        <input type="hidden" name="product_id" value={product.id} />
                        <input type="hidden" name="slug" value={product.slug} />
                        <button
                          type="submit"
                          className="w-full rounded-xl bg-accent px-4 py-3 font-extrabold text-accent-contrast hover:bg-accent-hover"
                        >
                          {isPro ? "Mua gói năm →" : "Nhận miễn phí →"}
                        </button>
                      </form>
                      {isPro && (
                        <form action={claimFreedom}>
                          <input type="hidden" name="product_id" value={product.id} />
                          <input type="hidden" name="slug" value={product.slug} />
                          <button
                            type="submit"
                            className="w-full rounded-xl border border-border-strong bg-white/5 px-4 py-3 text-sm font-bold text-text hover:border-accent/50"
                          >
                            Mua lẻ {settings.freedomDays} ngày · {formatPrice(product.priceMonth)}
                          </button>
                        </form>
                      )}
                      {isPro && product.trial && (
                        <form action={startTrial}>
                          <input type="hidden" name="product_id" value={product.id} />
                          <input type="hidden" name="slug" value={product.slug} />
                          <button
                            type="submit"
                            className="w-full rounded-xl border border-border px-4 py-3 text-sm font-bold text-text-muted hover:border-accent/50 hover:text-text"
                          >
                            Dùng thử {product.trialDays} ngày miễn phí
                          </button>
                        </form>
                      )}
                      {isPro && (
                        <Link
                          href="/topping"
                          className="block pt-1 text-center text-xs text-accent-hover hover:underline"
                        >
                          hoặc mở khoá tất cả PRO với Full Topping →
                        </Link>
                      )}
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

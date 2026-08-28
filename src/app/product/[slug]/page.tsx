import Link from "next/link";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelated } from "@/data/products";
import { CATEGORY_BY_ID } from "@/data/categories";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentUserPlan } from "@/lib/plan";
import { isOwned } from "@/data/store-user";
import { claimProduct } from "@/lib/actions/store";
import { discountPercent } from "@/lib/types";
import { formatPrice, formatDate } from "@/lib/format";
import { TYPE_ICON, TYPE_LABEL } from "@/lib/labels";
import { gradientFor } from "@/lib/placeholder";
import { ProductRow } from "@/components/product-row";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return {
    title: product?.title ?? "Sản phẩm",
    description: product?.tagline,
  };
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
  const discount = discountPercent(product);
  const related = await getRelated(product);

  const user = await getCurrentUser();
  const owned = user ? await isOwned(user.id, product.id) : false;
  const plan = user ? await getCurrentUserPlan() : "free";
  const needsPro = product.minPlan === "pro";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* breadcrumb */}
      <nav className="mb-4 text-sm text-text-faint">
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

      <div className="grid gap-8 lg:grid-cols-3">
        {/* cột trái: media + mô tả */}
        <div className="space-y-6 lg:col-span-2">
          <div
            className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-border"
            style={{ background: product.coverUrl ? undefined : gradientFor(product.id) }}
          >
            {product.coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.coverUrl}
                alt={product.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-8xl opacity-80">{TYPE_ICON[product.type]}</span>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="text-lg font-bold">Giới thiệu</h2>
            <p className="leading-relaxed text-text-muted">{product.description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {product.tags.map((t) => (
              <Link
                key={t}
                href={`/browse?q=${encodeURIComponent(t)}`}
                className="rounded-full border border-border bg-surface px-3 py-1 text-sm text-text-muted hover:text-text"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>

        {/* cột phải: hộp mua */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="mb-1 flex items-center gap-2 text-sm text-text-faint">
              <span>{TYPE_LABEL[product.type]}</span>
              <span aria-hidden>·</span>
              <span className="text-accent">★ {product.rating.toFixed(1)}</span>
              <span className="text-text-faint">({product.ratingCount})</span>
            </div>

            <h1 className="text-2xl font-bold">{product.title}</h1>
            <p className="mt-1 text-text-muted">{product.tagline}</p>

            <div className="mt-3 text-sm text-text-muted">
              Phát hành bởi{" "}
              <span className="font-medium text-text">
                {product.publisher.name}
                {product.publisher.verified && (
                  <span className="ml-1 text-brand" title="Đã xác minh">
                    ✓
                  </span>
                )}
              </span>
            </div>

            {needsPro &&
              (plan === "pro" ? (
                <div className="mt-4 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
                  Giáo xứ của bạn có gói <strong>Pro</strong> — dùng được ngay.
                </div>
              ) : (
                <div className="mt-4 rounded-md border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-accent">
                  Cần gói <strong>Pro</strong> để sử dụng.
                  {user && " Giáo xứ của bạn đang ở gói Khởi động."}
                  <a
                    href={process.env.NEXT_PUBLIC_APP_GIAOLY_URL ?? "#"}
                    className="ml-1 font-medium underline hover:text-accent-hover"
                  >
                    Nâng cấp Pro →
                  </a>
                </div>
              ))}

            <div className="mt-5 flex items-center gap-3">
              {discount > 0 && (
                <span className="rounded bg-discount px-2 py-1 text-sm font-bold text-white">
                  -{discount}%
                </span>
              )}
              <div>
                {discount > 0 && (
                  <span className="mr-2 text-sm text-text-faint line-through">
                    {formatPrice(product.originalPrice!)}
                  </span>
                )}
                <span className="text-2xl font-bold">{formatPrice(product.price)}</span>
              </div>
            </div>

            {owned ? (
              <Link
                href="/library"
                className="mt-4 block w-full rounded-md border border-success/50 bg-success/10 px-4 py-2.5 text-center font-semibold text-success"
              >
                ✓ Đã sở hữu — mở Thư viện
              </Link>
            ) : (
              <form action={claimProduct} className="mt-4">
                <input type="hidden" name="product_id" value={product.id} />
                <input type="hidden" name="slug" value={product.slug} />
                <button
                  type="submit"
                  className="w-full rounded-md bg-accent px-4 py-2.5 font-semibold text-accent-contrast hover:bg-accent-hover"
                >
                  {product.price > 0 ? "Mua ngay" : "Nhận miễn phí"}
                </button>
              </form>
            )}
            {!user && (
              <p className="mt-2 text-center text-xs text-text-faint">
                Cần đăng nhập để mua / nhận sản phẩm.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-surface p-5 text-sm">
            <dl className="space-y-2">
              <Row label="Loại" value={TYPE_LABEL[product.type]} />
              {category && <Row label="Danh mục" value={category.name} />}
              <Row label="Nhà phát hành" value={product.publisher.name} />
              <Row label="Phát hành" value={formatDate(product.releasedAt)} />
              <Row label="Gói yêu cầu" value={product.minPlan === "pro" ? "Pro" : "Miễn phí"} />
            </dl>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-faint">{label}</dt>
      <dd className="text-text">{value}</dd>
    </div>
  );
}

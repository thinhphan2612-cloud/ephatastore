import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getMyLibrary, getToppingUntil, type LibraryItem } from "@/data/store-user";
import { formatDate } from "@/lib/format";
import { ProductCard } from "@/components/product-card";
import { OwnedActions } from "@/components/owned-actions";
import { getMyLicenseKeys } from "@/data/software";

export const metadata = { title: "Thư viện" };

export default async function LibraryPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Thư viện của tôi</h1>
        <p className="mt-3 text-text-muted">
          Đăng nhập để xem các sản phẩm bạn đã sở hữu.
        </p>
        <Link
          href="/login?next=/library"
          className="mt-6 inline-block rounded-md bg-accent px-5 py-2 font-semibold text-accent-contrast hover:bg-accent-hover"
        >
          Đăng nhập
        </Link>
      </div>
    );
  }

  const [items, toppingUntil, licenseKeys] = await Promise.all([
    getMyLibrary(user.id),
    getToppingUntil(user.id),
    getMyLicenseKeys(user.id),
  ]);
  const active = items.filter((i) => i.active);
  const expired = items.filter((i) => !i.active);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">
        Thư viện của tôi <span className="text-text-faint">({active.length})</span>
      </h1>

      {toppingUntil && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          <span className="font-semibold text-accent">
            ✦ Full Topping đến {formatDate(toppingUntil)} — mọi sản phẩm PRO (trừ tính năng Giáo Lý Số, phần mềm bán key) dùng được ngay
            trên trang sản phẩm
          </span>
          <span className="flex shrink-0 gap-3">
            <Link href="/buy/topping" className="text-brand hover:text-brand-hover">
              Gia hạn
            </Link>
            <Link href="/browse" className="text-brand hover:text-brand-hover">
              Khám phá →
            </Link>
          </span>
        </div>
      )}

      {active.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface p-10 text-center">
          <p className="text-text-muted">Bạn chưa sở hữu sản phẩm nào.</p>
          <Link
            href="/browse"
            className="mt-4 inline-block rounded-md bg-accent px-5 py-2 font-semibold text-accent-contrast hover:bg-accent-hover"
          >
            Khám phá sản phẩm
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {active.map((it) => (
            <div key={it.product.id} className="space-y-2">
              <ProductCard product={it.product} />
              <AccessLine item={it} />
              {licenseKeys.has(it.product.id) && <LicenseKeyBox licenseKey={licenseKeys.get(it.product.id)!} />}
              <OwnedActions product={it.product} className="w-full" />
            </div>
          ))}
        </div>
      )}

      {expired.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-lg font-semibold">
            Đã hết hạn <span className="text-text-faint">({expired.length})</span>
          </h2>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {expired.map((it) => (
              <li key={it.product.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <Link href={`/product/${it.product.slug}`} className="font-medium text-text hover:text-accent">
                    {it.product.icon ?? "✦"} {it.product.title}
                  </Link>
                  <div className="text-xs text-text-faint">
                    {it.source === "trial" ? "Dùng thử đã kết thúc" : "Hết hạn"} ngày {formatDate(it.expiresAt!)}
                  </div>
                </div>
                <Link
                  href={`/buy/${it.product.id}?kind=annual`}
                  className="shrink-0 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-contrast hover:bg-accent-hover"
                >
                  {it.source === "trial" ? "Mua gói năm" : "Gia hạn"} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/** Hạn / nguồn quyền của một mục còn hiệu lực + nút gia hạn khi có hạn. */
function AccessLine({ item }: { item: LibraryItem }) {
  if (!item.expiresAt) {
    return item.source === "giaoly_pro" ? (
      <p className="text-xs text-text-faint">Miễn phí với Pro Giáo Lý Số · dùng mãi</p>
    ) : null;
  }
  const daysLeft = item.daysLeft ?? Infinity;
  return (
    <p className={`flex items-center justify-between gap-2 text-xs ${daysLeft <= 7 ? "text-danger" : "text-text-faint"}`}>
      <span>
        {item.source === "trial" ? "Dùng thử · " : ""}Dùng đến {formatDate(item.expiresAt)}
        {daysLeft <= 7 ? ` (còn ${daysLeft} ngày)` : ""}
      </span>
      <Link href={`/buy/${item.product.id}?kind=annual`} className="shrink-0 text-brand hover:text-brand-hover">
        {item.source === "trial" ? "Mua" : "Gia hạn"}
      </Link>
    </p>
  );
}

/** Key phần mềm + hướng dẫn kích hoạt. */
function LicenseKeyBox({ licenseKey }: { licenseKey: string }) {
  return (
    <div className="rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm">
      <div className="text-[11px] uppercase tracking-[0.13em] text-text-faint">Key bản quyền</div>
      <code className="mt-1 block select-all break-all font-mono text-base font-bold text-text">
        {licenseKey}
      </code>
      <ol className="mt-2 list-decimal space-y-0.5 pl-4 text-xs text-text-muted">
        <li>Tải và cài bộ cài cho máy của bạn.</li>
        <li>Mở app → mục Bản quyền / Kích hoạt.</li>
        <li>Dán key trên rồi bấm Kích hoạt (cần mạng lần đầu).</li>
      </ol>
    </div>
  );
}

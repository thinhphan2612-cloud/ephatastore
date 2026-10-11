import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getMyLibrary, hasActiveTopping } from "@/data/store-user";
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

  const [products, topping, licenseKeys] = await Promise.all([
    getMyLibrary(user.id),
    hasActiveTopping(user.id),
    getMyLicenseKeys(user.id),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">
        Thư viện của tôi <span className="text-text-faint">({products.length})</span>
      </h1>

      {topping && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-accent/40 bg-accent/10 px-4 py-3 text-sm">
          <span className="font-semibold text-accent">
            ✦ Full Topping đang bật — bạn mở khoá tất cả sản phẩm PRO
          </span>
          <Link href="/browse" className="shrink-0 text-brand hover:text-brand-hover">
            Khám phá →
          </Link>
        </div>
      )}

      {products.length === 0 ? (
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
          {products.map((p) => (
            <div key={p.id} className="space-y-2">
              <ProductCard product={p} />
              {licenseKeys.has(p.id) && <LicenseKeyBox licenseKey={licenseKeys.get(p.id)!} />}
              <OwnedActions product={p} className="w-full" />
            </div>
          ))}
        </div>
      )}
    </div>
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

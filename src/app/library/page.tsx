import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getMyLibrary } from "@/data/store-user";
import { ProductGrid } from "@/components/product-grid";

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

  const products = await getMyLibrary(user.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">
        Thư viện của tôi <span className="text-text-faint">({products.length})</span>
      </h1>

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
        <ProductGrid products={products} />
      )}
    </div>
  );
}

import Link from "next/link";
import { CATEGORIES } from "@/data/categories";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-bg-elevated">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-10 sm:grid-cols-4">
        <div className="col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-accent font-bold text-accent-contrast">
              E
            </span>
            <span className="font-bold">
              Ephata<span className="text-accent">Store</span>
            </span>
          </div>
          <p className="mt-3 text-sm text-text-muted">
            Marketplace Công giáo — công cụ, game giáo lý, asset và tính năng cho giáo xứ.
          </p>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-text">Danh mục</h3>
          <ul className="space-y-2 text-sm text-text-muted">
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <Link href={`/category/${c.slug}`} className="hover:text-text">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-text">Hệ sinh thái</h3>
          <ul className="space-y-2 text-sm text-text-muted">
            <li>
              <a href="https://giaoly.com.vn" className="hover:text-text">
                giaoly.com.vn
              </a>
            </li>
            <li>
              <a href="https://app.giaoly.com.vn" className="hover:text-text">
                app.giaoly.com.vn
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-text">Hỗ trợ</h3>
          <ul className="space-y-2 text-sm text-text-muted">
            <li>
              <Link href="/browse" className="hover:text-text">
                Khám phá
              </Link>
            </li>
            <li>
              <Link href="/library" className="hover:text-text">
                Thư viện của tôi
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-4 text-xs text-text-faint">
          © {new Date().getFullYear()} Ephata Store · 126verse. Đang trong giai đoạn phát triển.
        </div>
      </div>
    </footer>
  );
}

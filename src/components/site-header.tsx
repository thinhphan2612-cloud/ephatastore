import Link from "next/link";
import { CATEGORIES } from "@/data/categories";
import { getCurrentUser, isAdminEmail } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const isAdmin = isAdminEmail(user?.email);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg-elevated/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        {/* logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-accent font-bold text-accent-contrast">
            E
          </span>
          <span className="text-lg font-bold tracking-tight">
            Ephata<span className="text-accent">Store</span>
          </span>
        </Link>

        {/* nav chính */}
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink href="/">Cửa hàng</NavLink>
          <NavLink href="/browse">Khám phá</NavLink>
          <NavLink href="/library">Thư viện</NavLink>
        </nav>

        {/* tìm kiếm */}
        <form action="/browse" className="ml-auto hidden max-w-xs flex-1 sm:block">
          <input
            type="search"
            name="q"
            placeholder="Tìm sản phẩm…"
            className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
          />
        </form>

        {/* phải: giỏ + tài khoản */}
        <div className="flex items-center gap-2">
          <Link
            href="/library"
            className="hidden rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:border-accent/50 hover:text-text sm:block"
          >
            🛒
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              className="hidden rounded-md border border-accent/50 px-3 py-1.5 text-sm text-accent hover:bg-accent/10 sm:block"
            >
              Admin
            </Link>
          )}

          {user ? (
            <>
              <span
                className="hidden max-w-[10rem] truncate text-sm text-text-muted md:block"
                title={user.email ?? undefined}
              >
                {user.email}
              </span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:border-accent/50 hover:text-text"
                >
                  Đăng xuất
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-contrast hover:bg-accent-hover"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>

      {/* thanh danh mục */}
      <div className="border-t border-border bg-bg-elevated">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-1.5 no-scrollbar">
          {CATEGORIES.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="whitespace-nowrap rounded px-2.5 py-1 text-sm text-text-muted hover:bg-surface hover:text-text"
            >
              <span className="mr-1">{c.icon}</span>
              {c.name}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded px-3 py-1.5 text-sm font-medium text-text-muted hover:bg-surface hover:text-text"
    >
      {children}
    </Link>
  );
}

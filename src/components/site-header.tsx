import Link from "next/link";
import { getCurrentUser, isAdminEmail } from "@/lib/auth";
import { getCurrentUserPlan } from "@/lib/plan";
import { signOut } from "@/lib/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const isAdmin = isAdminEmail(user?.email);
  const plan = user ? await getCurrentUserPlan() : "free";

  return (
    <nav className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-[70px] w-[min(1180px,calc(100%-40px))] items-center justify-between gap-4">
        <Link href="/" className="shrink-0">
          <div className="text-[10px] font-extrabold tracking-[0.24em] text-accent">
            CATHOLIC DIGITAL
          </div>
          <div className="font-display text-lg font-bold tracking-tight">
            EPHATA <span className="font-normal text-text-faint">STORE</span>
          </div>
        </Link>

        <div className="hidden items-center gap-6 text-sm text-text-muted md:flex">
          <Link href="/#categories" className="hover:text-text">
            Danh mục
          </Link>
          <Link href="/category/game-store" className="hover:text-text">
            Game Store
          </Link>
          <Link href="/category/thiet-ke-cong-giao" className="hover:text-text">
            Thiết kế
          </Link>
          <Link href="/topping" className="font-semibold text-accent-hover hover:text-accent">
            Full Topping
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isAdmin && (
            <Link
              href="/admin"
              className="hidden rounded-xl border border-accent/50 px-3 py-2 text-sm text-accent hover:bg-accent/10 sm:block"
            >
              Admin
            </Link>
          )}

          {user ? (
            <>
              {plan === "pro" && (
                <span className="hidden rounded bg-accent px-1.5 py-1 text-[10px] font-black uppercase tracking-wide text-accent-contrast sm:block">
                  Pro
                </span>
              )}
              <Link
                href="/account"
                className="max-w-[150px] truncate rounded-xl border border-border-strong bg-white/5 px-3.5 py-2.5 text-sm font-extrabold text-text hover:border-accent/50 hover:bg-accent/10"
                title={user.email ?? undefined}
              >
                ◉ {user.email}
              </Link>
              <form action={signOut}>
                <button
                  type="submit"
                  className="hidden rounded-xl border border-border px-3 py-2.5 text-sm text-text-muted hover:text-text sm:block"
                >
                  Thoát
                </button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl border border-border-strong bg-white/5 px-3.5 py-2.5 text-sm font-extrabold text-text hover:border-accent/50"
              >
                Đăng nhập
              </Link>
              <Link
                href="/signup"
                className="hidden rounded-xl bg-accent px-4 py-2.5 text-sm font-extrabold text-accent-contrast hover:bg-accent-hover sm:inline-flex"
              >
                Tạo tài khoản →
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

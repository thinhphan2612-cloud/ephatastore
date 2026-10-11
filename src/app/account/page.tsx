import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getGiaolyContext } from "@/lib/giaoly-context";
import { effectivePlan } from "@/lib/plan";
import { unlinkGiaoly } from "@/lib/actions/giaoly-link";
import { GiaolyLinkForm } from "@/components/giaoly-link-form";
import Link from "next/link";
import { getBalance } from "@/data/wallet";
import { signOut } from "@/lib/actions/auth";

export const metadata = { title: "Tài khoản" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const [ctx, balance] = await Promise.all([getGiaolyContext(), getBalance(user.id)]);
  const plan = effectivePlan(ctx);
  const tile =
    "flex flex-col gap-1 rounded-xl border border-border bg-surface p-4 text-left hover:border-accent/50 hover:bg-accent/5";

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold">Tài khoản</h1>
      <p className="mt-1 text-sm text-text-muted">
        {user.email} ·{" "}
        <Link href="/account/password" className="text-brand hover:text-brand-hover">
          Đổi mật khẩu
        </Link>
      </p>

      {/* Lối tắt — trên điện thoại thanh đầu trang ẩn Thư viện / Ví / Thoát, nên đặt ở đây. */}
      <nav aria-label="Lối tắt tài khoản" className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link href="/library" className={tile}>
          <span className="text-lg text-accent">▤</span>
          <span className="font-semibold text-text">Thư viện của tôi</span>
          <span className="text-xs text-text-muted">Sản phẩm đã sở hữu, tải về, key</span>
        </Link>
        <Link href="/wallet" className={tile}>
          <span className="text-lg text-accent">◆</span>
          <span className="font-semibold text-text">Ví point</span>
          <span className="text-xs text-text-muted">Số dư {balance.toLocaleString("vi-VN")} point</span>
        </Link>
        <form action={signOut}>
          <button type="submit" className={`${tile} h-full w-full`}>
            <span className="text-lg text-text-faint">⎋</span>
            <span className="font-semibold text-text">Đăng xuất</span>
            <span className="text-xs text-text-muted">Thoát khỏi tài khoản này</span>
          </button>
        </form>
      </nav>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Liên kết Giáo Lý Số</h2>

        {ctx ? (
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 text-success">
              <span>✓</span>
              <span className="font-medium">Đã liên kết Giáo Lý Số (giaoly.com.vn)</span>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-faint">Gói</dt>
                <dd className={plan === "pro" ? "font-semibold text-accent" : ""}>
                  {plan === "pro" ? "Pro" : "Khởi động (free)"}
                </dd>
              </div>
              {plan === "pro" && ctx.planExpiresAt && (
                <div className="flex justify-between">
                  <dt className="text-text-faint">Hạn gói</dt>
                  <dd>{new Date(ctx.planExpiresAt).toLocaleDateString("vi-VN")}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-text-faint">Vai trò</dt>
                <dd>{ctx.role ?? "—"}</dd>
              </div>
            </dl>

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-xs text-text-faint">
                Gói và vai trò tự cập nhật từ Giáo Lý Số (tối đa 6 giờ một lần).
              </p>
              <form action={unlinkGiaoly}>
                <button
                  type="submit"
                  className="shrink-0 rounded-md border border-border px-3 py-1.5 text-sm text-text-muted hover:border-danger/50 hover:text-danger"
                >
                  Gỡ liên kết
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-surface p-5">
            <p className="mb-4 text-sm text-text-muted">
              Liên kết tài khoản <strong>Giáo Lý Số (giaoly.com.vn)</strong> để dùng sản
              phẩm trên Store — Store mở khoá theo <strong>gói Pro của Giáo Lý Số</strong>.
              (Không cần liên kết cho việc quản trị.)
            </p>
            <GiaolyLinkForm />
          </div>
        )}
      </section>
    </div>
  );
}

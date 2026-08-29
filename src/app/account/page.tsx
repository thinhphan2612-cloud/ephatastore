import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getGiaolyContext } from "@/lib/giaoly-context";
import { normalizePlan } from "@/lib/plan";
import { unlinkGiaoly } from "@/lib/actions/giaoly-link";
import { GiaolyLinkForm } from "@/components/giaoly-link-form";

export const metadata = { title: "Tài khoản" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account");

  const ctx = await getGiaolyContext();
  const plan = normalizePlan(ctx?.planRaw);

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <h1 className="text-2xl font-bold">Tài khoản</h1>
      <p className="mt-1 text-sm text-text-muted">{user.email}</p>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Liên kết giaoly</h2>

        {ctx ? (
          <div className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 text-success">
              <span>✓</span>
              <span className="font-medium">Đã liên kết app.giaoly.com.vn</span>
            </div>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-faint">Gói</dt>
                <dd className={plan === "pro" ? "font-semibold text-accent" : ""}>
                  {plan === "pro" ? "Pro" : "Khởi động (free)"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-faint">Vai trò</dt>
                <dd>{ctx.role ?? "—"}</dd>
              </div>
            </dl>

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-xs text-text-faint">
                Gói được lưu lúc liên kết. Nếu giáo xứ đổi gói, liên kết lại để cập nhật.
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
              Liên kết tài khoản giaoly để mở khoá <strong>gói Pro</strong> và mua các{" "}
              <strong>tính năng tích hợp</strong> cho giáo xứ. Không bắt buộc nếu bạn chỉ
              mua sản phẩm tải về / game.
            </p>
            <GiaolyLinkForm />
          </div>
        )}
      </section>
    </div>
  );
}

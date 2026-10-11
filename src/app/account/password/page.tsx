import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/change-password-form";
import { getGiaolyContext } from "@/lib/giaoly-context";

export const metadata = { title: "Đổi mật khẩu" };

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/password");
  const giaoly = await getGiaolyContext();

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-center text-2xl font-bold">Đặt mật khẩu mới</h1>
      <p className="mt-2 text-center text-sm text-text-muted">{user.email}</p>
      <div className="mt-8 rounded-xl border border-border bg-bg-elevated p-6">
        <ChangePasswordForm />
      </div>
      {giaoly && (
        <p className="mt-4 rounded-lg border border-border px-4 py-3 text-xs leading-relaxed text-text-muted">
          Tài khoản đã liên kết <b className="text-text">Giáo Lý Số</b>: đây là mật khẩu Ephata Store, mật khẩu Giáo Lý Số
          giữ nguyên. Bạn đăng nhập được bằng một trong hai: email + mật khẩu mới này, hoặc nút Giáo Lý Số với mật khẩu Giáo
          Lý Số.
        </p>
      )}
    </div>
  );
}

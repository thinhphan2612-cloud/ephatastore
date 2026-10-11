import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/change-password-form";

export const metadata = { title: "Đổi mật khẩu" };

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/account/password");

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-center text-2xl font-bold">Đặt mật khẩu mới</h1>
      <p className="mt-2 text-center text-sm text-text-muted">{user.email}</p>
      <div className="mt-8 rounded-xl border border-border bg-bg-elevated p-6">
        <ChangePasswordForm />
      </div>
    </div>
  );
}

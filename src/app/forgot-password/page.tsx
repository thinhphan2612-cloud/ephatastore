import Link from "next/link";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata = { title: "Quên mật khẩu" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-center text-2xl font-bold">Quên mật khẩu</h1>
      <p className="mt-2 text-center text-sm text-text-muted">
        Nhập email tài khoản Ephata Store — chúng tôi gửi liên kết để bạn đặt mật khẩu mới.
      </p>
      <div className="mt-8 rounded-xl border border-border bg-bg-elevated p-6">
        <ForgotPasswordForm />
      </div>
      <p className="mt-6 text-center text-sm text-text-muted">
        Nhớ ra rồi?{" "}
        <Link href="/login" className="text-accent hover:text-accent-hover">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}

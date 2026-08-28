import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Đăng nhập" };

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-center text-2xl font-bold">Đăng nhập</h1>
      <p className="mt-2 text-center text-sm text-text-muted">
        Dùng chung tài khoản với{" "}
        <span className="text-text">app.giaoly.com.vn</span>.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-bg-elevated p-6">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}

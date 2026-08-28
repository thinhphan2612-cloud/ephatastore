import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SignupForm } from "@/components/signup-form";

export const metadata = { title: "Đăng ký" };

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-center text-2xl font-bold">Tạo tài khoản</h1>
      <p className="mt-2 text-center text-sm text-text-muted">
        Đăng ký để mua sản phẩm tải về và game trên Ephata Store.
      </p>

      <div className="mt-8 rounded-xl border border-border bg-bg-elevated p-6">
        <Suspense>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}

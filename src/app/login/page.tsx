import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/login-form";
import { GiaolyLoginForm } from "@/components/giaoly-login-form";
import { safeNext } from "@/lib/safe-next";
import { noticeText } from "@/lib/notices";

export const metadata = { title: "Đăng nhập" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error: errorCode, next } = await searchParams;
  const error = noticeText(errorCode);
  const user = await getCurrentUser();
  if (user) redirect(safeNext(next));

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-center text-2xl font-bold">Đăng nhập</h1>
      <p className="mt-2 text-center text-sm text-text-muted">
        Tài khoản Ephata Store.
      </p>

      {error && (
        <p role="alert" className="mt-6 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-center text-sm text-danger">
          {error}
        </p>
      )}
      <div className="mt-8 rounded-xl border border-border bg-bg-elevated p-6">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>

      <div className="my-6 flex items-center gap-3 text-xs text-text-faint">
        <span className="h-px flex-1 bg-border" />
        hoặc
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="rounded-xl border border-border bg-bg-elevated p-6">
        <p className="mb-3 text-center text-sm text-text-muted">
          Đã có tài khoản <strong className="text-text">Giáo Lý Số</strong>? Đăng nhập
          thẳng — hệ thống tự tạo &amp; liên kết tài khoản store.
        </p>
        <Suspense>
          <GiaolyLoginForm />
        </Suspense>
      </div>
    </div>
  );
}

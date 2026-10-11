"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { safeNext } from "@/lib/safe-next";
import { createStoreAuthBrowserClient } from "@/lib/supabase/store-auth-browser";
import { authErrorVi } from "@/lib/auth-errors";

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Mật khẩu tối thiểu 6 ký tự.");
      return;
    }
    setLoading(true);

    const supabase = createStoreAuthBrowserClient();
    // Khi bật xác nhận email (Supabase Auth + SMTP riêng): link trong email trỏ về /auth/confirm rồi quay lại `next`.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/confirm?next=${encodeURIComponent(next)}` },
    });

    if (error) {
      setError(authErrorVi(error));
      setLoading(false);
      return;
    }

    // Bật xác nhận email → chưa có phiên: báo kiểm tra email.
    if (!data.session) {
      setError(`Đã gửi email xác nhận tới ${email}. Mở email (kể cả mục Spam) và bấm liên kết để kích hoạt tài khoản.`);
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 text-left">
      <div>
        <label htmlFor="signup-email" className="mb-1 block text-sm text-text-muted">Email</label>
        <input id="signup-email" autoComplete="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
          placeholder="email@example.com"
        />
      </div>
      <div>
        <label htmlFor="signup-password" className="mb-1 block text-sm text-text-muted">Mật khẩu</label>
        <input id="signup-password" autoComplete="new-password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
          placeholder="Tối thiểu 6 ký tự"
        />
      </div>

      {error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-accent px-4 py-2.5 font-semibold text-accent-contrast hover:bg-accent-hover disabled:opacity-60"
      >
        {loading ? "Đang tạo tài khoản…" : "Đăng ký"}
      </button>

      <p className="text-center text-sm text-text-muted">
        Đã có tài khoản?{" "}
        <Link
          href={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="text-brand hover:text-brand-hover"
        >
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}

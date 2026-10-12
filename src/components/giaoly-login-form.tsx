"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeNext } from "@/lib/safe-next";
import { createClient } from "@supabase/supabase-js";
import { createStoreAuthBrowserClient } from "@/lib/supabase/store-auth-browser";
import { loginWithGiaoly } from "@/lib/actions/giaoly-login";
import { authErrorVi } from "@/lib/auth-errors";

export function GiaolyLoginForm() {
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
    setLoading(true);
    try {
      // 1) Đăng nhập Giáo Lý Số (không lưu session — chỉ lấy token).
      const giaoly = createClient(
        process.env.NEXT_PUBLIC_GIAOLY_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_GIAOLY_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false } }
      );
      const { data, error: authErr } = await giaoly.auth.signInWithPassword({
        email,
        password,
      });
      if (authErr || !data.session) {
        setError(authErrorVi(authErr, "Giáo Lý Số"));
        setLoading(false);
        return;
      }

      // 2) Đổi lấy token đăng nhập store.
      const fd = new FormData();
      fd.set("access_token", data.session.access_token);
      const res = await loginWithGiaoly({}, fd);
      if (res.error || !res.tokenHash) {
        setError(res.error ?? "Không tạo được phiên store.");
        setLoading(false);
        return;
      }

      // 3) Lập session store bằng OTP.
      const store = createStoreAuthBrowserClient();
      const { error: otpErr } = await store.auth.verifyOtp({
        token_hash: res.tokenHash,
        type: "email",
      });
      if (otpErr) {
        setError(authErrorVi(otpErr));
        setLoading(false);
        return;
      }

      router.push(next);
      router.refresh();
    } catch (err) {
      setError(authErrorVi(err instanceof Error ? err : null));
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 text-left">
      <div>
        <label htmlFor="gls-login-email" className="mb-1 block text-sm text-text-muted">Email Giáo Lý Số</label>
        <input id="gls-login-email" autoComplete="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="gls-login-password" className="mb-1 block text-sm text-text-muted">Mật khẩu Giáo Lý Số</label>
        <input id="gls-login-password" autoComplete="current-password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:outline-none"
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
        className="w-full rounded-md border border-border-strong bg-surface px-4 py-2.5 font-semibold text-text hover:border-accent/50 disabled:opacity-60"
      >
        {loading ? "Đang đăng nhập…" : "Đăng nhập bằng Giáo Lý Số"}
      </button>
    </form>
  );
}

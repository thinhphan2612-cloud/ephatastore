"use client";

import { useState } from "react";
import Link from "next/link";
import { createStoreAuthBrowserClient } from "@/lib/supabase/store-auth-browser";

/** Gửi email đặt lại mật khẩu. Luôn báo cùng một câu (không để lộ email nào có tài khoản). */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await createStoreAuthBrowserClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${location.origin}/auth/confirm?next=/account/password`,
    });
    setLoading(false);
    // Chỉ báo lỗi kỹ thuật (vd gửi quá nhiều lần); email không tồn tại cũng hiện như đã gửi.
    if (error && /rate|limit|too many|seconds/i.test(error.message)) {
      setError("Bạn vừa yêu cầu gần đây. Đợi ít phút rồi thử lại.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="space-y-3 text-center text-sm">
        <p className="text-text">
          Nếu <strong>{email}</strong> có tài khoản Ephata Store, bạn sẽ nhận được email kèm liên kết đặt lại mật khẩu trong vài phút.
        </p>
        <p className="text-text-muted">Không thấy thì kiểm tra mục Spam / Quảng cáo. Liên kết dùng được một lần.</p>
        <Link href="/login" className="inline-block text-accent hover:text-accent-hover">
          ← Về đăng nhập
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm text-text-muted">Email tài khoản</span>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:outline-none"
        />
      </label>
      {error && <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-accent px-4 py-2.5 font-semibold text-accent-contrast hover:bg-accent-hover disabled:opacity-60"
      >
        {loading ? "Đang gửi…" : "Gửi liên kết đặt lại mật khẩu"}
      </button>
    </form>
  );
}

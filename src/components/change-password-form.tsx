"use client";

import { useState } from "react";
import Link from "next/link";
import { createStoreAuthBrowserClient } from "@/lib/supabase/store-auth-browser";
import { authErrorVi } from "@/lib/auth-errors";

/** Đặt mật khẩu mới cho tài khoản đang đăng nhập (đổi mật khẩu, hoặc sau khi bấm link "Quên mật khẩu"). */
export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("Mật khẩu tối thiểu 6 ký tự.");
    if (password !== confirm) return setError("Hai lần nhập mật khẩu không khớp.");
    setLoading(true);
    const { error } = await createStoreAuthBrowserClient().auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(authErrorVi(error));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="space-y-3 text-center text-sm">
        <p className="font-medium text-success">Đã đặt mật khẩu mới. Lần sau đăng nhập bằng mật khẩu này.</p>
        <Link href="/account" className="inline-block text-accent hover:text-accent-hover">
          ← Về Tài khoản
        </Link>
      </div>
    );
  }

  const input =
    "w-full rounded-md border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:outline-none";
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm text-text-muted">Mật khẩu mới</span>
        <input type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-text-muted">Nhập lại mật khẩu mới</span>
        <input type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={input} />
      </label>
      {error && <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-accent px-4 py-2.5 font-semibold text-accent-contrast hover:bg-accent-hover disabled:opacity-60"
      >
        {loading ? "Đang lưu…" : "Lưu mật khẩu mới"}
      </button>
    </form>
  );
}

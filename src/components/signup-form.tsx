"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createStoreAuthBrowserClient } from "@/lib/supabase/store-auth-browser";

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/";

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
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(
        error.message.includes("already registered")
          ? "Email này đã có tài khoản. Hãy đăng nhập."
          : error.message
      );
      setLoading(false);
      return;
    }

    // Confirm email đã tắt → có session ngay. Nếu vì lý do nào đó chưa có session:
    if (!data.session) {
      setError("Tài khoản đã tạo. Vui lòng đăng nhập.");
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 text-left">
      <div>
        <label className="mb-1 block text-sm text-text-muted">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-text placeholder:text-text-faint focus:border-accent focus:outline-none"
          placeholder="email@example.com"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-text-muted">Mật khẩu</label>
        <input
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

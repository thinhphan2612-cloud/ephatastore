"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { linkGiaoly } from "@/lib/actions/giaoly-link";

export function GiaolyLinkForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // 1) Đăng nhập giaoly ngay trong browser (không lưu session — chỉ lấy token).
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
      setError(
        authErr?.message === "Invalid login credentials"
          ? "Email hoặc mật khẩu giaoly không đúng."
          : authErr?.message ?? "Không đăng nhập được giaoly."
      );
      setLoading(false);
      return;
    }

    // 2) Gửi access_token sang server để verify + lưu liên kết.
    const fd = new FormData();
    fd.set("access_token", data.session.access_token);
    const res = await linkGiaoly({}, fd);

    if (res.error) {
      setError(res.error);
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-text-muted">
        Nhập tài khoản <strong>app.giaoly.com.vn</strong> để liên kết. Store chỉ đọc
        giáo xứ &amp; gói của bạn — không lưu mật khẩu giaoly.
      </p>
      <div>
        <label className="mb-1 block text-sm text-text-muted">Email giaoly</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm text-text-muted">Mật khẩu giaoly</label>
        <input
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
        className="w-full rounded-md bg-accent px-4 py-2.5 font-semibold text-accent-contrast hover:bg-accent-hover disabled:opacity-60"
      >
        {loading ? "Đang liên kết…" : "Liên kết giaoly"}
      </button>
    </form>
  );
}

"use client"; // Error boundary phải là Client Component

import Link from "next/link";
import { useEffect } from "react";

/** Lỗi không lường trước trong một trang → thông báo tiếng Việt + thử lại, thay cho trang lỗi tiếng Anh. */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Đã có lỗi xảy ra</h1>
      <p className="mt-2 text-text-muted">
        Thao tác chưa hoàn tất. Nếu bạn vừa thanh toán, hãy mở Thư viện / Ví để kiểm tra trước khi thử lại — giao dịch
        không bị trừ point hai lần.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-contrast hover:bg-accent-hover"
        >
          Thử lại
        </button>
        <Link href="/library" className="rounded-xl border border-border px-5 py-2.5 font-semibold text-text hover:border-accent">
          Thư viện
        </Link>
        <Link href="/wallet" className="rounded-xl border border-border px-5 py-2.5 font-semibold text-text hover:border-accent">
          Ví
        </Link>
      </div>
      <p className="mt-6 text-sm text-text-faint">
        Lỗi lặp lại?{" "}
        <Link href="/lien-he" className="text-accent hover:text-accent-hover">
          Liên hệ
        </Link>
        {error.digest && <span> — kèm mã lỗi {error.digest}</span>}
      </p>
    </div>
  );
}

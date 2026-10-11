"use client";

import { useState } from "react";

/** Nút copy một giá trị (số tài khoản, nội dung chuyển khoản…) — trên điện thoại không quét được QR trên chính máy đó. */
export function CopyButton({ value, label = "Copy" }: { value: string; label?: string }) {
  const [state, setState] = useState<"idle" | "done" | "fail">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("done");
    } catch {
      setState("fail");
    }
    setTimeout(() => setState("idle"), 1800);
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`${label}: ${value}`}
      className="shrink-0 rounded-md border border-border px-2 py-0.5 text-xs font-semibold text-text-muted hover:border-accent hover:text-accent"
    >
      {state === "done" ? "Đã copy" : state === "fail" ? "Giữ để copy" : label}
    </button>
  );
}

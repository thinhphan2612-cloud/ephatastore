"use client";

import { useState } from "react";
import { createAppSecret } from "@/lib/actions/apps";
import { unwrap } from "@/lib/action-result";

/**
 * Trang Sửa sản phẩm Link ngoài / Tính năng: khóa bí mật server để app ngoài gọi /api/apps/v1.
 * Khóa chỉ hiện MỘT LẦN ngay sau khi tạo (Ephata chỉ lưu hash). Tạo khóa mới = khóa cũ hết hiệu lực.
 */
export function AppSecretPanel({
  productId,
  slug,
  hasSecret,
  apiBase,
  publicKey,
}: {
  productId: string;
  slug: string;
  hasSecret: boolean;
  apiBase: string;
  publicKey: string;
}) {
  const [secret, setSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onCreate() {
    if (hasSecret && !secret && !confirming) return setConfirming(true);
    setBusy(true);
    setError(null);
    try {
      setSecret(unwrap(await createAppSecret(productId)));
      setConfirming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tạo được khóa.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!secret) return;
    try {
      await navigator.clipboard.writeText(secret);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface p-4 text-sm">
      <div className="font-semibold text-text">Kết nối app ngoài (server của app gọi Ephata)</div>
      <pre className="overflow-x-auto rounded-md bg-bg-elevated p-3 text-xs text-text">
{`EPHATA_PRODUCT    = "${slug}"
EPHATA_API_BASE   = "${apiBase}"
EPHATA_PUBLIC_KEY = "${publicKey}"
EPHATA_APP_SECRET = ${secret ? `"${secret}"` : hasSecret ? "(đã tạo — chỉ hiện một lần lúc tạo)" : "(chưa có — bấm Tạo khóa)"}`}
      </pre>
      {secret && (
        <div className="space-y-2 rounded-md border border-warn/40 bg-warn/10 p-3">
          <p className="text-warn">
            Lưu khóa này vào biến môi trường server của app <b>ngay bây giờ</b> — Ephata không hiển thị lại. Không đặt khóa
            trong code chạy ở trình duyệt.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="break-all rounded bg-bg-elevated px-2 py-1 text-xs text-text">{secret}</code>
            <button type="button" onClick={copy} className="rounded-md border border-border px-3 py-1 text-xs hover:border-accent">
              {copied ? "Đã copy" : "Copy"}
            </button>
          </div>
        </div>
      )}
      {confirming && (
        <p className="text-warn">
          Tạo khóa mới sẽ làm khóa đang dùng hết hiệu lực ngay — app phải cập nhật khóa mới. Bấm lần nữa để xác nhận.
        </p>
      )}
      {error && <p className="text-danger">{error}</p>}
      <button
        type="button"
        onClick={onCreate}
        disabled={busy}
        className="rounded-md border border-accent px-4 py-2 font-semibold text-accent hover:bg-accent/10 disabled:opacity-60"
      >
        {busy ? "Đang tạo…" : confirming ? "Xác nhận tạo khóa mới" : hasSecret || secret ? "Tạo khóa mới" : "Tạo khóa bí mật"}
      </button>
    </div>
  );
}

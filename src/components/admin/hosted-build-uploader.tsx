"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadHostedBuild } from "@/lib/hosted-upload";
import { replaceHostedBuild, rollbackHostedBuild } from "@/lib/actions/game-upload";
import { unwrap } from "@/lib/action-result";

/**
 * Trang Sửa game / công cụ web: tải bản build mới (.zip) để THAY TẠI CHỖ.
 * Cùng sản phẩm, cùng slug — người đã mua giữ quyền; bản đang chạy được giữ làm "bản trước" để quay lại.
 */
export function HostedBuildUploader({
  productId,
  gameId,
  prevGameId,
}: {
  productId: string;
  gameId: string;
  prevGameId: string | null;
}) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [confirmRollback, setConfirmRollback] = useState(false);

  async function onRollback() {
    setError(null);
    setBusy(true);
    try {
      unwrap(await rollbackHostedBuild(productId));
      setProgress("Đã quay lại bản trước. Người chơi mở lại sẽ thấy bản này.");
      setConfirmRollback(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không quay lại được.");
    } finally {
      setBusy(false);
    }
  }

  async function onUpload() {
    if (!file) return setError("Chọn file .zip bản build mới.");
    setError(null);
    setBusy(true);
    try {
      const { gameId: newId } = await uploadHostedBuild(file, setProgress);
      setProgress("Đang chuyển sang bản mới…");
      unwrap(await replaceHostedBuild(productId, newId));
      setProgress("Đã thay bản build. Người chơi mở lại sẽ thấy bản mới.");
      setFile(null);
      setInputKey((k) => k + 1);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi khi tải bản build.");
      setProgress("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-surface-hover/40 p-4">
      <div className="text-sm font-semibold text-text">Bản build</div>
      <p className="text-xs text-text-faint">
        Đang chạy: <code className="text-text">{gameId.slice(0, 8)}</code>
        {prevGameId && (
          <>
            {" "}· Bản trước: <code className="text-text">{prevGameId.slice(0, 8)}</code>
          </>
        )}
        . Tải .zip mới (có index.html, đường dẫn tương đối) để thay bản đang chạy — cùng sản phẩm, người đã mua giữ quyền;
        bản đang chạy được giữ lại để quay lại nếu bản mới lỗi.
      </p>
      <input
        key={inputKey}
        type="file"
        accept=".zip,application/zip"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-text hover:file:bg-surface-hover"
      />
      {error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onUpload}
          disabled={busy}
          className="rounded-md border border-accent px-4 py-2 text-sm font-semibold text-accent hover:bg-accent/10 disabled:opacity-60"
        >
          {busy ? "Đang tải…" : "Tải bản build mới"}
        </button>
        {prevGameId &&
          (confirmRollback ? (
            <button
              type="button"
              onClick={onRollback}
              disabled={busy}
              className="rounded-md border border-danger px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-60"
            >
              Chắc chắn quay lại {prevGameId.slice(0, 8)}?
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRollback(true)}
              disabled={busy}
              className="rounded-md border border-border px-4 py-2 text-sm text-text-muted hover:border-accent hover:text-text disabled:opacity-60"
            >
              ↺ Quay lại bản trước
            </button>
          ))}
        {progress && <span className="text-sm text-text-muted">{progress}</span>}
      </div>
    </div>
  );
}

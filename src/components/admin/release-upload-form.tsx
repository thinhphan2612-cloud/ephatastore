"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createStoreAuthBrowserClient } from "@/lib/supabase/store-auth-browser";
import { createReleaseUpload, saveRelease } from "@/lib/actions/software";
import { PLATFORMS, PLATFORM_LABEL, SEMVER_RE, type Platform } from "@/lib/software/version";

/** Supabase gói Free: tối đa 50MB/file (bucket product-files). */
const MAX_BYTES = 50 * 1024 * 1024;

const input =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:outline-none";

export function ReleaseUploadForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>("windows");
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!SEMVER_RE.test(version.trim())) return setError("Phiên bản phải dạng semver, vd 1.2.8.");
    if (!file) return setError("Chọn file bộ cài.");
    if (file.size > MAX_BYTES) return setError("File vượt 50MB (giới hạn Supabase gói Free).");

    setBusy(true);
    try {
      setProgress("Đang tạo link upload…");
      const { path, token } = await createReleaseUpload({
        productId,
        platform,
        version: version.trim(),
        fileName: file.name,
      });

      setProgress(`Đang tải lên ${(file.size / 1048576).toFixed(1)}MB…`);
      const { error: upErr } = await createStoreAuthBrowserClient()
        .storage.from("product-files")
        .uploadToSignedUrl(path, token, file, {
          contentType: file.type || "application/octet-stream",
          upsert: true,
        });
      if (upErr) throw new Error(`Lỗi tải lên: ${upErr.message}`);

      setProgress("Đang lưu phiên bản…");
      await saveRelease({
        productId,
        platform,
        version: version.trim(),
        path,
        fileName: file.name,
        sizeBytes: file.size,
        notes,
      });

      setVersion("");
      setNotes("");
      setFile(null);
      (e.target as HTMLFormElement).reset();
      setProgress("Đã thêm phiên bản.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi khi tải bộ cài.");
      setProgress("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border border-border bg-surface-hover/40 p-4">
      <div className="text-sm font-semibold text-text">Thêm phiên bản</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-text-muted">Nền tảng</span>
          <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} className={input}>
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABEL[p]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-text-muted">Phiên bản (semver)</span>
          <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.2.8" className={input} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm text-text-muted">Ghi chú phát hành</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={input} />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm text-text-muted">
          Bộ cài ({platform === "windows" ? ".exe / .msi" : ".dmg"}) — tối đa 50MB
        </span>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-text hover:file:bg-surface-hover"
        />
      </label>

      {error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-accent px-5 py-2 font-semibold text-accent-contrast hover:bg-accent-hover disabled:opacity-60"
        >
          {busy ? "Đang tải…" : "Tải lên"}
        </button>
        {progress && <span className="text-sm text-text-muted">{progress}</span>}
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import JSZip from "jszip";
import { createStoreAuthBrowserClient } from "@/lib/supabase/store-auth-browser";
import {
  createGameUploadTokens,
  saveGameProduct,
} from "@/lib/actions/game-upload";

const MIME: Record<string, string> = {
  html: "text/html",
  htm: "text/html",
  js: "text/javascript",
  mjs: "text/javascript",
  css: "text/css",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  mp4: "video/mp4",
  webm: "video/webm",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
};
const mimeOf = (p: string) =>
  MIME[p.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";

const input =
  "w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-text focus:border-accent focus:outline-none";

export function GameUploadForm({
  categories,
}: {
  categories: { id: string; name: string; slug: string }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [categorySlug, setCategorySlug] = useState("game-store");
  const [tier, setTier] = useState<"free" | "pro">("free");
  const [price, setPrice] = useState(0);
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError("Nhập tên game.");
    if (!file) return setError("Chọn file .zip của game.");

    setBusy(true);
    try {
      setProgress("Đang giải nén…");
      const zip = await JSZip.loadAsync(file);

      // gom file (bỏ thư mục + rác macOS)
      const entries = Object.values(zip.files).filter(
        (f) => !f.dir && !f.name.includes("__MACOSX") && !f.name.endsWith(".DS_Store")
      );
      // tìm index.html nông nhất -> lấy tiền tố thư mục gốc để bóc
      const idx = entries
        .filter((f) => f.name.toLowerCase().endsWith("index.html"))
        .sort((a, b) => a.name.length - b.name.length)[0];
      if (!idx) throw new Error("Không tìm thấy index.html trong zip.");
      const base = idx.name.slice(0, idx.name.length - "index.html".length);

      const files = entries
        .filter((f) => f.name.startsWith(base))
        .map((f) => ({ rel: f.name.slice(base.length), entry: f }))
        .filter((f) => f.rel.length > 0);

      setProgress("Đang chuẩn bị tải lên…");
      const coverPath = cover
        ? `__cover.${cover.name.split(".").pop()?.toLowerCase() || "png"}`
        : undefined;
      const relPaths = files.map((f) => f.rel);
      if (coverPath) relPaths.push(coverPath);
      const { gameId, tokens } = await createGameUploadTokens(relPaths);
      const tokenMap = new Map(tokens.map((t) => [t.path, t.token]));

      const supabase = createStoreAuthBrowserClient();
      let done = 0;
      for (const f of files) {
        const token = tokenMap.get(f.rel)!;
        const blob = await f.entry.async("blob");
        const { error: upErr } = await supabase.storage
          .from("games")
          .uploadToSignedUrl(`${gameId}/${f.rel}`, token, blob, {
            contentType: mimeOf(f.rel),
            upsert: true,
          });
        if (upErr) throw new Error(`Lỗi tải ${f.rel}: ${upErr.message}`);
        done++;
        setProgress(`Đang tải lên… ${done}/${files.length}`);
      }

      if (coverPath && cover) {
        setProgress("Đang tải ảnh bìa…");
        const { error: upErr } = await supabase.storage
          .from("games")
          .uploadToSignedUrl(`${gameId}/${coverPath}`, tokenMap.get(coverPath)!, cover, {
            contentType: cover.type || mimeOf(coverPath),
            upsert: true,
          });
        if (upErr) throw new Error(`Lỗi tải ảnh bìa: ${upErr.message}`);
      }

      setProgress("Đang tạo sản phẩm…");
      const { slug } = await saveGameProduct({
        gameId,
        title: title.trim(),
        categorySlug,
        tier,
        priceMonth: price,
        description: desc,
        coverPath,
      });

      router.push(`/product/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi khi tải game.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm text-text-muted">Tên game *</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm text-text-muted">Danh mục</span>
          <select value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)} className={input}>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm text-text-muted">Tier</span>
          <select value={tier} onChange={(e) => setTier(e.target.value as "free" | "pro")} className={input}>
            <option value="free">FREE</option>
            <option value="pro">PRO</option>
          </select>
        </label>
      </div>

      {tier === "pro" && (
        <label className="block">
          <span className="mb-1 block text-sm text-text-muted">Giá/tháng (VND)</span>
          <input type="number" min={0} step={1000} value={price} onChange={(e) => setPrice(Number(e.target.value))} className={input} />
        </label>
      )}

      <label className="block">
        <span className="mb-1 block text-sm text-text-muted">Mô tả ngắn</span>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className={input} />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-text-muted">
          Ảnh bìa / thumbnail <span className="text-text-faint">(không bắt buộc)</span>
        </span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setCover(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-text hover:file:bg-surface-hover"
        />
        {cover && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={URL.createObjectURL(cover)}
            alt="Xem trước ảnh bìa"
            className="mt-2 aspect-video w-48 rounded-md border border-border object-cover"
          />
        )}
        <span className="mt-1 block text-xs text-text-faint">
          Tỉ lệ 16:9 đẹp nhất. Dùng làm ảnh cho thẻ sản phẩm và trang chi tiết.
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-text-muted">File game (.zip — chứa index.html + assets)</span>
        <input
          type="file"
          accept=".zip,application/zip"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-text hover:file:bg-surface-hover"
        />
        <span className="mt-1 block text-xs text-text-faint">
          Webgame chạy trực tiếp: dùng đường dẫn tương đối, mỗi file tối đa 50MB.
        </span>
      </label>

      {error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      {busy && <p className="text-sm text-text-muted">{progress}</p>}

      <button
        type="submit"
        disabled={busy}
        className="rounded-md bg-accent px-5 py-2.5 font-semibold text-accent-contrast hover:bg-accent-hover disabled:opacity-60"
      >
        {busy ? "Đang xử lý…" : "Tải lên & thêm game"}
      </button>
    </form>
  );
}

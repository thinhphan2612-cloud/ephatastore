"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createStoreAuthBrowserClient } from "@/lib/supabase/store-auth-browser";
import { saveGameProduct } from "@/lib/actions/game-upload";
import { createProductUpload } from "@/lib/actions/admin";
import { uploadHostedBuild } from "@/lib/hosted-upload";
import { SelectWithCreate } from "@/components/admin/catalog-fields";
import { unwrap } from "@/lib/action-result";

/** product-covers giới hạn 5MB / ảnh. */
const MAX_COVER_BYTES = 5 * 1024 * 1024;

const input =
  "w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-text focus:border-accent focus:outline-none";

export function GameUploadForm({
  categories,
  publishers,
  defaultCategoryId,
  defaultPublisherId,
}: {
  categories: { id: string; name: string }[];
  publishers: { id: string; name: string }[];
  defaultCategoryId?: string;
  defaultPublisherId?: string;
}) {
  const router = useRouter();
  const [kind, setKind] = useState<"game" | "tool">("game");
  const [title, setTitle] = useState("");
  const [tier, setTier] = useState<"free" | "pro">("free");
  const [price, setPrice] = useState(0);
  const [proFree, setProFree] = useState(false);
  const [usesWallet, setUsesWallet] = useState(false);
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const categoryId = String(fd.get("category_id") ?? "");
    const publisherId = String(fd.get("publisher_id") ?? "");
    if (!title.trim()) return setError("Nhập tên game.");
    if (!categoryId) return setError("Chọn danh mục.");
    if (!publisherId) return setError("Chọn nhà phát hành.");
    if (!file) return setError("Chọn file .zip của game.");
    if (kind === "game" && tier === "pro" && !(price > 0)) return setError("Game PRO cần giá lớn hơn 0 — hoặc chọn FREE.");

    setBusy(true);
    try {
      if (cover && cover.size > MAX_COVER_BYTES) throw new Error("Ảnh bìa tối đa 5MB.");
      const { gameId } = await uploadHostedBuild(file, setProgress);

      let coverPath: string | undefined;
      if (cover) {
        setProgress("Đang tải ảnh bìa…");
        const t = unwrap(await createProductUpload({ purpose: "cover", fileName: cover.name }));
        const { error: upErr } = await createStoreAuthBrowserClient()
          .storage.from(t.bucket)
          .uploadToSignedUrl(t.path, t.token, cover, { contentType: cover.type || "image/png", upsert: true });
        if (upErr) throw new Error(`Lỗi tải ảnh bìa: ${upErr.message}`);
        coverPath = t.path;
      }

      setProgress("Đang tạo sản phẩm…");
      const { slug } = unwrap(await saveGameProduct({
        gameId,
        title: title.trim(),
        categoryId,
        publisherId,
        tier,
        priceMonth: price,
        giaolyProFree: proFree,
        description: desc,
        coverPath,
        kind,
        usesWallet,
      }));

      router.push(`/product/${slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi khi tải game.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm text-text-muted">Loại nội dung</span>
        <select value={kind} onChange={(e) => setKind(e.target.value as "game" | "tool")} className={input}>
          <option value="game">Game (có thể gate Pro)</option>
          <option value="tool">Công cụ web (mở tự do)</option>
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm text-text-muted">
          Tên {kind === "tool" ? "công cụ" : "game"} *
        </span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
      </label>

      {/* div thay vì label: khung "+ Thêm mới" nằm bên trong, label sẽ cướp focus. */}
      <div>
        <span className="mb-1 block text-sm text-text-muted">Danh mục *</span>
        <SelectWithCreate kind="category" name="category_id" options={categories} defaultValue={defaultCategoryId} />
      </div>
      <div>
        <span className="mb-1 block text-sm text-text-muted">Nhà phát hành *</span>
        <SelectWithCreate kind="publisher" name="publisher_id" options={publishers} defaultValue={defaultPublisherId} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {kind === "game" && (
          <label className="block">
            <span className="mb-1 block text-sm text-text-muted">Tier</span>
            <select value={tier} onChange={(e) => setTier(e.target.value as "free" | "pro")} className={input}>
              <option value="free">FREE</option>
              <option value="pro">PRO</option>
            </select>
          </label>
        )}
      </div>

      {kind === "game" && tier === "pro" && (
        <label className="block">
          <span className="mb-1 block text-sm text-text-muted">Giá mua vĩnh viễn (VND)</span>
          <input type="number" min={1000} step={1000} required value={price} onChange={(e) => setPrice(Number(e.target.value))} className={input} />
        </label>
      )}
      {kind === "game" && tier === "pro" && (
        <label className="flex items-center gap-2 text-sm text-text">
          <input type="checkbox" checked={proFree} onChange={(e) => setProFree(e.target.checked)} className="h-4 w-4" />
          Miễn phí cho tài khoản Pro Giáo Lý Số
        </label>
      )}

      <label className="flex items-start gap-2 text-sm text-text">
        <input type="checkbox" checked={usesWallet} onChange={(e) => setUsesWallet(e.target.checked)} className="mt-0.5 h-4 w-4" />
        <span>
          {kind === "tool" ? "Công cụ" : "Game"} trừ point theo lượt qua Ví Ephata
          <span className="block text-xs text-text-faint">
            Chỉ tick khi app có gọi /api/apps/v1/charge (xem App Kit → hosted). Không tick thì API Ví từ chối.
          </span>
        </span>
      </label>

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
      <p className="text-xs text-text-faint">
        Sản phẩm <b>hiện trên store ngay</b> sau khi tải lên. Mô tả chi tiết (HTML) thêm ở trang Sửa sau khi tạo.
      </p>
    </form>
  );
}

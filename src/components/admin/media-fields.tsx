"use client";

import { useState } from "react";
import {
  IMAGE_EXT,
  MAX_GALLERY,
  MAX_IMAGE_BYTES,
  MAX_LOGO_BYTES,
  MAX_VIDEO_BYTES,
  VIDEO_EXT,
  youtubeId,
  type GalleryItem,
} from "@/lib/gallery";

/** Một mục trong khung ảnh minh họa đang soạn: đã lưu / file mới chọn (chưa tải) / link YouTube. */
export type MediaDraft =
  | { kind: "saved"; item: GalleryItem }
  | { kind: "file"; file: File; type: "image" | "video"; preview: string }
  | { kind: "youtube"; id: string };

const mb = (n: number) => (n / 1048576).toFixed(1);
const extOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";

/**
 * Logo ứng dụng + tối đa 4 ảnh / video minh họa (file hoặc YouTube). State nằm ở form cha — form tải file lên
 * Storage khi bấm Lưu rồi gửi logo_path / logo_remove / gallery_json.
 */
export function MediaFields({
  currentLogo,
  logo,
  setLogo,
  logoRemove,
  setLogoRemove,
  items,
  setItems,
  onError,
}: {
  currentLogo: string | null;
  logo: File | null;
  setLogo: (f: File | null) => void;
  logoRemove: boolean;
  setLogoRemove: (v: boolean) => void;
  items: MediaDraft[];
  setItems: (fn: (prev: MediaDraft[]) => MediaDraft[]) => void;
  onError: (m: string | null) => void;
}) {
  const [yt, setYt] = useState("");
  const [fileKey, setFileKey] = useState(0);
  const full = items.length >= MAX_GALLERY;
  const logoPreview = logo ? URL.createObjectURL(logo) : !logoRemove ? currentLogo : null;

  function pickLogo(f: File | null) {
    onError(null);
    if (f && !["png", "jpg", "jpeg", "webp"].includes(extOf(f.name))) return onError("Logo phải là ảnh PNG / JPG / WebP.");
    if (f && f.size > MAX_LOGO_BYTES) return onError(`Logo ${mb(f.size)}MB — tối đa 2MB.`);
    setLogo(f);
    if (f) setLogoRemove(false);
  }

  function addFiles(list: FileList | null) {
    onError(null);
    if (!list) return;
    const add: MediaDraft[] = [];
    for (const f of Array.from(list)) {
      const ext = extOf(f.name);
      const type = IMAGE_EXT.includes(ext) ? "image" : VIDEO_EXT.includes(ext) ? "video" : null;
      if (!type) return onError(`“${f.name}”: chỉ nhận ảnh PNG / JPG / WebP / GIF hoặc video MP4 / WebM.`);
      const max = type === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
      if (f.size > max) return onError(`“${f.name}” ${mb(f.size)}MB — ${type === "image" ? "ảnh tối đa 10MB" : "video tối đa 50MB"}.`);
      add.push({ kind: "file", file: f, type, preview: URL.createObjectURL(f) });
    }
    setItems((prev) => {
      if (prev.length + add.length > MAX_GALLERY) {
        onError(`Tối đa ${MAX_GALLERY} ảnh / video — đang có ${prev.length}.`);
        return prev;
      }
      return [...prev, ...add];
    });
    setFileKey((k) => k + 1);
  }

  function addYoutube() {
    onError(null);
    const id = youtubeId(yt);
    if (!id) return onError("Link YouTube không hợp lệ (vd https://www.youtube.com/watch?v=… hoặc https://youtu.be/…).");
    setItems((prev) => (prev.length >= MAX_GALLERY ? prev : [...prev, { kind: "youtube", id }]));
    setYt("");
  }

  const move = (i: number, d: -1 | 1) =>
    setItems((prev) => {
      const j = i + d;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="grid gap-5 rounded-lg border border-border bg-surface-hover/40 p-4 sm:grid-cols-[180px_minmax(0,1fr)]">
      <div>
        <div className="mb-2 text-sm font-semibold text-text">Logo ứng dụng</div>
        <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-2xl border border-accent/30 bg-accent/10 text-3xl text-accent">
          {logoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoPreview} alt="Logo" className="h-full w-full object-cover" />
          ) : (
            "✦"
          )}
        </div>
        <label className="mt-2 inline-block cursor-pointer text-xs font-semibold text-brand hover:text-brand-hover">
          {logoPreview ? "Đổi logo" : "Tải logo"}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pickLogo(e.target.files?.[0] ?? null)} />
        </label>
        {logoPreview && (
          <button
            type="button"
            onClick={() => {
              setLogo(null);
              setLogoRemove(!!currentLogo);
            }}
            className="ml-3 text-xs text-text-faint hover:text-danger"
          >
            Xóa
          </button>
        )}
        <p className="mt-1 text-[11px] leading-4 text-text-faint">Ảnh vuông ≥ 256px, PNG / JPG / WebP, ≤ 2MB. Không có logo → icon mặc định.</p>
      </div>

      <div className="min-w-0">
        <div className="mb-2 text-sm font-semibold text-text">
          Ảnh / video minh họa <span className="font-normal text-text-faint">({items.length}/{MAX_GALLERY})</span>
        </div>
        {items.length > 0 && (
          <ul className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {items.map((d, i) => (
              <li key={i} className="relative overflow-hidden rounded-lg border border-border bg-bg-elevated">
                <Thumb d={d} />
                <div className="flex items-center justify-between gap-1 border-t border-border px-1.5 py-1 text-[11px]">
                  <span className="truncate text-text-faint">
                    {d.kind === "youtube" ? "YouTube" : d.kind === "file" ? (d.type === "video" ? "Video mới" : "Ảnh mới") : d.item.type === "video" ? "Video" : d.item.type === "youtube" ? "YouTube" : "Ảnh"}
                  </span>
                  <span className="flex shrink-0 gap-1.5">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-text-muted hover:text-text disabled:opacity-30" aria-label="Lên trước">
                      ←
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-text-muted hover:text-text disabled:opacity-30" aria-label="Ra sau">
                      →
                    </button>
                    <button type="button" onClick={() => setItems((prev) => prev.filter((_, k) => k !== i))} className="text-text-faint hover:text-danger" aria-label="Xóa">
                      ✕
                    </button>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {!full && (
          <div className="flex flex-wrap items-center gap-2">
            <label className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-sm text-text hover:border-accent">
              + Ảnh / video
              <input
                key={fileKey}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm"
                className="hidden"
                onChange={(e) => addFiles(e.target.files)}
              />
            </label>
            <input
              value={yt}
              onChange={(e) => setYt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addYoutube();
                }
              }}
              placeholder="hoặc dán link YouTube"
              className="min-w-0 flex-1 rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-sm text-text focus:border-accent focus:outline-none"
            />
            <button type="button" onClick={addYoutube} className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:border-accent">
              Thêm
            </button>
          </div>
        )}
        <p className="mt-2 text-[11px] leading-4 text-text-faint">
          Hiện sau ảnh bìa trên trang sản phẩm (khung lớn + hàng thumbnail). Ảnh ≤ 10MB; video MP4 / WebM ≤ 50MB, nên ngắn (≤ 1 phút) —
          video dài dùng link YouTube. Mũi tên ← → để đổi thứ tự.
        </p>
      </div>
    </div>
  );
}

function Thumb({ d }: { d: MediaDraft }) {
  const box = "aspect-video w-full object-cover";
  if (d.kind === "youtube" || (d.kind === "saved" && d.item.type === "youtube")) {
    const id = d.kind === "youtube" ? d.id : (d.item as { id: string }).id;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="YouTube" className={box} />;
  }
  const src = d.kind === "file" ? d.preview : (d.item as { url: string }).url;
  const isVideo = d.kind === "file" ? d.type === "video" : d.item.type === "video";
  return isVideo ? (
    <video src={src} muted preload="metadata" className={box} />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={box} />
  );
}

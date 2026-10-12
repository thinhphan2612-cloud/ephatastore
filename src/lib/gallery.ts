/**
 * Ảnh / video minh họa trang sản phẩm (cột products.gallery, jsonb) — tối đa 4 mục.
 * Dùng chung server (kiểm khi lưu) + client (form admin, khung xem). Dữ liệu cũ dạng string[] = ảnh.
 */
export type GalleryItem = { type: "image" | "video"; url: string } | { type: "youtube"; id: string };

export const MAX_GALLERY = 4;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_LOGO_BYTES = 2 * 1024 * 1024;
export const IMAGE_EXT = ["png", "jpg", "jpeg", "webp", "gif"];
export const VIDEO_EXT = ["mp4", "webm"];

/** Mã video từ link YouTube (watch?v=, youtu.be/, shorts/, embed/) hoặc chính mã 11 ký tự; null nếu không hợp lệ. */
export function youtubeId(input: string): string | null {
  const s = input.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
    else if (host === "youtube.com" || host === "youtube-nocookie.com")
      id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)?.[1] ?? null;
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Đọc cột gallery (an toàn với dữ liệu cũ / sai): bỏ mục hỏng, tối đa 4. */
export function parseGallery(raw: unknown): GalleryItem[] {
  if (!Array.isArray(raw)) return [];
  const out: GalleryItem[] = [];
  for (const it of raw) {
    if (typeof it === "string" && /^https:\/\//.test(it)) out.push({ type: "image", url: it });
    else if (it && typeof it === "object") {
      const o = it as Record<string, unknown>;
      if ((o.type === "image" || o.type === "video") && typeof o.url === "string" && /^https:\/\//.test(o.url))
        out.push({ type: o.type, url: o.url });
      else if (o.type === "youtube" && typeof o.id === "string" && /^[A-Za-z0-9_-]{11}$/.test(o.id))
        out.push({ type: "youtube", id: o.id });
    }
    if (out.length >= MAX_GALLERY) break;
  }
  return out;
}

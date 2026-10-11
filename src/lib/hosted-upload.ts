import JSZip from "jszip";
import { createStoreAuthBrowserClient } from "@/lib/supabase/store-auth-browser";
import { createGameUploadTokens } from "@/lib/actions/game-upload";
import { unwrap } from "@/lib/action-result";

/**
 * Tải bản build game / công cụ web (.zip) lên bucket 'games' — chạy ở TRÌNH DUYỆT.
 * Giải nén, bóc lớp thư mục ngoài (index.html nông nhất là gốc), tải từng file qua signed upload URL.
 * Dùng chung cho form tạo mới và khung "Bản build mới" ở trang Sửa.
 */

/** Content-type lưu kèm file (Storage trả đúng loại khi tải qua link ký). */
const MIME: Record<string, string> = {
  html: "text/html",
  htm: "text/html",
  js: "text/javascript",
  mjs: "text/javascript",
  css: "text/css",
  json: "application/json",
  txt: "text/plain",
  xml: "application/xml",
  wasm: "application/wasm",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  flac: "audio/flac",
  mp4: "video/mp4",
  webm: "video/webm",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
};
export const mimeOf = (p: string) =>
  MIME[p.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";

/** Supabase gói Free: tối đa 50MB / file. */
const MAX_FILE_BYTES = 50 * 1024 * 1024;
/** File trả qua function (src/app/g/…/route.ts PROXY) — Vercel giới hạn response ~4.5MB. */
const PROXY_EXT = new Set(["html", "htm", "js", "mjs", "css", "json"]);
const MAX_PROXY_BYTES = 4 * 1024 * 1024;
/** Tên file an toàn cho key Storage (không dấu). */
const SAFE_PATH = /^[A-Za-z0-9._\-/ ()+@]+$/;

export async function uploadHostedBuild(
  zipFile: File,
  onProgress: (msg: string) => void
): Promise<{ gameId: string }> {
  onProgress("Đang giải nén…");
  const zip = await JSZip.loadAsync(zipFile);

  // Gom file (bỏ thư mục + rác macOS); index.html nông nhất là gốc của bản build.
  const entries = Object.values(zip.files).filter(
    (f) => !f.dir && !f.name.includes("__MACOSX") && !f.name.endsWith(".DS_Store")
  );
  const idx = entries
    .filter((f) => f.name.replace(/\\/g, "/").toLowerCase().split("/").pop() === "index.html")
    .sort((a, b) => a.name.length - b.name.length)[0];
  if (!idx) throw new Error("Không tìm thấy index.html trong file .zip.");
  const base = idx.name.slice(0, idx.name.length - "index.html".length);

  const files = entries
    .filter((f) => f.name.startsWith(base))
    // chuẩn hoá "\" → "/" để zip nén trên Windows không hỏng đường dẫn con
    .map((f) => ({ rel: f.name.slice(base.length).replace(/\\/g, "/"), entry: f }))
    .filter((f) => f.rel.length > 0);

  // Kiểm TRƯỚC khi tạo link upload (trước đây file quá lớn chỉ lộ ra giữa chừng, để lại bản build dở dang).
  if (!files.some((f) => f.rel === "index.html"))
    throw new Error("File gốc phải tên đúng “index.html” (chữ thường) — đổi tên rồi nén lại.");
  const bad = files.find((f) => !SAFE_PATH.test(f.rel));
  if (bad) throw new Error(`Tên file “${bad.rel}” có dấu / ký tự đặc biệt — đổi tên không dấu (a–z, 0–9, . _ -) rồi nén lại.`);
  onProgress("Đang kiểm tra file…");
  const blobs = new Map<string, Blob>();
  for (const f of files) {
    // Blob PHẢI mang type: storage-js gửi Blob qua FormData và lấy content-type từ blob.type
    // (bỏ qua tùy chọn contentType) — thiếu type thì mọi file thành application/octet-stream.
    const blob = new Blob([await f.entry.async("arraybuffer")], { type: mimeOf(f.rel) });
    if (blob.size > MAX_FILE_BYTES) throw new Error(`File ${f.rel} ${(blob.size / 1048576).toFixed(1)}MB — tối đa 50MB / file.`);
    // html/js/css/json phục vụ qua function (cùng origin) — Vercel giới hạn response ~4.5MB → file lớn hơn sẽ trắng màn hình.
    if (PROXY_EXT.has(f.rel.split(".").pop()?.toLowerCase() ?? "") && blob.size > MAX_PROXY_BYTES)
      throw new Error(
        `File ${f.rel} ${(blob.size / 1048576).toFixed(1)}MB — file html/js/css/json tối đa 4MB. Tách nhỏ bundle (code-split) hoặc đưa dữ liệu lớn ra file ảnh / nhị phân.`
      );
    blobs.set(f.rel, blob);
  }

  onProgress("Đang chuẩn bị tải lên…");
  const { gameId, tokens } = unwrap(await createGameUploadTokens(files.map((f) => f.rel)));
  const tokenMap = new Map(tokens.map((t) => [t.path, t.token]));

  const storage = createStoreAuthBrowserClient().storage.from("games");
  let done = 0;
  for (const f of files) {
    const { error } = await storage.uploadToSignedUrl(`${gameId}/${f.rel}`, tokenMap.get(f.rel)!, blobs.get(f.rel)!, {
      upsert: true,
    });
    if (error) throw new Error(`Lỗi tải ${f.rel}: ${error.message}`);
    done++;
    onProgress(`Đang tải lên… ${done}/${files.length}`);
  }
  return { gameId };
}

#!/usr/bin/env node
// Ephata App Kit — sinh bộ ảnh chuẩn + kiểm thư mục bàn giao. Xem export.md.
//
// Cài 1 lần trong dự án:  npm i -D sharp
//
// Sinh ảnh:
//   node tools/app-kit/export/make-images.mjs build --out release/<slug>-<version> \
//     --cover art/cover.png --icon art/icon-1024.png --shots art/screenshots [--msstore] [--bg "#0b0d10"] \
//     [--poster art/poster.png] [--box art/box.png]      (Microsoft Store: poster 2:3, box art 1:1 — không có thì tự dựng từ icon)
// Kiểm trước khi đưa lên:
//   node tools/app-kit/export/make-images.mjs check release/<slug>-<version>
//
// build: ảnh bìa cắt giữa về 1600×900; logo 512×512; ảnh chụp đặt vừa khung 1920×1080 (không cắt, phần thừa tô màu --bg).
// check: kiểm kích thước / định dạng / dung lượng mọi file trong thư mục bàn giao, có lỗi thì thoát mã 1.

import fs from "node:fs";
import path from "node:path";

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error('Thiếu thư viện sharp — chạy "npm i -D sharp" trong dự án rồi chạy lại.');
  process.exit(2);
}

const MB = 1024 * 1024;
const IMG = /\.(png|jpe?g|webp|gif)$/i;

// ---- Chuẩn kích thước (khớp export.md) ----
const SPEC = {
  cover: { w: 1600, h: 900, max: 5 * MB },
  logo: { w: 512, h: 512, max: 2 * MB },
  media: { w: 1920, h: 1080, max: 10 * MB, maxVideo: 50 * MB, count: 4 },
  pkg: { "StoreLogo.png": 50, "Square44x44Logo.png": 44, "Square150x150Logo.png": 150 },
  // Partner Center → Store listing: "Store display images" (1:1, Windows 10/11) + "Store logos" (poster 2:3, box art 1:1).
  tiles: { "app-tile-300.png": 300, "tile-150.png": 150, "tile-71.png": 71 },
  poster: [{ w: 720, h: 1080 }, { w: 1440, h: 2160 }],
  box: [{ w: 1080, h: 1080 }, { w: 2160, h: 2160 }],
  shot: { w: 1920, h: 1080, minW: 1366, minH: 768, max: 50 * MB, count: 10 },
  hero: { w: 1920, h: 1080 },
  upload: 50 * MB, // giới hạn mỗi file tải lên Ephata (bộ cài, file tải về, build.zip)
};

const errors = [];
const warns = [];
const err = (m) => errors.push(m);
const warn = (m) => warns.push(m);
const rel = (p) => path.relative(process.cwd(), p) || p;

function args(list) {
  const o = { _: [] };
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const v = list[i + 1];
      if (v === undefined || v.startsWith("--")) o[k] = true;
      else (o[k] = v), i++;
    } else o._.push(a);
  }
  return o;
}

const listImages = (dir) =>
  fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => IMG.test(f)).sort().map((f) => path.join(dir, f))
    : [];

async function meta(file) {
  const m = await sharp(file).metadata();
  return { w: m.width, h: m.height, format: m.format };
}

// ---------------------------------------------------------------- build
async function build(o) {
  if (!o.out) throw new Error("Thiếu --out <thư mục bàn giao>");
  const out = path.resolve(o.out);
  const bg = o.bg || "#0b0d10";
  const eph = path.join(out, "ephata");
  fs.mkdirSync(path.join(eph, "media"), { recursive: true });

  if (o.cover) {
    const m = await meta(o.cover);
    if (m.w < SPEC.cover.w || m.h < SPEC.cover.h) warn(`Ảnh bìa gốc ${m.w}×${m.h} nhỏ hơn 1600×900 → bị phóng to, có thể mờ.`);
    if (Math.abs(m.w / m.h - 16 / 9) > 0.02) warn(`Ảnh bìa gốc tỉ lệ ${m.w}×${m.h} ≠ 16:9 → đã cắt giữa; kiểm lại ${rel(path.join(eph, "cover.jpg"))}.`);
    await sharp(o.cover)
      .resize(SPEC.cover.w, SPEC.cover.h, { fit: "cover", position: "centre" })
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(path.join(eph, "cover.jpg"));
  } else warn("Không có --cover: bỏ qua ảnh bìa.");

  if (o.icon) {
    const m = await meta(o.icon);
    if (m.w !== m.h) warn(`Icon gốc ${m.w}×${m.h} không vuông → đã đặt vừa khung vuông, nền trong suốt.`);
    if (Math.min(m.w, m.h) < 1024) warn(`Icon gốc ${m.w}×${m.h} nhỏ hơn 1024×1024 → icon cỡ lớn có thể mờ.`);
    const square = (size) =>
      sharp(o.icon).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png();
    await square(SPEC.logo.w).toFile(path.join(eph, "logo.png"));
    if (o.msstore) {
      const pkg = path.join(out, "msstore", "package-logos");
      const listing = path.join(out, "msstore", "listing");
      fs.mkdirSync(pkg, { recursive: true });
      fs.mkdirSync(listing, { recursive: true });
      for (const [name, size] of Object.entries(SPEC.pkg)) await square(size).toFile(path.join(pkg, name));
      for (const [name, size] of Object.entries(SPEC.tiles)) await square(size).toFile(path.join(listing, name));
      // Poster 2:3 + Box art 1:1: dùng ảnh thiết kế riêng nếu có; không thì đặt icon lên nền --bg ở 2/3 trên
      // (Store có thể phủ chữ lên 1/3 dưới). Ảnh tự dựng chỉ là tạm — nên thiết kế riêng, có tên sản phẩm ở 2/3 trên.
      const art = async (src, w, h, file, label) => {
        if (src) {
          const m = await meta(src);
          if (Math.abs(m.w / m.h - w / h) > 0.02) warn(`${label} gốc ${m.w}×${m.h} khác tỉ lệ ${w}:${h} → đã cắt giữa; kiểm lại ${file}.`);
          return sharp(src).resize(w, h, { fit: "cover", position: "centre" }).flatten({ background: bg }).png().toFile(path.join(listing, file));
        }
        const size = Math.round(Math.min(w, h) * 0.56);
        const iconBuf = await square(size).toBuffer();
        // Nền 3 kênh (không trong suốt) — sharp áp composite sau cùng nên flatten không có tác dụng ở đây.
        const composed = await sharp({ create: { width: w, height: h, channels: 3, background: bg } })
          .composite([{ input: iconBuf, left: Math.round((w - size) / 2), top: Math.round(h * 0.36 - size / 2) }])
          .png()
          .toBuffer();
        await sharp(composed).flatten({ background: bg }).png().toFile(path.join(listing, file));
        warn(`${file}: tự dựng từ icon trên nền màu — nên thay bằng ảnh thiết kế riêng (--${label === "Poster" ? "poster" : "box"}).`);
      };
      await art(o.poster, 720, 1080, "poster-720x1080.png", "Poster");
      await art(o.box, 1080, 1080, "box-art-1080.png", "Box art");
    }
  } else warn("Không có --icon: bỏ qua logo" + (o.msstore ? " và logo Microsoft Store." : "."));

  const shots = o.shots ? listImages(o.shots) : [];
  if (o.shots && !shots.length) warn(`Không thấy ảnh PNG / JPG / WebP trong ${o.shots}.`);
  const seen = new Set(); // mỗi ảnh gốc chỉ cảnh báo 1 lần (dùng cho cả Ephata lẫn Microsoft Store)
  const fit = async (src, dest) => {
    const m = await meta(src);
    if (!seen.has(src)) {
      seen.add(src);
      if (Math.max(m.w, m.h) < SPEC.shot.minW || Math.min(m.w, m.h) < SPEC.shot.minH)
        warn(`${path.basename(src)} ${m.w}×${m.h} nhỏ hơn 1366×768 → chụp lại ở độ phân giải cao hơn (sẽ bị mờ).`);
      if (Math.abs(m.w / m.h - 16 / 9) > 0.02)
        warn(`${path.basename(src)} ${m.w}×${m.h} không phải 16:9 → đặt vừa khung 1920×1080, phần thừa tô màu nền (--bg).`);
    }
    await sharp(src).resize(SPEC.shot.w, SPEC.shot.h, { fit: "contain", background: bg }).flatten({ background: bg }).png().toFile(dest);
  };
  for (const [i, src] of shots.slice(0, SPEC.media.count).entries())
    await fit(src, path.join(eph, "media", `${String(i + 1).padStart(2, "0")}.png`));
  if (shots.length > SPEC.media.count) warn(`Ephata nhận tối đa 4 minh họa — chỉ lấy 4 ảnh đầu (sắp theo tên file).`);
  if (o.msstore && shots.length) {
    const dir = path.join(out, "msstore", "listing", "screenshots");
    fs.mkdirSync(dir, { recursive: true });
    for (const [i, src] of shots.slice(0, SPEC.shot.count).entries())
      await fit(src, path.join(dir, `${String(i + 1).padStart(2, "0")}.png`));
  }

  console.log(`Đã sinh ảnh vào ${rel(out)}`);
  await check(out);
}

// ---------------------------------------------------------------- check
async function expectImage(file, { w, h, max, label, png }) {
  if (!fs.existsSync(file)) return false;
  const size = fs.statSync(file).size;
  const m = await meta(file);
  if (m.w !== w || m.h !== h) err(`${label} ${rel(file)}: ${m.w}×${m.h}, cần đúng ${w}×${h}.`);
  if (png && m.format !== "png") err(`${label} ${rel(file)}: phải là PNG (đang là ${m.format}).`);
  if (max && size > max) err(`${label} ${rel(file)}: ${(size / MB).toFixed(1)}MB, tối đa ${max / MB}MB.`);
  return true;
}

function expectUpload(dir, label) {
  if (!fs.existsSync(dir)) return 0;
  const files = fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile());
  for (const f of files) {
    const size = fs.statSync(path.join(dir, f)).size;
    if (size <= SPEC.upload) continue;
    const msg = `${label} ${rel(path.join(dir, f))}: ${(size / MB).toFixed(1)}MB — Ephata nhận tối đa 50MB mỗi file.`;
    // build.zip của loại 2 được bung ra và tải từng file → giới hạn tính theo file bên trong (types/hosted.md).
    if (label === "File giao" && /\.zip$/i.test(f)) warn(msg + " Nếu là build.zip loại 2 thì bỏ qua (giới hạn tính theo từng file bên trong).");
    else err(msg);
  }
  return files.length;
}

async function check(dirArg) {
  const out = path.resolve(dirArg);
  if (!fs.existsSync(out)) throw new Error(`Không có thư mục ${dirArg}`);
  const eph = path.join(out, "ephata");

  // Ephata
  const cover = ["cover.jpg", "cover.webp", "cover.png"].map((f) => path.join(eph, f)).find((f) => fs.existsSync(f));
  if (!cover) err("Thiếu ephata/cover.jpg (ảnh bìa 1600×900) — bắt buộc để thẻ sản phẩm có ảnh.");
  else await expectImage(cover, { ...SPEC.cover, label: "Ảnh bìa" });
  if (!(await expectImage(path.join(eph, "logo.png"), { ...SPEC.logo, label: "Logo" })))
    warn("Không có ephata/logo.png — trang sản phẩm sẽ dùng icon mặc định.");
  const mediaDir = path.join(eph, "media");
  const media = fs.existsSync(mediaDir) ? fs.readdirSync(mediaDir).sort() : [];
  if (media.length > SPEC.media.count) err(`ephata/media có ${media.length} file — Ephata nhận tối đa 4.`);
  for (const f of media) {
    const p = path.join(mediaDir, f);
    if (IMG.test(f)) await expectImage(p, { ...SPEC.media, label: "Minh họa" });
    else if (/\.(mp4|webm)$/i.test(f)) {
      const size = fs.statSync(p).size;
      if (size > SPEC.media.maxVideo) err(`Video ${rel(p)}: ${(size / MB).toFixed(1)}MB, tối đa 50MB — video dài dùng link YouTube.`);
    } else if (!/\.txt$/i.test(f)) err(`ephata/media/${f}: chỉ nhận PNG / JPG / WebP / GIF / MP4 / WebM (link YouTube ghi vào youtube.txt).`);
  }
  if (!fs.existsSync(path.join(eph, "listing.md"))) err("Thiếu ephata/listing.md (thông tin điền form admin — mẫu trong export.md).");
  const desc = path.join(eph, "description.html");
  if (!fs.existsSync(desc)) err("Thiếu ephata/description.html (mô tả chi tiết theo description.md).");
  else if (fs.readFileSync(desc, "utf8").length > 100_000) err("description.html dài quá 100.000 ký tự.");

  // Microsoft Store (loại 5, nếu có)
  const ms = path.join(out, "msstore");
  if (fs.existsSync(ms)) {
    for (const [name, size] of Object.entries(SPEC.pkg))
      if (!(await expectImage(path.join(ms, "package-logos", name), { w: size, h: size, png: true, label: "Logo gói MSIX" })))
        err(`Thiếu msstore/package-logos/${name} (${size}×${size}) — pack.ps1 cần đủ 3 logo.`);
    for (const [name, size] of Object.entries(SPEC.tiles))
      if (!(await expectImage(path.join(ms, "listing", name), { w: size, h: size, png: true, label: "Store display image" })))
        warn(`Không có msstore/listing/${name} (${size}×${size}) — không có thì Store dùng logo trong gói; Microsoft khuyên nên có.`);
    // Poster / Box art: nhận 1 trong 2 kích thước Partner Center cho phép; bắt buộc nếu bán trên Xbox.
    const pick = (re) => (fs.existsSync(path.join(ms, "listing")) ? fs.readdirSync(path.join(ms, "listing")).filter((f) => re.test(f)) : []);
    for (const [label, re, sizes] of [["Poster art (2:3)", /^poster.*\.png$/i, SPEC.poster], ["Box art (1:1)", /^box-art.*\.png$/i, SPEC.box]]) {
      const files = pick(re);
      if (!files.length) warn(`Không có ${label} trong msstore/listing/ — chỉ bắt buộc khi bán trên Xbox, nhưng nên có cho trang Store đẹp.`);
      for (const f of files) {
        const m = await meta(path.join(ms, "listing", f));
        if (m.format !== "png") err(`${label} msstore/listing/${f}: phải là PNG.`);
        if (!sizes.some((z) => z.w === m.w && z.h === m.h))
          err(`${label} msstore/listing/${f}: ${m.w}×${m.h}, cần ${sizes.map((z) => `${z.w}×${z.h}`).join(" hoặc ")}.`);
      }
    }
    const shots = listImages(path.join(ms, "listing", "screenshots"));
    if (!shots.length) err("Microsoft Store cần ít nhất 1 ảnh chụp (msstore/listing/screenshots/, PNG ≥ 1366×768); khuyên ≥ 4.");
    if (shots.length > SPEC.shot.count) err(`Microsoft Store nhận tối đa 10 ảnh chụp (đang có ${shots.length}).`);
    for (const p of shots) {
      const m = await meta(p);
      if (m.format !== "png") err(`Ảnh chụp ${rel(p)}: Microsoft Store chỉ nhận PNG.`);
      if (m.w < SPEC.shot.minW || m.h < SPEC.shot.minH) err(`Ảnh chụp ${rel(p)}: ${m.w}×${m.h}, tối thiểu 1366×768.`);
      if (fs.statSync(p).size > SPEC.shot.max) err(`Ảnh chụp ${rel(p)}: quá 50MB.`);
    }
    await expectImage(path.join(ms, "listing", "hero-1920x1080.png"), { ...SPEC.hero, png: true, label: "Hero" });
    if (!fs.readdirSync(ms).some((f) => /\.msix(bundle)?$/i.test(f))) warn("Chưa có file .msix trong msstore/ (đóng gói bằng msstore/pack.ps1).");
  }

  // File tải lên Ephata
  const installers = expectUpload(path.join(out, "installers"), "Bộ cài");
  const deliverable = expectUpload(path.join(out, "deliverable"), "File giao");
  if (!installers && !deliverable) warn("Chưa có installers/ (loại 5) hoặc deliverable/ (loại 1–4) — xem export.md.");

  for (const w of warns) console.log("CẢNH BÁO  " + w);
  for (const e of errors) console.log("LỖI       " + e);
  console.log(errors.length ? `\n✗ ${errors.length} lỗi — sửa rồi chạy lại.` : `\n✓ Bộ bàn giao hợp lệ (${warns.length} cảnh báo).`);
  if (errors.length) process.exitCode = 1;
}

const o = args(process.argv.slice(2));
const cmd = o._[0];
try {
  if (cmd === "build") await build(o);
  else if (cmd === "check" && o._[1]) await check(o._[1]);
  else {
    console.log("Dùng: make-images.mjs build --out <thư mục> [--cover f] [--icon f] [--shots dir] [--msstore] [--poster f] [--box f] [--bg màu]");
    console.log("      make-images.mjs check <thư mục>");
    process.exitCode = 2;
  }
} catch (e) {
  console.error("LỖI  " + (e instanceof Error ? e.message : e));
  process.exitCode = 1;
}

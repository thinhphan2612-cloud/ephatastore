"use client";

import { useRef, useState } from "react";
import type { GalleryItem } from "@/lib/gallery";

type Slide = GalleryItem & { cover?: boolean };

/**
 * Khung ảnh minh họa trang sản phẩm: ảnh bìa là slide đầu + tối đa 4 ảnh / video / YouTube.
 * Khung lớn + hàng thumbnail; mũi tên, phím ← →, vuốt trên điện thoại. Video không tự phát;
 * YouTube chỉ nạp iframe (youtube-nocookie) khi người dùng bấm — trang không nặng thêm.
 */
export function MediaGallery({
  title,
  coverUrl,
  items,
  fallback,
}: {
  title: string;
  coverUrl?: string;
  items: GalleryItem[];
  /** Hiện khi không có ảnh bìa lẫn ảnh minh họa (logo / icon trên nền mặc định). */
  fallback: React.ReactNode;
}) {
  const slides: Slide[] = [...(coverUrl ? [{ type: "image" as const, url: coverUrl, cover: true }] : []), ...items];
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState<number | null>(null);
  const touchX = useRef<number | null>(null);

  if (!slides.length) {
    return (
      <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-3xl border border-border">
        <div className="media-placeholder absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/50" />
        <div className="relative z-10">{fallback}</div>
      </div>
    );
  }

  const go = (n: number) => {
    setPlaying(null);
    setI((n + slides.length) % slides.length);
  };
  const s = slides[i];
  const many = slides.length > 1;

  return (
    <div className="space-y-3">
      <div
        className="group relative aspect-video overflow-hidden rounded-3xl border border-border bg-black outline-none focus-visible:ring-2 focus-visible:ring-accent"
        tabIndex={many ? 0 : -1}
        aria-roledescription="carousel"
        aria-label={`Ảnh minh họa ${title}`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(i + 1);
          if (e.key === "ArrowLeft") go(i - 1);
        }}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        }}
      >
        {s.type === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.url}
            alt={s.cover ? `Ảnh bìa ${title}` : `Ảnh minh họa ${i + 1} — ${title}`}
            className={`h-full w-full ${s.cover ? "object-cover" : "object-contain"}`}
          />
        )}
        {s.type === "video" && (
          <video key={s.url} src={s.url} controls playsInline preload="metadata" className="h-full w-full object-contain" />
        )}
        {s.type === "youtube" &&
          (playing === i ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${s.id}?autoplay=1&rel=0`}
              title={`Video ${title}`}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="h-full w-full"
            />
          ) : (
            <button type="button" onClick={() => setPlaying(i)} className="relative h-full w-full" aria-label="Phát video YouTube">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${s.id}/hqdefault.jpg`} alt="" className="h-full w-full object-cover" />
              <span className="absolute inset-0 grid place-items-center bg-black/25">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-black/70 text-2xl text-white ring-1 ring-white/30 transition group-hover:scale-105">
                  ▶
                </span>
              </span>
            </button>
          ))}

        {many && (
          <>
            <button
              type="button"
              onClick={() => go(i - 1)}
              aria-label="Ảnh trước"
              className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-lg text-white opacity-0 ring-1 ring-white/20 transition hover:bg-black/75 focus:opacity-100 group-hover:opacity-100 max-md:opacity-100"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => go(i + 1)}
              aria-label="Ảnh sau"
              className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-lg text-white opacity-0 ring-1 ring-white/20 transition hover:bg-black/75 focus:opacity-100 group-hover:opacity-100 max-md:opacity-100"
            >
              ›
            </button>
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white">
              {i + 1} / {slides.length}
            </span>
          </>
        )}
      </div>

      {many && (
        <div className="grid grid-cols-5 gap-2">
          {slides.map((t, k) => (
            <button
              key={k}
              type="button"
              onClick={() => go(k)}
              aria-label={`Xem ${t.type === "image" ? "ảnh" : "video"} ${k + 1}`}
              aria-current={k === i}
              className={`relative aspect-video overflow-hidden rounded-xl border bg-black transition ${
                k === i ? "border-accent ring-1 ring-accent" : "border-border opacity-70 hover:opacity-100"
              }`}
            >
              {t.type === "youtube" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`https://i.ytimg.com/vi/${t.id}/mqdefault.jpg`} alt="" className="h-full w-full object-cover" />
              ) : t.type === "video" ? (
                <video src={t.url} muted preload="metadata" className="h-full w-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.url} alt="" className="h-full w-full object-cover" />
              )}
              {t.type !== "image" && (
                <span className="absolute inset-0 grid place-items-center text-sm text-white [text-shadow:0_1px_6px_rgba(0,0,0,0.8)]">▶</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { useRef } from "react";

export function GameFrame({ src, title }: { src: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);

  function fullscreen() {
    const el = ref.current;
    if (el?.requestFullscreen) el.requestFullscreen();
  }

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-black">
      <button
        type="button"
        onClick={fullscreen}
        title="Toàn màn hình"
        className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-black/70"
      >
        ⛶ Toàn màn hình
      </button>
      <iframe
        ref={ref}
        src={src}
        title={title}
        className="h-[78vh] w-full"
        allow="fullscreen; autoplay"
      />
    </div>
  );
}

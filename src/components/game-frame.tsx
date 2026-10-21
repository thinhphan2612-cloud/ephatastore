"use client";

import { useRef } from "react";

export function GameFrame({ src, title, microphone = false }: { src: string; title: string; microphone?: boolean }) {
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
        // Micro chỉ cho app bật "App cần micro" trên admin: mọi app chung origin play → quyền đã cấp dùng chung.
        allow={microphone ? "fullscreen; autoplay; microphone" : "fullscreen; autoplay"}
        // Code bên thứ ba: không cho tự điều hướng trang store (chỉ khi người dùng bấm, vd link Nạp point).
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-pointer-lock allow-downloads allow-top-navigation-by-user-activation"
      />
    </div>
  );
}

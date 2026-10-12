"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

type Pref = "system" | "light" | "dark";
const OPTIONS: { key: Pref; label: string; icon: string }[] = [
  { key: "system", label: "Theo máy", icon: "◐" },
  { key: "light", label: "Sáng", icon: "☀" },
  { key: "dark", label: "Tối", icon: "☾" },
];

// Lựa chọn nằm ở <html data-theme-pref> (script đầu trang đặt trước khi vẽ) → đọc thẳng từ DOM, không chép sang state.
function subscribe(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-theme-pref"] });
  return () => mo.disconnect();
}
const readPref = (): Pref => {
  const p = document.documentElement.dataset.themePref;
  return p === "light" || p === "dark" ? p : "system";
};

declare global {
  interface Window {
    __ephataApplyTheme?: () => void;
  }
}

function choose(p: Pref) {
  try {
    if (p === "system") localStorage.removeItem("ephata_theme");
    else localStorage.setItem("ephata_theme", p);
  } catch {}
  if (window.__ephataApplyTheme) return window.__ephataApplyTheme();
  // Dự phòng khi script đầu trang chưa chạy.
  const root = document.documentElement;
  const light = p === "light" || (p === "system" && matchMedia("(prefers-color-scheme: light)").matches);
  root.dataset.themePref = p;
  if (light) {
    root.dataset.theme = "light";
    root.style.colorScheme = "light";
  } else {
    delete root.dataset.theme;
    root.style.colorScheme = "dark";
  }
}

export function ThemeToggle() {
  const pref = useSyncExternalStore(subscribe, readPref, () => "system" as const);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const current = OPTIONS.find((o) => o.key === pref) ?? OPTIONS[0];

  // Bấm ra ngoài / Esc → đóng menu.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Giao diện: ${current.label}`}
        title={`Giao diện: ${current.label}`}
        className="grid h-10 w-10 place-items-center rounded-xl border border-border-strong bg-surface text-base text-text-muted hover:border-accent/50 hover:text-text"
      >
        {current.icon}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Chọn giao diện"
          className="absolute right-0 top-12 z-50 w-40 overflow-hidden rounded-xl border border-border-strong bg-bg-elevated p-1 shadow-xl"
        >
          {OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              role="menuitemradio"
              aria-checked={o.key === pref}
              onClick={() => {
                choose(o.key);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm ${
                o.key === pref ? "bg-accent/15 font-semibold text-text" : "text-text-muted hover:bg-surface-hover hover:text-text"
              }`}
            >
              <span className="w-4 text-center" aria-hidden>
                {o.icon}
              </span>
              <span className="flex-1">{o.label}</span>
              {o.key === pref && (
                <span className="text-accent" aria-hidden>
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

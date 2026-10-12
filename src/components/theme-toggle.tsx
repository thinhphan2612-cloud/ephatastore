"use client";

import { useSyncExternalStore } from "react";

// Theme thật nằm ở <html data-theme> (script đầu trang đặt trước khi vẽ) → đọc thẳng từ DOM, không chép sang state.
function subscribe(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}
const readTheme = () => (document.documentElement.dataset.theme === "light" ? "light" : "dark");

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "dark" as const);

  function toggle() {
    const next = theme === "light" ? "dark" : "light";
    const root = document.documentElement;
    if (next === "light") {
      root.dataset.theme = "light";
      root.style.colorScheme = "light";
    } else {
      delete root.dataset.theme;
      root.style.colorScheme = "dark";
    }
    try {
      localStorage.setItem("ephata_theme", next);
    } catch {}
  }

  const isLight = theme === "light";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isLight ? "Chuyển giao diện tối" : "Chuyển giao diện sáng"}
      title={isLight ? "Giao diện tối" : "Giao diện sáng"}
      className="grid h-10 w-10 place-items-center rounded-xl border border-border-strong bg-white/5 text-base text-text-muted hover:border-accent/50 hover:text-text"
    >
      {isLight ? "☾" : "☀"}
    </button>
  );
}

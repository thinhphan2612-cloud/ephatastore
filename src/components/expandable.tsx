"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Khối nội dung dài: mặc định chỉ hiện phần đầu (cao tối đa `collapsedHeight` px) + lớp mờ + nút "Xem thêm".
 * Nội dung ngắn hơn khung thì hiện đủ, không có nút. Đo lại khi kích thước đổi (ảnh tải xong, xoay màn hình).
 */
export function Expandable({ children, collapsedHeight = 360 }: { children: React.ReactNode; collapsedHeight?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // +40: dư ít thì hiện đủ luôn, khỏi bắt bấm "Xem thêm" để đọc vài dòng cuối.
    const measure = () => setOverflows(el.scrollHeight > collapsedHeight + 40);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const child of el.children) ro.observe(child);
    return () => ro.disconnect();
  }, [collapsedHeight]);

  const clipped = overflows && !expanded;

  return (
    <div>
      <div className="relative">
        <div ref={ref} style={clipped ? { maxHeight: collapsedHeight, overflow: "hidden" } : undefined}>
          {children}
        </div>
        {clipped && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
            // Mờ về màu nền nơi đặt khối (--fade-bg do khung cha đặt; mặc định nền trang).
            style={{ background: "linear-gradient(to bottom, transparent, var(--fade-bg, var(--bg)))" }}
          />
        )}
      </div>
      {overflows && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => {
            setExpanded((v) => !v);
            // Thu gọn khi đang ở cuối bài → đưa người đọc về đầu khối thay vì để họ lạc ở giữa trang.
            if (expanded) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
          }}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-text hover:border-accent hover:text-accent"
        >
          {expanded ? "Thu gọn ▴" : "Xem thêm ▾"}
        </button>
      )}
    </div>
  );
}

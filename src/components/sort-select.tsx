"use client";

import { useRouter } from "next/navigation";

/** Ô sắp xếp: đổi là chuyển URL (giữ nguyên bộ lọc, không cuộn lên đầu trang). */
export function SortSelect({ value, options }: { value: string; options: { key: string; label: string; href: string }[] }) {
  const router = useRouter();
  return (
    <label className="flex items-center gap-2 text-sm text-text-muted">
      Sắp xếp
      <select
        value={value}
        onChange={(e) => {
          const o = options.find((x) => x.key === e.target.value);
          if (o) router.push(o.href, { scroll: false });
        }}
        className="rounded-lg border border-border bg-bg-elevated px-2.5 py-1.5 text-sm text-text focus:border-accent focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

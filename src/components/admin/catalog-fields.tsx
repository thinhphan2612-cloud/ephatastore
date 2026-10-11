"use client";

import { useState } from "react";
import {
  createCategory,
  createPublisher,
  type CategoryInput,
  type PublisherInput,
} from "@/lib/actions/catalog";

export const catalogInput =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:outline-none";

/** Enter trong ô nhập không được submit form sản phẩm bên ngoài — chạy onEnter thay vào đó. */
const enterTo = (onEnter: () => void) => (e: React.KeyboardEvent) => {
  if (e.key === "Enter") {
    e.preventDefault();
    onEnter();
  }
};

export function CategoryFields({
  value,
  onChange,
  onEnter,
}: {
  value: CategoryInput;
  onChange: (v: CategoryInput) => void;
  onEnter: () => void;
}) {
  const set = (k: keyof CategoryInput) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...value, [k]: e.target.value });
  const onKeyDown = enterTo(onEnter);
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_88px]">
      <input placeholder="Tên danh mục *" value={value.name} onChange={set("name")} onKeyDown={onKeyDown} className={catalogInput} />
      <input placeholder="Biểu tượng" title="1 ký tự, vd ✝ ♡ ◈" value={value.icon ?? ""} onChange={set("icon")} onKeyDown={onKeyDown} maxLength={4} className={catalogInput} />
      <input placeholder="Nhãn nhỏ (vd Quản trị mục vụ)" value={value.eyebrow ?? ""} onChange={set("eyebrow")} onKeyDown={onKeyDown} maxLength={60} className={`${catalogInput} sm:col-span-2`} />
      <input placeholder="Mô tả ngắn" value={value.description ?? ""} onChange={set("description")} onKeyDown={onKeyDown} maxLength={300} className={`${catalogInput} sm:col-span-2`} />
    </div>
  );
}

export function PublisherFields({
  value,
  onChange,
  onEnter,
}: {
  value: PublisherInput;
  onChange: (v: PublisherInput) => void;
  onEnter: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        placeholder="Tên nhà phát hành *"
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
        onKeyDown={enterTo(onEnter)}
        className={`${catalogInput} min-w-0 flex-1`}
      />
      <label className="flex items-center gap-2 text-sm text-text-muted">
        <input type="checkbox" checked={!!value.verified} onChange={(e) => onChange({ ...value, verified: e.target.checked })} />
        Đã xác minh
      </label>
    </div>
  );
}

const EMPTY_CATEGORY: CategoryInput = { name: "", icon: "", eyebrow: "", description: "" };
const EMPTY_PUBLISHER: PublisherInput = { name: "", verified: false };

/** Ô chọn danh mục / nhà phát hành có nút "+ Thêm mới" (tạo xong tự chọn, không rời form). */
export function SelectWithCreate({
  kind,
  name,
  options: initial,
  defaultValue,
}: {
  kind: "category" | "publisher";
  name: string;
  options: { id: string; name: string }[];
  defaultValue?: string;
}) {
  const [options, setOptions] = useState(initial);
  const [value, setValue] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<CategoryInput>(EMPTY_CATEGORY);
  const [pub, setPub] = useState<PublisherInput>(EMPTY_PUBLISHER);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = kind === "category" ? await createCategory(cat) : await createPublisher(pub);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setOptions((o) => [...o, r.item]);
    setValue(r.item.id);
    setCat(EMPTY_CATEGORY);
    setPub(EMPTY_PUBLISHER);
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select name={name} required value={value} onChange={(e) => setValue(e.target.value)} className={`${catalogInput} min-w-0 flex-1`}>
          <option value="" disabled>
            — Chọn —
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setError(null);
          }}
          className="shrink-0 rounded-md border border-border px-3 text-sm text-text-muted hover:border-accent hover:text-text"
        >
          {open ? "Đóng" : "+ Thêm mới"}
        </button>
      </div>
      {open && (
        <div className="space-y-3 rounded-md border border-border bg-surface-hover/40 p-3">
          {kind === "category" ? (
            <CategoryFields value={cat} onChange={setCat} onEnter={save} />
          ) : (
            <PublisherFields value={pub} onChange={setPub} onEnter={save} />
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-accent-contrast hover:bg-accent-hover disabled:opacity-60"
          >
            {busy ? "Đang tạo…" : kind === "category" ? "Tạo danh mục" : "Tạo nhà phát hành"}
          </button>
        </div>
      )}
    </div>
  );
}

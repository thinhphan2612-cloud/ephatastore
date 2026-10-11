"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCategory,
  createPublisher,
  deleteCategory,
  deletePublisher,
  moveCategory,
  updateCategory,
  updatePublisher,
  type ActionResult,
  type CategoryInput,
  type PublisherInput,
} from "@/lib/actions/catalog";
import { CategoryFields, PublisherFields } from "@/components/admin/catalog-fields";

interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  icon: string | null;
  eyebrow: string | null;
  description: string | null;
  products: number;
}
interface PublisherRow {
  id: string;
  slug: string;
  name: string;
  verified: boolean;
  products: number;
}

const btn = "rounded-md border border-border px-2.5 py-1 text-sm text-text-muted hover:border-accent hover:text-text disabled:opacity-40";
const primary = "rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-accent-contrast hover:bg-accent-hover disabled:opacity-60";

/** Chạy action → báo lỗi hoặc tải lại dữ liệu trang. */
function useRun() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run(fn: () => Promise<ActionResult | { ok: boolean; error?: string }>, after?: () => void) {
    setBusy(true);
    setError(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) return setError(("error" in r && r.error) || "Lỗi không xác định.");
    after?.();
    router.refresh();
  }
  return { busy, error, run };
}

export function CatalogManager({ categories, publishers }: { categories: CategoryRow[]; publishers: PublisherRow[] }) {
  return (
    <div className="grid gap-8 pt-4 lg:grid-cols-2">
      <section className="min-w-0 space-y-3">
        <h3 className="font-semibold">Danh mục ({categories.length})</h3>
        <div className="divide-y divide-border rounded-lg border border-border">
          {categories.map((c, i) => (
            <CategoryItem key={c.id} c={c} first={i === 0} last={i === categories.length - 1} />
          ))}
        </div>
        <NewCategory />
      </section>
      <section className="min-w-0 space-y-3">
        <h3 className="font-semibold">Nhà phát hành ({publishers.length})</h3>
        <div className="divide-y divide-border rounded-lg border border-border">
          {publishers.map((p) => (
            <PublisherItem key={p.id} p={p} />
          ))}
        </div>
        <NewPublisher />
      </section>
    </div>
  );
}

function CategoryItem({ c, first, last }: { c: CategoryRow; first: boolean; last: boolean }) {
  const { busy, error, run } = useRun();
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState<CategoryInput>({ name: c.name, icon: c.icon ?? "", eyebrow: c.eyebrow ?? "", description: c.description ?? "" });
  const [confirmDel, setConfirmDel] = useState(false);
  const save = () => run(() => updateCategory(c.id, v), () => setEdit(false));

  return (
    <div className="space-y-2 p-3">
      {edit ? (
        <>
          <CategoryFields value={v} onChange={setV} onEnter={save} />
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={busy} className={primary}>Lưu</button>
            <button type="button" onClick={() => setEdit(false)} className={btn}>Hủy</button>
          </div>
        </>
      ) : (
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-border text-accent">{c.icon ?? "✦"}</span>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-text">{c.name}</div>
            <div className="truncate text-xs text-text-faint">
              /category/{c.slug} · {c.products} sản phẩm{c.eyebrow ? ` · ${c.eyebrow}` : ""}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
            <button type="button" title="Lên" disabled={busy || first} onClick={() => run(() => moveCategory(c.id, -1))} className={btn}>↑</button>
            <button type="button" title="Xuống" disabled={busy || last} onClick={() => run(() => moveCategory(c.id, 1))} className={btn}>↓</button>
            <button type="button" onClick={() => setEdit(true)} className={btn}>Sửa</button>
            {confirmDel ? (
              <button type="button" disabled={busy} onClick={() => run(() => deleteCategory(c.id), () => setConfirmDel(false))} className={`${btn} border-danger text-danger`}>
                Chắc chắn xóa?
              </button>
            ) : (
              <button type="button" onClick={() => setConfirmDel(true)} className={`${btn} hover:text-danger`}>Xóa</button>
            )}
          </div>
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

function PublisherItem({ p }: { p: PublisherRow }) {
  const { busy, error, run } = useRun();
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState<PublisherInput>({ name: p.name, verified: p.verified });
  const [confirmDel, setConfirmDel] = useState(false);
  const save = () => run(() => updatePublisher(p.id, v), () => setEdit(false));

  return (
    <div className="space-y-2 p-3">
      {edit ? (
        <>
          <PublisherFields value={v} onChange={setV} onEnter={save} />
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={busy} className={primary}>Lưu</button>
            <button type="button" onClick={() => setEdit(false)} className={btn}>Hủy</button>
          </div>
        </>
      ) : (
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-medium text-text">
              {p.name} {p.verified && <span className="text-xs text-accent">✓ đã xác minh</span>}
            </div>
            <div className="truncate text-xs text-text-faint">
              {p.slug} · {p.products} sản phẩm
            </div>
          </div>
          <div className="flex shrink-0 gap-1.5">
            <button type="button" onClick={() => setEdit(true)} className={btn}>Sửa</button>
            {confirmDel ? (
              <button type="button" disabled={busy} onClick={() => run(() => deletePublisher(p.id), () => setConfirmDel(false))} className={`${btn} border-danger text-danger`}>
                Chắc chắn xóa?
              </button>
            ) : (
              <button type="button" onClick={() => setConfirmDel(true)} className={`${btn} hover:text-danger`}>Xóa</button>
            )}
          </div>
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}

function NewCategory() {
  const { busy, error, run } = useRun();
  const [v, setV] = useState<CategoryInput>({ name: "", icon: "", eyebrow: "", description: "" });
  const save = () => run(() => createCategory(v), () => setV({ name: "", icon: "", eyebrow: "", description: "" }));
  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
      <div className="text-sm font-medium text-text-muted">Thêm danh mục</div>
      <CategoryFields value={v} onChange={setV} onEnter={save} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="button" onClick={save} disabled={busy} className={primary}>{busy ? "Đang tạo…" : "Tạo danh mục"}</button>
    </div>
  );
}

function NewPublisher() {
  const { busy, error, run } = useRun();
  const [v, setV] = useState<PublisherInput>({ name: "", verified: false });
  const save = () => run(() => createPublisher(v), () => setV({ name: "", verified: false }));
  return (
    <div className="space-y-3 rounded-lg border border-dashed border-border p-3">
      <div className="text-sm font-medium text-text-muted">Thêm nhà phát hành</div>
      <PublisherFields value={v} onChange={setV} onEnter={save} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="button" onClick={save} disabled={busy} className={primary}>{busy ? "Đang tạo…" : "Tạo nhà phát hành"}</button>
    </div>
  );
}

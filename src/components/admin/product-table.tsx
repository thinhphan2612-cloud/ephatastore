"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import type { AdminProductRow } from "@/data/admin";
import { deleteProduct, saveProductConfigs, type ProductConfigChange } from "@/lib/actions/admin";
import { unwrap } from "@/lib/action-result";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { TYPE_LABEL } from "@/lib/labels";
import { vndToPoints } from "@/lib/points";
import type { ProductType } from "@/lib/types";

type Config = Omit<ProductConfigChange, "id" | "updated_at">;
const FIELDS: (keyof Config)[] = ["tier", "price_month", "trial", "trial_days", "giaoly_pro_free", "active"];
const PERPETUAL = ["asset", "image", "game", "software"];
const TYPES = Object.keys(TYPE_LABEL) as ProductType[];

const ctl =
  "rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm text-text focus:border-accent focus:outline-none disabled:opacity-50";
const n = (v: number) => v.toLocaleString("vi-VN");
// Tìm không dấu: "giao ly" khớp "Giáo Lý".
const fold = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();

const baseOf = (p: AdminProductRow): Config => ({
  tier: p.tier,
  price_month: p.price_month,
  trial: p.trial,
  trial_days: p.trial_days,
  giaoly_pro_free: p.giaoly_pro_free,
  active: p.active,
});
const isHosted = (p: AdminProductRow) => p.type === "tool" && !!p.game_url;

export function ProductTable({ products }: { products: AdminProductRow[] }) {
  // Chỉ giữ phần admin đã sửa; giá trị gốc luôn lấy từ server → sau khi lưu / xóa, bảng tự khớp dữ liệu mới.
  const [edits, setEdits] = useState<Record<string, Partial<Config>>>({});
  // updated_at của dòng lúc bắt đầu sửa: bảng tự làm mới sau mỗi lần lưu, nên không lấy bản mới nhất (sẽ ghi đè sửa của người khác).
  const [since, setSince] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSaving] = useTransition();

  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [tier, setTier] = useState("");
  const [status, setStatus] = useState("");
  const [glsOnly, setGlsOnly] = useState(false);
  const [sort, setSort] = useState<"name" | "updated" | "price">("name");

  const cfg = (p: AdminProductRow): Config => ({ ...baseOf(p), ...edits[p.id] });
  const dirtyIds = useMemo(
    () =>
      products
        .filter((p) => {
          const e = edits[p.id];
          return e && FIELDS.some((f) => f in e && e[f] !== baseOf(p)[f]);
        })
        .map((p) => p.id),
    [products, edits]
  );
  const dirty = new Set(dirtyIds);

  // Cảnh báo khi rời trang còn thay đổi chưa lưu: đóng tab / F5 (beforeunload) và bấm link trong app (Next không gọi beforeunload).
  useEffect(() => {
    if (!dirtyIds.length) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a");
      if (!a || a.target === "_blank" || e.ctrlKey || e.metaKey) return;
      if (!confirm(`Còn ${dirtyIds.length} thay đổi chưa lưu. Rời trang và bỏ các thay đổi này?`)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirtyIds.length]);

  const set = (p: AdminProductRow, patch: Partial<Config>) => {
    const id = p.id;
    setSince((m) => (id in m ? m : { ...m, [id]: p.updated_at }));
    setEdits((m) => ({ ...m, [id]: { ...m[id], ...patch } }));
    setErrors((m) => {
      if (!(id in m)) return m;
      const rest = { ...m };
      delete rest[id];
      return rest;
    });
    setFlash(null);
  };

  const shown = useMemo(() => {
    const k = fold(q.trim());
    const list = products.filter((p) => {
      const c = { ...baseOf(p), ...edits[p.id] };
      if (k && !fold(p.title).includes(k) && !p.slug.includes(k)) return false;
      if (type && p.type !== type) return false;
      if (tier && c.tier !== tier) return false;
      if (status === "visible" && !(p.published && p.active)) return false;
      if (status === "hidden" && !(p.published && !p.active)) return false;
      if (status === "unpublished" && p.published) return false;
      if (glsOnly && !c.giaoly_pro_free) return false;
      return true;
    });
    if (sort === "updated") list.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    else if (sort === "price") list.sort((a, b) => b.price_month - a.price_month);
    else list.sort((a, b) => a.title.localeCompare(b.title, "vi"));
    return list;
  }, [products, edits, q, type, tier, status, glsOnly, sort]);

  const filtered = !!(q || type || tier || status || glsOnly);
  const hiddenDirty = dirtyIds.filter((id) => !shown.some((p) => p.id === id)).length;
  const pro = products.filter((p) => p.tier === "pro").length;

  const save = () =>
    startSaving(async () => {
      const changes: ProductConfigChange[] = products
        .filter((p) => dirty.has(p.id))
        .map((p) => ({ id: p.id, updated_at: since[p.id] ?? p.updated_at, ...cfg(p) }));
      try {
        const { saved, errors: errs, stale } = unwrap(await saveProductConfigs(changes));
        const ok = Object.keys(saved);
        // Dòng đã lưu và dòng bị người khác sửa đều bỏ chỉnh sửa → hiện đúng giá trị mới nhất trên server.
        const drop = <T,>(m: Record<string, T>) => {
          const rest = { ...m };
          [...ok, ...stale].forEach((id) => delete rest[id]);
          return rest;
        };
        setEdits(drop);
        setSince(drop);
        stale.forEach((id) => (errs[id] = "Vừa được người khác sửa — chưa lưu thay đổi của bạn; bảng đã hiện giá trị mới nhất, chỉnh lại nếu cần."));
        setErrors(errs);
        const bad = Object.keys(errs).length;
        setFlash(
          bad
            ? { ok: false, text: `Đã lưu ${ok.length} dòng · ${bad} dòng không lưu được (tô đỏ, lý do ngay dưới tên).` }
            : { ok: true, text: `Đã lưu ${ok.length} dòng.` }
        );
      } catch (e) {
        setFlash({ ok: false, text: e instanceof Error ? e.message : "Không lưu được. Thử lại." });
      }
    });

  const undo = () => {
    setEdits({});
    setSince({});
    setErrors({});
    setFlash(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          Sản phẩm <span className="text-text-faint">({products.length})</span>{" "}
          <span className="text-sm text-text-muted">
            · {pro} PRO / {products.length - pro} FREE
          </span>
        </h2>
        <Link
          href="/admin/products/new"
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-contrast hover:bg-accent-hover"
        >
          + Thêm sản phẩm
        </Link>
      </div>

      <Legend />

      {/* Thanh công cụ */}
      <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên hoặc slug…"
            aria-label="Tìm sản phẩm"
            className={`${ctl} min-w-0 flex-1 basis-56 py-1.5`}
          />
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sắp xếp" className={ctl}>
            <option value="name">Sắp xếp: Tên A→Z</option>
            <option value="updated">Sắp xếp: Mới cập nhật</option>
            <option value="price">Sắp xếp: Giá cao → thấp</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select value={type} onChange={(e) => setType(e.target.value)} aria-label="Lọc theo loại" className={ctl}>
            <option value="">Mọi loại</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "feature" ? "Tính năng GLS" : TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          <select value={tier} onChange={(e) => setTier(e.target.value)} aria-label="Lọc theo giá" className={ctl}>
            <option value="">FREE + PRO</option>
            <option value="free">Chỉ FREE</option>
            <option value="pro">Chỉ PRO</option>
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Lọc theo trạng thái" className={ctl}>
            <option value="">Mọi trạng thái</option>
            <option value="visible">Đang hiện trên store</option>
            <option value="hidden">Đã ẩn (người mua vẫn dùng)</option>
            <option value="unpublished">Đã gỡ / chưa bán</option>
          </select>
          <label className="flex items-center gap-1.5 text-text-muted">
            <input type="checkbox" checked={glsOnly} onChange={(e) => setGlsOnly(e.target.checked)} className="h-4 w-4" />
            Free Pro GLS
          </label>
          <span className="ml-auto text-xs text-text-faint">
            Đang xem <b className="text-text-muted">{shown.length}</b> / {products.length} sản phẩm
            {filtered && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setType("");
                  setTier("");
                  setStatus("");
                  setGlsOnly(false);
                }}
                className="ml-2 text-brand hover:text-brand-hover"
              >
                Xóa bộ lọc
              </button>
            )}
          </span>
        </div>
      </div>

      {/* Bảng: màn rộng là lưới 4 cột, điện thoại xếp dọc từng sản phẩm */}
      <div className="rounded-lg border border-border">
        <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] gap-4 border-b border-border bg-surface px-3 py-2 text-xs font-medium text-text-muted md:grid">
          <span title="Logo / icon, tên, loại và slug (đường dẫn /product/slug)">Sản phẩm</span>
          <span title="FREE = ai cũng dùng. PRO = phải mua; nhập giá bằng VND, khách trả bằng point (100đ = 1 point)" className="cursor-help underline decoration-dotted underline-offset-2">
            Giá bán
          </span>
          <span title="Dùng thử (chỉ công cụ / tính năng thuê bao) và Miễn phí cho tài khoản Pro Giáo Lý Số" className="cursor-help underline decoration-dotted underline-offset-2">
            Ưu đãi
          </span>
          <span title="Bỏ tick = ẩn khỏi store; người đã mua vẫn dùng bình thường" className="cursor-help text-right underline decoration-dotted underline-offset-2">
            Hiện · Thao tác
          </span>
        </div>

        {shown.length === 0 && <p className="px-3 py-8 text-center text-sm text-text-faint">Không có sản phẩm nào khớp bộ lọc.</p>}

        {shown.map((p) => {
          const c = cfg(p);
          const hosted = isHosted(p);
          const sub = !PERPETUAL.includes(p.type);
          const isDirty = dirty.has(p.id);
          const err = errors[p.id];
          return (
            <div
              key={p.id}
              className={`grid gap-x-4 gap-y-2 border-b border-border px-3 py-2.5 last:border-b-0 md:grid-cols-[minmax(0,1.5fr)_minmax(0,1.4fr)_minmax(0,1fr)_auto] md:items-center ${
                err ? "bg-danger/10" : isDirty ? "bg-accent/10" : ""
              }`}
            >
              {/* Sản phẩm */}
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-bg-elevated text-accent">
                  {p.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.logo_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (p.icon ?? "✦")
                  )}
                </span>
                <div className="min-w-0">
                  <div className="truncate font-medium text-text" title={p.title}>
                    {isDirty && <span className="mr-1 text-accent" title="Có thay đổi chưa lưu">●</span>}
                    {p.title}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-text-faint">
                    <span className="text-text-muted">{p.type === "feature" ? "Tính năng GLS" : (TYPE_LABEL[p.type as ProductType] ?? p.type)}</span>
                    <span className="truncate">/{p.slug}</span>
                    {!p.published && (
                      <span className="text-danger" title="Đã gỡ khỏi bán: khách không thấy, người đã mua cũng không mở được. Bật lại ở trang Sửa.">
                        ✕ Đã gỡ
                      </span>
                    )}
                  </div>
                  {err && <p className="mt-0.5 text-xs font-medium text-danger">{err}</p>}
                </div>
              </div>

              {/* Giá bán */}
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={c.tier}
                    disabled={hosted}
                    onChange={(e) => set(p, { tier: e.target.value as Config["tier"] })}
                    aria-label={`Giá ${p.title}`}
                    className={ctl}
                  >
                    <option value="free">FREE</option>
                    <option value="pro">PRO</option>
                  </select>
                  {c.tier === "pro" && (
                    <label className="flex items-center gap-1 text-xs text-text-faint">
                      <input
                        type="number"
                        min={0}
                        max={100_000_000}
                        step={1000}
                        value={c.price_month}
                        onChange={(e) => set(p, { price_month: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                        aria-label={`Giá VND ${p.title}`}
                        className={`${ctl} w-28 tabular-nums`}
                      />
                      đ{sub ? "/tháng" : ""}
                    </label>
                  )}
                </div>
                <p className={`mt-0.5 text-[11px] ${c.tier === "pro" && c.price_month <= 0 ? "text-danger" : "text-text-faint"}`}>
                  {hosted
                    ? "Chạy trên store → luôn FREE, thu theo lượt qua Ví Ephata"
                    : c.tier === "free"
                      ? "Ai cũng dùng được, không cần mua"
                      : c.price_month <= 0
                        ? "PRO cần giá > 0"
                        : sub
                          ? `Gói năm ${n(vndToPoints(c.price_month * 12))} point · mua lẻ ${n(vndToPoints(c.price_month))} point`
                          : `= ${n(vndToPoints(c.price_month))} point · ${p.type === "software" ? "key vĩnh viễn" : "mua 1 lần"}`}
                </p>
              </div>

              {/* Ưu đãi */}
              <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                {c.tier !== "pro" ? (
                  <span className="text-text-faint">—</span>
                ) : (
                  <>
                    {sub && (
                      <span className="flex items-center gap-1.5">
                        <label className="flex items-center gap-1.5" title="Khách mới được dùng thử miễn phí N ngày (1 lần / tài khoản)">
                          <input
                            type="checkbox"
                            checked={c.trial}
                            onChange={(e) => set(p, { trial: e.target.checked })}
                            className="h-4 w-4"
                          />
                          Dùng thử
                        </label>
                        {c.trial && (
                          <>
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={c.trial_days}
                              onChange={(e) => set(p, { trial_days: Math.floor(Number(e.target.value) || 0) })}
                              aria-label={`Số ngày dùng thử ${p.title}`}
                              className={`${ctl} w-14 tabular-nums`}
                            />
                            ngày
                          </>
                        )}
                      </span>
                    )}
                    {p.type !== "software" && (
                      <label className="flex items-center gap-1.5" title="Tài khoản Pro của Giáo Lý Số dùng sản phẩm này miễn phí">
                        <input
                          type="checkbox"
                          checked={c.giaoly_pro_free}
                          onChange={(e) => set(p, { giaoly_pro_free: e.target.checked })}
                          className="h-4 w-4"
                        />
                        Free Pro GLS
                      </label>
                    )}
                    {p.type === "software" && <span className="text-text-faint">Phần mềm: không có ưu đãi</span>}
                  </>
                )}
              </div>

              {/* Hiện + thao tác */}
              <div className="flex items-center gap-3 text-sm md:justify-end">
                <label className="flex items-center gap-1.5 text-xs text-text-muted" title="Bỏ tick = ẩn khỏi store, người đã mua vẫn dùng">
                  <input type="checkbox" checked={c.active} onChange={(e) => set(p, { active: e.target.checked })} className="h-4 w-4" />
                  Hiện
                </label>
                <Link href={`/admin/products/${p.id}/edit`} className="text-brand hover:text-brand-hover">
                  Sửa
                </Link>
                <a href={`/product/${p.slug}`} target="_blank" rel="noopener noreferrer" className="text-text-muted hover:text-text" title="Mở trang sản phẩm ở tab mới">
                  Xem ↗
                </a>
                <form action={deleteProduct}>
                  <input type="hidden" name="id" value={p.id} />
                  <ConfirmSubmit
                    confirm={`Xóa "${p.title}"? Hành động này không hoàn tác được. File host (nếu có) cũng bị xóa.`}
                    className="text-text-faint hover:text-danger"
                  >
                    Xóa
                  </ConfirmSubmit>
                </form>
              </div>
            </div>
          );
        })}
      </div>

      {/* Thanh lưu: luôn nằm đáy màn hình khi có thay đổi / kết quả lưu */}
      {(dirtyIds.length > 0 || flash) && (
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-border-strong bg-bg-elevated px-3 py-2.5 shadow-lg">
          <span className="min-w-0 flex-1 text-sm">
            {flash && <span className={flash.ok ? "text-success" : "text-danger"}>{flash.text} </span>}
            {dirtyIds.length > 0 && (
              <span className="text-text-muted">
                <b className="text-text">{dirtyIds.length}</b> sản phẩm có thay đổi chưa lưu
                {hiddenDirty > 0 && ` (${hiddenDirty} dòng đang bị bộ lọc ẩn)`}
              </span>
            )}
          </span>
          {dirtyIds.length > 0 ? (
            <>
              <button type="button" onClick={undo} disabled={saving} className="text-sm text-text-muted hover:text-text disabled:opacity-50">
                Hoàn tác
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-md bg-accent px-4 py-1.5 text-sm font-semibold text-accent-contrast hover:bg-accent-hover disabled:opacity-60"
              >
                {saving ? "Đang lưu…" : "Lưu tất cả"}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setFlash(null)} className="text-sm text-text-faint hover:text-text" aria-label="Đóng">
              ✕
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <details className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
      <summary className="cursor-pointer select-none text-text-muted">Cách đọc bảng</summary>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-text-muted">
        <li>
          <b className="text-text">FREE / PRO:</b> FREE = ai cũng dùng, không cần mua. PRO = khách phải mua (hoặc có Full Topping, trừ phần
          mềm và tính năng GLS).
        </li>
        <li>
          <b className="text-text">Giá nhập bằng VND, khách trả bằng point</b> (100đ = 1 point). Dòng nhỏ dưới ô giá là số point khách thấy.
        </li>
        <li>
          <b className="text-text">Công cụ / Tính năng GLS</b> bán thuê bao: giá nhập là giá <i>1 tháng</i> → gói năm = 12 tháng, mua lẻ N ngày
          = 1 tháng (N đặt ở Cài đặt). <b className="text-text">Game / Tài liệu / Hình ảnh / Phần mềm</b> bán 1 lần, dùng vĩnh viễn.
        </li>
        <li>
          <b className="text-text">Dùng thử:</b> chỉ cho loại thuê bao; mỗi tài khoản (tính năng GLS: mỗi giáo xứ) dùng thử 1 lần, 1–60 ngày.
        </li>
        <li>
          <b className="text-text">Free Pro GLS:</b> tài khoản Pro của Giáo Lý Số dùng miễn phí. Phần mềm bán key không áp dụng.
        </li>
        <li>
          <b className="text-text">Hiện</b> (tick ở bảng) = có trên store; bỏ tick là ẩn, người đã mua vẫn dùng.{" "}
          <b className="text-text">✕ Đã gỡ</b> = tắt “Đang bán” ở trang Sửa: khách không thấy, người đã mua cũng không mở được.
        </li>
        <li>
          Sửa nhiều dòng rồi bấm <b className="text-text">Lưu tất cả</b> ở đáy màn hình. Dòng sai quy tắc báo lỗi riêng, các dòng khác vẫn lưu.
          Dòng vừa được người khác sửa sẽ không bị ghi đè.
        </li>
      </ul>
    </details>
  );
}

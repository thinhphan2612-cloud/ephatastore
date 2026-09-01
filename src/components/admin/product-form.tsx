"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveProduct, type SaveState } from "@/lib/actions/admin";
import type { AdminProductDetail } from "@/data/admin";
import { TYPE_LABEL } from "@/lib/labels";
import type { ProductType } from "@/lib/types";

const ALL_TYPES: ProductType[] = ["tool", "game", "asset", "image", "feature"];

/** Preset quyết định form hiện field nào. 'full' = đủ (dùng khi sửa). */
export type ProductPreset = "download" | "link" | "feature" | "full";

const PRESET_TYPES: Record<ProductPreset, ProductType[]> = {
  download: ["asset", "image"],
  link: ["tool", "feature"],
  feature: ["feature"],
  full: ALL_TYPES,
};

export function ProductForm({
  categories,
  publishers,
  product,
  preset = "full",
}: {
  categories: { id: string; name: string }[];
  publishers: { id: string; name: string }[];
  product?: AdminProductDetail | null;
  preset?: ProductPreset;
}) {
  const [state, formAction, pending] = useActionState<SaveState, FormData>(
    saveProduct,
    {}
  );

  const p = product;
  const types = PRESET_TYPES[preset];
  const showDownload = preset === "download" || preset === "full";
  const showLink = preset === "link" || preset === "full";
  const showFeature = preset === "feature" || preset === "full";
  const showGameUrl = preset === "full";
  const defaultType = p?.type ?? types[0];

  return (
    <form action={formAction} className="space-y-5">
      {p && <input type="hidden" name="id" value={p.id} />}

      <Field label="Tiêu đề *">
        <input name="title" required defaultValue={p?.title} className={input} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Slug (để trống = tự tạo từ tiêu đề)">
          <input name="slug" defaultValue={p?.slug} className={input} placeholder="tu-dong" />
        </Field>
        <Field label="Loại *">
          <select name="type" defaultValue={defaultType} className={input}>
            {types.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Mô tả ngắn (tagline)">
        <input name="tagline" defaultValue={p?.tagline} className={input} />
      </Field>

      <Field label="Mô tả chi tiết">
        <textarea name="description" rows={4} defaultValue={p?.description} className={input} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Danh mục *">
          <select name="category_id" required defaultValue={p?.category_id ?? ""} className={input}>
            <option value="" disabled>
              — Chọn —
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nhà phát hành *">
          <select name="publisher_id" required defaultValue={p?.publisher_id ?? ""} className={input}>
            <option value="" disabled>
              — Chọn —
            </option>
            {publishers.map((pub) => (
              <option key={pub.id} value={pub.id}>
                {pub.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Giá (VND)">
          <input type="number" name="price_vnd" min={0} defaultValue={p?.price_vnd ?? 0} className={input} />
        </Field>
        <Field label="Giá gốc (nếu giảm)">
          <input type="number" name="original_price_vnd" min={0} defaultValue={p?.original_price_vnd ?? ""} className={input} />
        </Field>
        <Field label="Gói yêu cầu">
          <select name="min_plan" defaultValue={p?.min_plan ?? ""} className={input}>
            <option value="">Không (ai cũng mua)</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
        </Field>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tags (cách nhau bằng dấu phẩy)">
          <input name="tags" defaultValue={p?.tags?.join(", ")} className={input} placeholder="giáo lý, quản lý" />
        </Field>
        <Field label="Ngày phát hành">
          <input type="date" name="released_at" defaultValue={p?.released_at ?? ""} className={input} />
        </Field>
      </div>

      <Field label="Ảnh bìa">
        {p?.cover_url && (
          <div className="mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.cover_url}
              alt="Ảnh bìa hiện tại"
              className="h-32 rounded-md border border-border object-cover"
            />
            <span className="mt-1 block text-xs text-text-faint">Ảnh hiện tại</span>
          </div>
        )}
        <input
          type="file"
          name="cover_file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="block w-full text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-text hover:file:bg-surface-hover"
        />
        <span className="mt-1 block text-xs text-text-faint">
          Tối đa 5MB. Bỏ trống nếu giữ ảnh cũ / dùng gradient.
        </span>
        <input type="hidden" name="cover_url" value={p?.cover_url ?? ""} />
      </Field>

      <div className="rounded-lg border border-border bg-surface-hover/40 p-4">
        <div className="mb-3 text-sm font-semibold text-text">Giao hàng</div>

        {showDownload && (
          <Field label="File tải về — bucket riêng tư (PDF / DOCX / ảnh / zip)">
            {p?.download_path && (
              <div className="mb-2 text-xs text-text-muted">
                File hiện tại: <code className="text-text">{p.download_path.split("/").pop()}</code>
              </div>
            )}
            <input
              type="file"
              name="download_file"
              className="block w-full text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-text hover:file:bg-surface-hover"
            />
            <span className="mt-1 block text-xs text-text-faint">
              Tối đa 50MB. Chỉ người đã mua mới tải được (link ký có hạn).
            </span>
          </Field>
        )}

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {showGameUrl && (
            <Field label="URL game (loại game) — nhúng ở /play">
              <input name="game_url" defaultValue={p?.game_url ?? ""} className={input} placeholder="/g/…/index.html" />
            </Field>
          )}
          {showLink && (
            <Field label="URL app ngoài — mở khi đã sở hữu">
              <input name="app_url" defaultValue={p?.app_url ?? ""} className={input} placeholder="https://…" />
            </Field>
          )}
          {showFeature && (
            <Field label="Feature key (bật tính năng bên Giáo Lý Số)">
              <input name="giaoly_feature_key" defaultValue={p?.giaoly_feature_key ?? ""} className={input} placeholder="vd: lich_phung_vu" />
            </Field>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-5">
        <Check name="published" label="Đang bán" defaultChecked={p ? p.published : true} />
        <Check name="featured" label="Nổi bật" defaultChecked={p?.featured} />
        <Check name="is_new" label="Mới" defaultChecked={p?.is_new} />
        <Check name="is_popular" label="Phổ biến" defaultChecked={p?.is_popular} />
      </div>

      {state.error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-accent px-5 py-2 font-semibold text-accent-contrast hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Đang lưu…" : "Lưu"}
        </button>
        <Link href="/admin" className="text-sm text-text-muted hover:text-text">
          Huỷ
        </Link>
      </div>
    </form>
  );
}

const input =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-text-muted">{label}</span>
      {children}
    </label>
  );
}

function Check({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-text">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4" />
      {label}
    </label>
  );
}

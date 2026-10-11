"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveProduct, saveSoftwareProduct, type SaveState } from "@/lib/actions/admin";
import { createReleaseUpload, saveRelease } from "@/lib/actions/software";
import { createStoreAuthBrowserClient } from "@/lib/supabase/store-auth-browser";
import type { AdminProductDetail } from "@/data/admin";
import { TYPE_LABEL } from "@/lib/labels";
import type { ProductType } from "@/lib/types";
import { PLATFORMS, PLATFORM_LABEL, SEMVER_RE, type Platform } from "@/lib/software/version";

/** Supabase gói Free: tối đa 50MB/file (bucket product-files). */
const MAX_INSTALLER_BYTES = 50 * 1024 * 1024;

const ALL_TYPES: ProductType[] = ["tool", "game", "asset", "image", "feature"];

/** Preset quyết định form hiện field nào. 'full' = đủ (dùng khi sửa, trừ software). */
export type ProductPreset = "download" | "link" | "feature" | "software" | "full";

const PRESET_TYPES: Record<ProductPreset, ProductType[]> = {
  download: ["asset", "image"],
  link: ["tool", "feature"],
  feature: ["feature"],
  software: ["software"],
  full: ALL_TYPES,
};

export function ProductForm({
  categories,
  publishers,
  product,
  preset = "full",
  currentReleases = {},
}: {
  categories: { id: string; name: string }[];
  publishers: { id: string; name: string }[];
  product?: AdminProductDetail | null;
  preset?: ProductPreset;
  /** Bản mới nhất đang có của mỗi nền tảng (software, khi sửa). */
  currentReleases?: Partial<Record<Platform, { version: string; file_name: string }>>;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SaveState, FormData>(
    saveProduct,
    {}
  );

  // ---- Software: lưu thông tin → upload bộ cài thẳng trình duyệt → Storage → ghi phiên bản ----
  const [savedId, setSavedId] = useState<string | null>(null);
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<Partial<Record<Platform, File | null>>>({});
  const [fileKeys, setFileKeys] = useState<Record<Platform, number>>({ windows: 0, macos: 0 });
  const [swBusy, setSwBusy] = useState(false);
  const [swProgress, setSwProgress] = useState("");
  const [swError, setSwError] = useState<string | null>(null);

  async function onSoftwareSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setSwError(null);
    const v = version.trim();
    const chosen = PLATFORMS.filter((pf) => files[pf]);
    if (chosen.length && !SEMVER_RE.test(v))
      return setSwError("Nhập phiên bản dạng semver (vd 1.2.8) cho bộ cài.");
    for (const pf of chosen)
      if (files[pf]!.size > MAX_INSTALLER_BYTES)
        return setSwError(`Bộ cài ${PLATFORM_LABEL[pf]} vượt 50MB (giới hạn Supabase gói Free).`);

    setSwBusy(true);
    try {
      setSwProgress("Đang lưu thông tin…");
      const res = await saveSoftwareProduct(new FormData(form));
      if (res.error || !res.id) throw new Error(res.error ?? "Lỗi lưu sản phẩm.");
      // Lưu được rồi → lần bấm sau (nếu upload lỗi) là cập nhật, không tạo trùng.
      setSavedId(res.id);

      const supabase = createStoreAuthBrowserClient();
      for (const pf of chosen) {
        const f = files[pf]!;
        setSwProgress(`Đang tải bộ cài ${PLATFORM_LABEL[pf]} (${(f.size / 1048576).toFixed(1)}MB)…`);
        const { path, token } = await createReleaseUpload({
          productId: res.id,
          platform: pf,
          version: v,
          fileName: f.name,
        });
        const { error: upErr } = await supabase.storage
          .from("product-files")
          .uploadToSignedUrl(path, token, f, {
            contentType: f.type || "application/octet-stream",
            upsert: true,
          });
        if (upErr) throw new Error(`Lỗi tải bộ cài ${PLATFORM_LABEL[pf]}: ${upErr.message}`);
        await saveRelease({
          productId: res.id,
          platform: pf,
          version: v,
          path,
          fileName: f.name,
          sizeBytes: f.size,
          notes,
        });
        // Xong nền tảng này → bấm lại sẽ không upload lại.
        setFiles((prev) => ({ ...prev, [pf]: null }));
        setFileKeys((prev) => ({ ...prev, [pf]: prev[pf] + 1 }));
      }

      setVersion("");
      setNotes("");
      setSwProgress(chosen.length ? "Đã lưu và tải bộ cài." : "Đã lưu.");
      router.push(`/admin/products/${res.id}/edit`);
      router.refresh();
    } catch (err) {
      setSwError(err instanceof Error ? err.message : "Có lỗi khi lưu.");
      setSwProgress("");
    } finally {
      setSwBusy(false);
    }
  }

  const p = product;
  const types = PRESET_TYPES[preset];
  const showDownload = preset === "download" || preset === "full";
  const showLink = preset === "link" || preset === "full";
  const showFeature = preset === "feature" || preset === "full";
  const showGameUrl = preset === "full";
  const isSoftware = preset === "software";
  const defaultType = p?.type ?? types[0];

  return (
    <form
      action={isSoftware ? undefined : formAction}
      onSubmit={isSoftware ? onSoftwareSubmit : undefined}
      className="space-y-5"
    >
      {(p || savedId) && <input type="hidden" name="id" value={p?.id ?? savedId ?? ""} />}

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
        <Field label={isSoftware ? "Giá key (VND, 100đ = 1 point)" : "Giá (VND)"}>
          <input type="number" name="price_vnd" min={0} defaultValue={p?.price_vnd ?? 0} className={input} />
        </Field>
        <Field label="Giá gốc (nếu giảm)">
          <input type="number" name="original_price_vnd" min={0} defaultValue={p?.original_price_vnd ?? ""} className={input} />
        </Field>
        {!isSoftware && (
          <Field label="Gói yêu cầu">
            <select name="min_plan" defaultValue={p?.min_plan ?? ""} className={input}>
              <option value="">Không (ai cũng mua)</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
          </Field>
        )}
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

      {isSoftware && (
        <div className="rounded-lg border border-border bg-surface-hover/40 p-4">
          <div className="mb-1 text-sm font-semibold text-text">Bộ cài & phân phối</div>
          <p className="mb-4 text-xs text-text-faint">
            Khách tải miễn phí (không cần đăng nhập). Chọn file nào thì file đó được tải lên làm bản mới;
            bỏ trống = giữ bản hiện tại. Tối đa 50MB/file.
          </p>

          <div className="grid gap-5 sm:grid-cols-[160px_1fr]">
            <Field label="Phiên bản (semver)">
              <input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="1.2.8" className={input} />
            </Field>
            <Field label="Ghi chú phát hành">
              <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Có gì mới trong bản này" className={input} />
            </Field>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-3 rounded-md border border-border bg-surface p-3">
              <div className="text-sm font-semibold text-text">Windows</div>
              <Field label="Link Microsoft Store (để trống nếu chưa lên Store)">
                <input name="ms_store_url" defaultValue={p?.ms_store_url ?? ""} className={input} placeholder="https://apps.microsoft.com/detail/…" />
              </Field>
              <InstallerInput
                key={`windows-${fileKeys.windows}`}
                label="Bộ cài .exe — tải trực tiếp nếu chưa có Store; có Store thì làm link dự phòng"
                accept=".exe,.msi"
                current={currentReleases.windows}
                onChange={(f) => setFiles((prev) => ({ ...prev, windows: f }))}
              />
            </div>
            <div className="space-y-3 rounded-md border border-border bg-surface p-3">
              <div className="text-sm font-semibold text-text">macOS</div>
              <InstallerInput
                key={`macos-${fileKeys.macos}`}
                label="Bộ cài .dmg"
                accept=".dmg"
                current={currentReleases.macos}
                onChange={(f) => setFiles((prev) => ({ ...prev, macos: f }))}
              />
            </div>
          </div>

          <div className="mb-3 mt-5 text-sm font-semibold text-text">Cấp phép</div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Số thiết bị / key">
              <input type="number" name="license_device_limit" min={1} max={50} defaultValue={p?.license_device_limit ?? 2} className={input} />
            </Field>
            <Field label="Hạn dùng offline (ngày)">
              <input type="number" name="license_offline_days" min={1} max={365} defaultValue={p?.license_offline_days ?? 30} className={input} />
            </Field>
          </div>
          <p className="mt-3 text-xs text-text-faint">
            Phần mềm luôn trả point — không miễn phí cho Pro Giáo Lý Số / Full Topping.
          </p>
        </div>
      )}

      {!isSoftware && (
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
      )}

      <div className="flex flex-wrap gap-5">
        <Check name="published" label="Đang bán" defaultChecked={p ? p.published : true} />
        <Check name="featured" label="Nổi bật" defaultChecked={p?.featured} />
        <Check name="is_new" label="Mới" defaultChecked={p?.is_new} />
        <Check name="is_popular" label="Phổ biến" defaultChecked={p?.is_popular} />
      </div>

      {(state.error || swError) && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error || swError}
        </p>
      )}

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <button
          type="submit"
          disabled={pending || swBusy}
          className="rounded-md bg-accent px-5 py-2 font-semibold text-accent-contrast hover:bg-accent-hover disabled:opacity-60"
        >
          {pending || swBusy ? "Đang lưu…" : "Lưu"}
        </button>
        <Link href="/admin" className="text-sm text-text-muted hover:text-text">
          Huỷ
        </Link>
        {swProgress && <span className="text-sm text-text-muted">{swProgress}</span>}
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

/** Chọn file bộ cài (không có name → không gửi qua server action; upload thẳng lên Storage). */
function InstallerInput({
  label,
  accept,
  current,
  onChange,
}: {
  label: string;
  accept: string;
  current?: { version: string; file_name: string };
  onChange: (f: File | null) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-text-muted">{label}</span>
      {current && (
        <span className="mb-1.5 block text-xs text-text-muted">
          Hiện tại: <b className="text-text">v{current.version}</b> · {current.file_name}
        </span>
      )}
      <input
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        className="block w-full text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface-hover file:px-3 file:py-1.5 file:text-text"
      />
    </label>
  );
}

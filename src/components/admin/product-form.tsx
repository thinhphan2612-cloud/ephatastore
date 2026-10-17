"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createProductUpload, saveProductData } from "@/lib/actions/admin";
import { createReleaseUpload, saveRelease } from "@/lib/actions/software";
import { createStoreAuthBrowserClient } from "@/lib/supabase/store-auth-browser";
import { uploadHostedBuild } from "@/lib/hosted-upload";
import type { AdminProductDetail } from "@/data/admin";
import { TYPE_LABEL } from "@/lib/labels";
import { SelectWithCreate } from "@/components/admin/catalog-fields";
import { DescriptionEditor } from "@/components/admin/description-editor";
import { MediaFields, type MediaDraft } from "@/components/admin/media-fields";
import { parseGallery, type GalleryItem } from "@/lib/gallery";
import { vndToPoints } from "@/lib/points";
import type { ProductType } from "@/lib/types";
import { PLATFORMS, PLATFORM_LABEL, SEMVER_RE, type Platform } from "@/lib/software/version";
import { unwrap } from "@/lib/action-result";

/** Giới hạn theo bucket Supabase: product-files 50MB, product-covers 5MB. */
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_COVER_BYTES = 5 * 1024 * 1024;

const ALL_TYPES: ProductType[] = ["tool", "game", "asset", "image", "feature"];
/** Bán một lần dùng vĩnh viễn; tool/feature là thuê bao. Khớp PERPETUAL_TYPES ở lib/actions/admin. */
const PERPETUAL: ProductType[] = ["asset", "image", "game", "software"];

/**
 * Preset quyết định form hiện field nào. 'full' = đủ (dùng khi sửa).
 * 'hosted' = sửa game / công cụ web host trên store (bản build thay ở khung riêng trên trang Sửa).
 */
export type ProductPreset = "download" | "link" | "feature" | "software" | "hosted" | "full";

const PRESET_TYPES: Record<ProductPreset, ProductType[]> = {
  download: ["asset", "image"],
  link: ["tool"],
  feature: ["feature"],
  software: ["software"],
  hosted: ["game", "tool"],
  full: ALL_TYPES,
};

const mb = (n: number) => (n / 1048576).toFixed(1);
/** Hôm nay theo giờ Việt Nam (YYYY-MM-DD) — cùng kết quả ở server và trình duyệt. */
const todayVN = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

export function ProductForm({
  categories,
  publishers,
  product,
  preset = "full",
  currentReleases = {},
  slugLockedReason = null,
  defaultCategoryId,
  defaultPublisherId,
}: {
  categories: { id: string; name: string }[];
  publishers: { id: string; name: string }[];
  product?: AdminProductDetail | null;
  preset?: ProductPreset;
  /** Bản mới nhất đang có của mỗi nền tảng (software, khi sửa). */
  currentReleases?: Partial<Record<Platform, { version: string; file_name: string }>>;
  /** Slug không đổi được (sản phẩm đã có người dùng / đã phát hành) — lý do hiển thị dưới ô. */
  slugLockedReason?: string | null;
  /** Chọn sẵn khi tạo mới (vd Chạy trên store → Game Store; nhà phát hành Ephata Team). */
  defaultCategoryId?: string;
  defaultPublisherId?: string;
}) {
  const router = useRouter();
  const p = product;
  const types = PRESET_TYPES[preset];
  const isSoftware = preset === "software";
  const isHosted = preset === "hosted";
  // Tạo mới game / công cụ web: tải bản build .zip ngay trong form (khi sửa thì thay ở khung "Bản build" riêng).
  const isNewHosted = isHosted && !p;
  const showDownload = preset === "download" || preset === "full";
  // Ô giao hàng theo loại đang chọn (form 'full' đổi loại thì ô đổi theo).
  const showLinkBase = preset === "link" || preset === "full";
  const showFeatureBase = preset === "feature" || preset === "full";
  const showGameUrl = preset === "full";

  const [type, setType] = useState<ProductType>((p?.type as ProductType) ?? types[0]);
  const showLink = showLinkBase && type === "tool";
  const showFeature = showFeatureBase && type === "feature";
  const [sale, setSale] = useState<"free" | "paid">(p?.tier === "pro" ? "paid" : "free");
  const [price, setPrice] = useState<string>(p?.price_month ? String(p.price_month) : "");
  const [trial, setTrial] = useState(p?.trial ?? false);
  // license_offline_days = 0 nghĩa là dùng offline vĩnh viễn.
  const [offlineForever, setOfflineForever] = useState(p?.license_offline_days === 0);

  // File chọn ở trình duyệt — không có name nên không đi qua server action; tải thẳng lên Storage khi Lưu.
  const [cover, setCover] = useState<File | null>(null);
  // Logo + ảnh / video minh họa (tải lên khi bấm Lưu).
  const [logo, setLogo] = useState<File | null>(null);
  const [logoRemove, setLogoRemove] = useState(false);
  const [currentLogo, setCurrentLogo] = useState<string | null>(p?.logo_url ?? null);
  const [media, setMedia] = useState<MediaDraft[]>(() => parseGallery(p?.gallery).map((item) => ({ kind: "saved", item })));
  const [download, setDownload] = useState<File | null>(null);
  const [build, setBuild] = useState<File | null>(null);
  // Bản build đã tải lên trong phiên này — lưu lại lỗi ở bước sau thì bấm Lưu lần nữa không tải lại.
  const [buildUrl, setBuildUrl] = useState<string | null>(null);
  const [installers, setInstallers] = useState<Partial<Record<Platform, File | null>>>({});
  const [fileKeys, setFileKeys] = useState<Record<string, number>>({});
  const [version, setVersion] = useState("");
  const [notes, setNotes] = useState("");

  const [savedId, setSavedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resetFile = (k: string) => setFileKeys((prev) => ({ ...prev, [k]: (prev[k] ?? 0) + 1 }));

  async function upload(bucket: string, path: string, token: string, file: File) {
    const { error: upErr } = await createStoreAuthBrowserClient()
      .storage.from(bucket)
      .uploadToSignedUrl(path, token, file, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });
    if (upErr) throw new Error(`Lỗi tải ${file.name}: ${upErr.message}`);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setError(null);

    const v = version.trim();
    const chosen = isSoftware ? PLATFORMS.filter((pf) => installers[pf]) : [];
    if (cover && cover.size > MAX_COVER_BYTES) return setError(`Ảnh bìa ${mb(cover.size)}MB — tối đa 5MB.`);
    if (download && download.size > MAX_FILE_BYTES) return setError(`File tải về ${mb(download.size)}MB — tối đa 50MB.`);
    if (chosen.length && !SEMVER_RE.test(v)) return setError("Nhập phiên bản dạng semver (vd 1.2.8) cho bộ cài.");
    if (isNewHosted && !build && !buildUrl) return setError("Chọn file .zip bản build (chứa index.html).");
    for (const pf of chosen)
      if (installers[pf]!.size > MAX_FILE_BYTES)
        return setError(`Bộ cài ${PLATFORM_LABEL[pf]} vượt 50MB (giới hạn Supabase gói Free).`);

    setBusy(true);
    try {
      const fd = new FormData(form);
      if (isNewHosted) {
        let url = buildUrl;
        if (!url) {
          const { gameId } = await uploadHostedBuild(build!, setProgress);
          url = `/g/${gameId}/index.html`;
          setBuildUrl(url);
        }
        fd.set("game_url", url);
        fd.set("hosted_new", "1");
      }
      if (cover) {
        setProgress(`Đang tải ảnh bìa (${mb(cover.size)}MB)…`);
        const t = unwrap(await createProductUpload({ purpose: "cover", fileName: cover.name }));
        await upload(t.bucket, t.path, t.token, cover);
        fd.set("cover_path", t.path);
      }
      if (download) {
        setProgress(`Đang tải file (${mb(download.size)}MB)…`);
        const t = unwrap(await createProductUpload({ purpose: "download", fileName: download.name }));
        await upload(t.bucket, t.path, t.token, download);
        fd.set("download_path", t.path);
      }

      // Logo + ảnh / video minh họa: tải file mới lên trước, rồi gửi danh sách cuối cùng (gallery_json).
      if (logo) {
        setProgress("Đang tải logo…");
        const t = unwrap(await createProductUpload({ purpose: "logo", fileName: logo.name }));
        await upload(t.bucket, t.path, t.token, logo);
        fd.set("logo_path", t.path);
      } else if (logoRemove) fd.set("logo_remove", "1");
      const gallery: GalleryItem[] = [];
      for (const [i, d] of media.entries()) {
        if (d.kind === "saved") gallery.push(d.item);
        else if (d.kind === "youtube") gallery.push({ type: "youtube", id: d.id });
        else {
          setProgress(`Đang tải ${d.type === "video" ? "video" : "ảnh"} minh họa ${i + 1}/${media.length} (${mb(d.file.size)}MB)…`);
          const t = unwrap(await createProductUpload({ purpose: "media", fileName: d.file.name }));
          await upload(t.bucket, t.path, t.token, d.file);
          const url = createStoreAuthBrowserClient().storage.from(t.bucket).getPublicUrl(t.path).data.publicUrl;
          gallery.push({ type: d.type, url });
        }
      }
      fd.set("gallery_json", JSON.stringify(gallery));

      setProgress("Đang lưu thông tin…");
      fd.set("has_installer", chosen.length ? "1" : "0");
      const res = await saveProductData(fd);
      if (res.error || !res.id) throw new Error(res.error ?? "Lỗi lưu sản phẩm.");
      // Lưu được rồi → bấm lại (nếu bước sau lỗi) là cập nhật, không tạo trùng, không tải lại file đã lưu.
      setSavedId(res.id);
      if (cover) { setCover(null); resetFile("cover"); }
      // File đã tải lên → coi như đã lưu (bấm Lưu lần nữa không tải lại).
      setMedia(gallery.map((item) => ({ kind: "saved", item })));
      if (logo) setLogo(null);
      if (fd.get("logo_path")) setCurrentLogo(createStoreAuthBrowserClient().storage.from("product-covers").getPublicUrl(String(fd.get("logo_path"))).data.publicUrl);
      if (logoRemove) { setCurrentLogo(null); setLogoRemove(false); }
      if (download) { setDownload(null); resetFile("download"); }

      for (const pf of chosen) {
        const f = installers[pf]!;
        setProgress(`Đang tải bộ cài ${PLATFORM_LABEL[pf]} (${mb(f.size)}MB)…`);
        const { path, token } = unwrap(await createReleaseUpload({ productId: res.id, platform: pf, version: v, fileName: f.name }));
        await upload("product-files", path, token, f);
        unwrap(await saveRelease({ productId: res.id, platform: pf, version: v, path, fileName: f.name, sizeBytes: f.size, notes }));
        setInstallers((prev) => ({ ...prev, [pf]: null }));
        resetFile(pf);
      }

      setProgress("Đã lưu.");
      setVersion("");
      setNotes("");
      // Phần mềm (thêm bộ cài) và link ngoài mới (tạo khóa bí mật cho Ví) cần quay lại trang Sửa.
      router.push(isSoftware || (!p && preset === "link") ? `/admin/products/${res.id}/edit` : "/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi khi lưu.");
      setProgress("");
    } finally {
      setBusy(false);
    }
  }

  const perpetual = PERPETUAL.includes(type);
  const pricePoints = vndToPoints(Number(price) || 0);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {(p || savedId) && <input type="hidden" name="id" value={p?.id ?? savedId ?? ""} />}
      {/* Mốc lúc mở form — server từ chối ghi nếu người khác đã sửa sau mốc này (tránh ghi đè). Sau khi lưu xong trong
          cùng phiên thì bỏ (savedId) để lưu tiếp không bị chặn bởi chính mình. */}
      {p && !savedId && <input type="hidden" name="updated_at" value={p.updated_at} />}

      <Field label="Tiêu đề *">
        <input name="title" required defaultValue={p?.title} className={input} />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={slugLockedReason ? "Slug (đã khóa)" : "Slug (để trống = tự tạo từ tiêu đề)"}>
          <input
            name="slug"
            defaultValue={p?.slug}
            readOnly={!!slugLockedReason}
            className={`${input} ${slugLockedReason ? "cursor-not-allowed opacity-60" : ""}`}
            placeholder="tu-dong"
          />
          {slugLockedReason && (
            <Hint>Không đổi được vì sản phẩm đã có {slugLockedReason} — link, API phần mềm và Giáo Lý Số dựa vào slug.</Hint>
          )}
        </Field>
        <Field label="Loại *">
          <select name="type" value={type} onChange={(e) => setType(e.target.value as ProductType)} className={input}>
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

      <DescriptionEditor html={p?.description_html} text={p?.description} />

      <div className="grid gap-5 sm:grid-cols-2">
        {/* div thay vì Field (label): khung "+ Thêm mới" nằm bên trong, label sẽ cướp focus. */}
        <div>
          <span className="mb-1 block text-sm text-text-muted">Danh mục *</span>
          <SelectWithCreate kind="category" name="category_id" options={categories} defaultValue={p?.category_id ?? defaultCategoryId} />
        </div>
        <div>
          <span className="mb-1 block text-sm text-text-muted">Nhà phát hành *</span>
          <SelectWithCreate kind="publisher" name="publisher_id" options={publishers} defaultValue={p?.publisher_id ?? defaultPublisherId} />
        </div>
      </div>

      {/* ===== Bán ===== */}
      <div className="rounded-lg border border-border bg-surface-hover/40 p-4">
        <div className="mb-3 text-sm font-semibold text-text">Bán</div>
        {isHosted && type === "tool" ? (
          <p className="text-sm text-text-muted">
            Công cụ web mở tự do cho người đã đăng nhập. Thu tiền theo lượt dùng qua <b>Ví Ephata</b> (trừ point trong công cụ).
          </p>
        ) : isSoftware ? (
          <Field label="Giá key (VND) — mua 1 lần, dùng vĩnh viễn">
            <input type="number" name="price" min={0} step={1000} value={price} onChange={(e) => setPrice(e.target.value)} className={input} />
            <Hint>
              = {pricePoints.toLocaleString("vi-VN")} point (100đ = 1 point). Phần mềm luôn trả point — không miễn phí cho
              Pro Giáo Lý Số / Full Topping.
            </Hint>
          </Field>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-5">
              <Radio name="sale" value="free" checked={sale === "free"} onChange={() => setSale("free")} label="Miễn phí" />
              <Radio
                name="sale"
                value="paid"
                checked={sale === "paid"}
                onChange={() => setSale("paid")}
                label={perpetual ? "Có phí — mua 1 lần, dùng vĩnh viễn" : "Có phí — thuê bao"}
              />
            </div>
            {sale === "free" && (
              <Hint>Ai đăng nhập cũng dùng được — ưu đãi Pro Giáo Lý Số chỉ áp cho sản phẩm có phí.</Hint>
            )}
            {sale === "paid" && (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label={perpetual ? "Giá mua vĩnh viễn (VND) *" : "Giá / tháng (VND) *"}>
                    <input type="number" name="price" min={1000} step={1000} required value={price} onChange={(e) => setPrice(e.target.value)} className={input} />
                    <Hint>
                      {perpetual
                        ? `= ${pricePoints.toLocaleString("vi-VN")} point`
                        : `Gói năm = ${(pricePoints * 12).toLocaleString("vi-VN")} point · mua lẻ N ngày = ${pricePoints.toLocaleString("vi-VN")} point (N đặt ở Cài đặt)`}
                    </Hint>
                  </Field>
                  <Field label="Giá gốc (nếu đang giảm giá)">
                    <input type="number" name="original_price_vnd" min={0} step={1000} defaultValue={p?.original_price_vnd ?? ""} className={input} />
                  </Field>
                </div>
                {!perpetual && (
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-text">
                      <input type="checkbox" name="trial" checked={trial} onChange={(e) => setTrial(e.target.checked)} className="h-4 w-4" />
                      Cho dùng thử
                    </label>
                    {trial && (
                      <label className="flex items-center gap-2 text-sm text-text-muted">
                        <input type="number" name="trial_days" min={1} max={60} defaultValue={p?.trial_days ?? 7} className={`${input} w-20`} />
                        ngày
                      </label>
                    )}
                  </div>
                )}
                <label className="flex items-start gap-2 text-sm text-text">
                  <input type="checkbox" name="giaoly_pro_free" defaultChecked={p ? p.giaoly_pro_free : false} className="mt-0.5 h-4 w-4" />
                  <span>
                    Miễn phí cho tài khoản <b>Pro Giáo Lý Số</b>
                    <Hint>Không tick: giáo xứ có Pro vẫn phải mua như mọi người.</Hint>
                  </span>
                </label>
              </>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tags (cách nhau bằng dấu phẩy)">
          <input name="tags" defaultValue={p?.tags?.join(", ")} className={input} placeholder="giáo lý, quản lý" />
        </Field>
        <Field label="Ngày phát hành">
          <input type="date" name="released_at" defaultValue={p ? (p.released_at ?? "") : todayVN()} className={input} />
        </Field>
      </div>

      <div>
        <span className="mb-1 block text-sm text-text-muted">Ảnh bìa (16:9)</span>
        {p?.cover_url && (
          <div className="mb-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.cover_url} alt="Ảnh bìa hiện tại" className="h-32 rounded-md border border-border object-cover" />
            <Hint>Ảnh hiện tại — chọn ảnh mới để thay.</Hint>
          </div>
        )}
        <FileInput
          key={`cover-${fileKeys.cover ?? 0}`}
          accept="image/png,image/jpeg,image/webp,image/gif"
          onChange={setCover}
        />
        <Hint>
          Chuẩn 1600×900 (16:9), JPG / WebP / PNG, tối đa 5MB (nên ≤ 1MB). Đặt hình và chữ chính ở giữa — thẻ sản phẩm hiện ảnh nhỏ
          (~300px ngang). Ảnh khác tỉ lệ sẽ bị cắt. Bỏ trống nếu giữ ảnh cũ / dùng gradient.
        </Hint>
      </div>

      <MediaFields
        currentLogo={currentLogo}
        logo={logo}
        setLogo={setLogo}
        logoRemove={logoRemove}
        setLogoRemove={setLogoRemove}
        items={media}
        setItems={setMedia}
        onError={setError}
      />

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
                key={`windows-${fileKeys.windows ?? 0}`}
                label="Bộ cài .exe — tải trực tiếp nếu chưa có Store; có Store thì làm link dự phòng"
                accept=".exe,.msi"
                current={currentReleases.windows}
                onChange={(f) => setInstallers((prev) => ({ ...prev, windows: f }))}
              />
            </div>
            <div className="space-y-3 rounded-md border border-border bg-surface p-3">
              <div className="text-sm font-semibold text-text">macOS</div>
              <InstallerInput
                key={`macos-${fileKeys.macos ?? 0}`}
                label="Bộ cài .dmg"
                accept=".dmg"
                current={currentReleases.macos}
                onChange={(f) => setInstallers((prev) => ({ ...prev, macos: f }))}
              />
            </div>
          </div>

          <div className="mb-3 mt-5 text-sm font-semibold text-text">Cấp phép</div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Số thiết bị / key">
              <input type="number" name="license_device_limit" min={1} max={50} defaultValue={p?.license_device_limit ?? 2} className={input} />
              <Hint>Đổi số này chỉ áp cho key cấp sau đó; key đã bán giữ số cũ.</Hint>
            </Field>
            <div>
              <Field label="Hạn dùng offline (ngày)">
                <input
                  type="number"
                  name="license_offline_days"
                  min={1}
                  max={365}
                  disabled={offlineForever}
                  defaultValue={p?.license_offline_days || 30}
                  className={`${input} disabled:opacity-50`}
                />
              </Field>
              <label className="mt-2 flex items-center gap-2 text-sm text-text">
                <input
                  type="checkbox"
                  name="license_offline_forever"
                  checked={offlineForever}
                  onChange={(e) => setOfflineForever(e.target.checked)}
                  className="h-4 w-4"
                />
                Vĩnh viễn
              </label>
              <Hint>
                {offlineForever
                  ? "Kích hoạt 1 lần là dùng mãi không cần mạng. Thu hồi key / gỡ thiết bị chỉ có hiệu lực khi app có mạng lại."
                  : "Quá số ngày này không có mạng, app phải kết nối lại để xác minh key."}
              </Hint>
            </div>
          </div>
        </div>
      )}

      {isNewHosted && (
        <div className="rounded-lg border border-border bg-surface-hover/40 p-4">
          <div className="mb-3 text-sm font-semibold text-text">Bản build</div>
          <span className="mb-1 block text-sm text-text-muted">File .zip — chứa index.html + tài nguyên *</span>
          <FileInput
            accept=".zip,application/zip"
            onChange={(f) => {
              setBuild(f);
              setBuildUrl(null);
            }}
          />
          <Hint>
            Hệ thống tự giải nén, host và chạy thẳng trên store. Dùng đường dẫn tương đối, mỗi file tối đa 50MB. Thay bản build
            sau này ở trang Sửa (giữ được bản trước để quay lại).
          </Hint>
        </div>
      )}

      {!isSoftware && !isHosted && (
        <div className="rounded-lg border border-border bg-surface-hover/40 p-4">
          <div className="mb-3 text-sm font-semibold text-text">Giao hàng</div>

          {showDownload && (
            <div>
              <span className="mb-1 block text-sm text-text-muted">File tải về (PDF / DOCX / ảnh / .zip)</span>
              {p?.download_path && (
                <div className="mb-2 text-xs text-text-muted">
                  File hiện tại: <code className="text-text">{p.download_path.split("/").pop()}</code>
                </div>
              )}
              <FileInput key={`download-${fileKeys.download ?? 0}`} onChange={setDownload} />
              <Hint>
                Tối đa 50MB. Tên file không dấu. Chỉ người đã mua mới tải được (link ký có hạn 24 giờ).
                {p?.download_path && " Chọn file mới = file cũ bị xóa ngay khi lưu; người đã mua tải bản mới."}
              </Hint>
            </div>
          )}

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            {showGameUrl && (
              <Field label="URL game (loại game) — nhúng ở /play">
                <input name="game_url" defaultValue={p?.game_url ?? ""} className={input} placeholder="/g/…/index.html" />
              </Field>
            )}
            {showLink && (
              <Field label="URL app ngoài — mở khi đã sở hữu">
                <input
                  name="app_url"
                  type="url"
                  required
                  pattern="https://.+"
                  title="URL bắt đầu bằng https://"
                  defaultValue={p?.app_url ?? ""}
                  className={input}
                  placeholder="https://app.example.com"
                />
              </Field>
            )}
            {showFeature && (
              <Field label="Feature key (bật tính năng bên Giáo Lý Số)">
                <input
                  name="giaoly_feature_key"
                  required
                  pattern="[a-z0-9_]{3,50}"
                  title="3–50 ký tự a–z, 0–9, gạch dưới"
                  readOnly={!!slugLockedReason && !!p?.giaoly_feature_key}
                  defaultValue={p?.giaoly_feature_key ?? ""}
                  className={input}
                  placeholder="vd: lich_phung_vu"
                />
                <Hint>
                  {slugLockedReason && p?.giaoly_feature_key
                    ? `Khóa vì sản phẩm đã có ${slugLockedReason} — đổi key làm Giáo Lý Số mất đồng bộ.`
                    : "Phải trùng đúng key bên Giáo Lý Số. Đã bán thì không đổi được."}
                </Hint>
              </Field>
            )}
          </div>
        </div>
      )}

      {!isSoftware && preset !== "download" && (type === "tool" || type === "game") && (
        <div className="rounded-lg border border-border bg-surface-hover/40 p-4">
          <input type="hidden" name="uses_wallet_field" value="1" />
          <label className="flex items-start gap-2 text-sm text-text">
            <input type="checkbox" name="uses_wallet" defaultChecked={p?.uses_wallet ?? false} className="mt-0.5 h-4 w-4" />
            <span>
              <b>App trừ point qua Ví Ephata</b> (tính phí theo lượt dùng dịch vụ trong app)
              <Hint>
                Người dùng được hỏi cho phép một lần khi mở app; app gọi /api/apps/v1/charge để trừ point.
                {preset !== "hosted" && " App ngoài cần khóa bí mật server — tạo ở khung bên dưới sau khi lưu."}
              </Hint>
            </span>
          </label>
        </div>
      )}

      <div className="flex flex-wrap gap-5">
        <Check name="published" label="Đang bán" defaultChecked={p ? p.published : !isSoftware} />
        <input type="hidden" name="active_field" value="1" />
        <Check name="active" label="Hiện trên store" defaultChecked={p ? p.active : true} />
        <Check name="featured" label="Nổi bật" defaultChecked={p?.featured} />
        <Check name="is_new" label="Mới" defaultChecked={p ? p.is_new : true} />
        <Check name="is_popular" label="Phổ biến" defaultChecked={p?.is_popular} />
      </div>

      <Hint>
        Sản phẩm chỉ hiện và mua được khi bật <b>cả hai</b> ô. Tắt <b>Đang bán</b> = gỡ hẳn: người đã mua cũng không mở được game /
        công cụ / app. Tắt <b>Hiện trên store</b> = ẩn khỏi danh mục và không bán thêm, người đã mua vẫn dùng được từ Thư viện.
        {isSoftware && " Phần mềm cần ít nhất một bộ cài (hoặc link Microsoft Store) mới bật được Đang bán."}
      </Hint>

      {error && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-accent px-5 py-2 font-semibold text-accent-contrast hover:bg-accent-hover disabled:opacity-60"
        >
          {busy ? "Đang lưu…" : "Lưu"}
        </button>
        <Link href="/admin" className="text-sm text-text-muted hover:text-text">
          Huỷ
        </Link>
        {progress && <span className="text-sm text-text-muted">{progress}</span>}
      </div>
    </form>
  );
}

const input =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-text focus:border-accent focus:outline-none";
const fileInput =
  "block w-full text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-surface file:px-3 file:py-1.5 file:text-text hover:file:bg-surface-hover";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-text-muted">{label}</span>
      {children}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <span className="mt-1 block text-xs text-text-faint">{children}</span>;
}

function Radio({
  name,
  value,
  checked,
  onChange,
  label,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-text">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="h-4 w-4" />
      {label}
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

/** Ô chọn file không có name → không đi qua server action; form tải thẳng lên Storage. */
function FileInput({ accept, onChange }: { accept?: string; onChange: (f: File | null) => void }) {
  return (
    <input type="file" accept={accept} onChange={(e) => onChange(e.target.files?.[0] ?? null)} className={fileInput} />
  );
}

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
    <div>
      <span className="mb-1 block text-sm text-text-muted">{label}</span>
      {current && (
        <span className="mb-1.5 block text-xs text-text-muted">
          Hiện tại: <b className="text-text">v{current.version}</b> · {current.file_name}
        </span>
      )}
      <FileInput accept={accept} onChange={onChange} />
    </div>
  );
}

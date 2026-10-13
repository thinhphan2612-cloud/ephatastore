import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelated } from "@/data/products";
import { getCategoryBySlug } from "@/data/categories";
import { sanitizeDescription } from "@/lib/rich-text";
import { noticeText } from "@/lib/notices";
import { Expandable } from "@/components/expandable";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentUserPlan } from "@/lib/plan";
import { getGiaolyContext } from "@/lib/giaoly-context";
import { getEntitlement, getParishEntitlement, getToppingUntil } from "@/data/store-user";
import { getSettings } from "@/data/settings";
import { claimProduct, startTrial } from "@/lib/actions/store";
import { vndToPoints } from "@/lib/points";
import { formatDate, formatPrice } from "@/lib/format";
import { TYPE_LABEL } from "@/lib/labels";
import { OwnedActions } from "@/components/owned-actions";
import { AddToGiaolyButton } from "@/components/add-to-giaoly-button";
import { ProductRow } from "@/components/product-row";
import { getMyLicenseKey, getSoftwareProduct, latestReleases } from "@/data/software";
import { PLATFORMS, PLATFORM_LABEL, type Platform } from "@/lib/software/version";
import { MediaGallery } from "@/components/media-gallery";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return { title: product?.title ?? "Sản phẩm", description: product?.tagline };
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { slug } = await params;
  const notice = noticeText((await searchParams).notice);
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const category = await getCategoryBySlug(product.categoryId);
  const related = await getRelated(product);
  const isGame = product.type === "game";
  const isHostedTool = product.type === "tool" && !!product.gameUrl;
  const isProTier = product.tier === "pro";
  const isSoftware = product.type === "software";

  const user = await getCurrentUser();
  const plan = user ? await getCurrentUserPlan() : "free";
  // Quyền hiện tại (kể cả đã hết hạn — để báo "đã hết hạn" và ẩn nút dùng thử lần 2).
  // Tính năng Giáo Lý Số: quyền của GIÁO XỨ người xem (mọi quản trị dùng chung); sản phẩm khác: quyền của chính người xem.
  const viewerParish = user && product.giaolyFeatureKey ? (await getGiaolyContext())?.parishId : null;
  const ent = !user || isSoftware
    ? null
    : product.giaolyFeatureKey
      ? viewerParish
        ? await getParishEntitlement(viewerParish, product.id)
        : null
      : await getEntitlement(user.id, product.id);
  const ownedEnt = !!ent?.active;
  // Full Topping mở mọi sản phẩm PRO (file tải về, game, công cụ) — trừ phần mềm bán key; tính năng GLS cần quyền thật.
  const toppingUntil = user && !isSoftware && isProTier ? await getToppingUntil(user.id) : null;
  const topping = !!toppingUntil;

  const annual = product.priceMonth * 12;
  const annualPoints = vndToPoints(annual);
  const freedomPoints = vndToPoints(product.priceMonth);
  const gamePoints = vndToPoints(product.priceMonth);
  const perpetualPoints = vndToPoints(product.priceMonth);
  const { freedomDays } = await getSettings();
  // Pro Giáo Lý Số chỉ được free ở sản phẩm gắn nhãn "Miễn phí cho Pro Giáo Lý Số".
  const hasPro = plan === "pro" && product.giaolyProFree;
  const isGiaolyPro = plan === "pro";
  // Tính năng Giáo Lý Số: bật cho cả giáo xứ → chỉ quản trị giáo xứ đã liên kết mới mua; phải có quyền thật
  // (mua / kích hoạt) để Ephata gửi lệnh bật sang Giáo Lý Số — Pro hay Full Topping không tự mở.
  const featureKey = product.giaolyFeatureKey;
  const giaolyCtx = featureKey && user ? await getGiaolyContext() : null;
  const canBuyFeature = !featureKey || (giaolyCtx?.role === "admin" && !!giaolyCtx.parishId);
  const featureBlocked = featureKey && !canBuyFeature && (
    <div className="rounded-xl border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
      {!user ? (
        <>Đăng nhập bằng tài khoản quản trị giáo xứ để mua tính năng này.</>
      ) : !giaolyCtx ? (
        <>
          Tính năng bật cho cả giáo xứ trên Giáo Lý Số. <Link href="/account" className="underline">Liên kết tài khoản Giáo Lý Số</Link>{" "}
          (quản trị giáo xứ) để mua.
        </>
      ) : (
        <>Chỉ quản trị giáo xứ mới mua được tính năng này cho giáo xứ.</>
      )}
    </div>
  );
  const isFreeGame = isGame && !isProTier && product.priceMonth <= 0;
  const isDownloadable = product.type === "asset" || product.type === "image";

  return (
    <div className="mx-auto w-[min(1180px,calc(100%-40px))] py-10">
      <nav className="mb-5 text-sm text-text-faint">
        <Link href="/" className="hover:text-text">
          Cửa hàng
        </Link>
        {category && (
          <>
            <span className="mx-1.5">/</span>
            <Link href={`/category/${category.slug}`} className="hover:text-text">
              {category.name}
            </Link>
          </>
        )}
        <span className="mx-1.5">/</span>
        <span className="text-text-muted">{product.title}</span>
      </nav>

      {/* Hàng trên: ảnh bìa | card thông tin nằm ngang nhau. Giới thiệu ở dưới, rộng hết trang. */}
      <div className="grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0">
          {/* Ảnh bìa + tối đa 4 ảnh / video minh họa (khung lớn + thumbnail). Không có ảnh nào → logo / icon trên nền mặc định. */}
          <MediaGallery
            title={product.title}
            coverUrl={product.coverUrl || undefined}
            items={product.gallery}
            fallback={
              product.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.logoUrl} alt="" className="h-24 w-24 rounded-3xl object-cover shadow-lg" />
              ) : (
                <span className="text-[64px]">{product.icon ?? "✦"}</span>
              )
            }
          />
        </div>

        <aside className="min-w-0 space-y-4">
          <div className="rounded-3xl border border-border bg-surface p-5">
            {/* Logo ngang hàng tên — gọn để card cân với khung ảnh bên trái. */}
            <div className="flex items-start gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-accent/30 bg-accent/10 text-[22px] text-accent">
                {product.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.logoUrl} alt={`Logo ${product.title}`} className="h-full w-full object-cover" />
                ) : (
                  (product.icon ?? "✦")
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] uppercase tracking-[0.13em] text-text-faint">{TYPE_LABEL[product.type]}</span>
                  <span
                    className={`shrink-0 rounded-full border px-2 py-1 text-[9px] font-black tracking-[0.14em] ${
                      isProTier ? "border-accent text-accent" : "border-success text-success"
                    }`}
                  >
                    {/* Nhãn loại đã ở dòng trên → huy hiệu chỉ báo có phí / miễn phí. Phần mềm: luôn có bản miễn phí + key Pro. */}
                    {isSoftware ? "FREE + PRO" : isProTier ? "PRO" : "FREE"}
                  </span>
                </div>
                <h1 className="font-display text-[24px] font-bold leading-tight">{product.title}</h1>
              </div>
            </div>
            <p className="mt-2.5 text-sm text-text-muted">{product.tagline}</p>
            {product.publisher.slug && (
              <p className="mt-1 text-xs text-text-faint">
                Phát hành bởi <span className="font-medium text-text">{product.publisher.name}</span>
                {product.publisher.verified && (
                  <span className="ml-1 text-accent" title="Nhà phát hành đã xác minh">
                    ✓
                  </span>
                )}
              </p>
            )}
            {notice && (
              <p role="alert" className="mt-3 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                {notice}
              </p>
            )}
            {/* Trạng thái quyền của người đang xem: hạn dùng / qua Full Topping / đã hết hạn. */}
            {ownedEnt && ent?.expiresAt ? (
              <p className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-xs text-success">
                <span>
                  ✓ {product.giaolyFeatureKey ? "Giáo xứ " : ""}
                  {ent.source === "trial" ? (product.giaolyFeatureKey ? "đang dùng thử" : "Đang dùng thử") : product.giaolyFeatureKey ? "đang dùng" : "Bạn đang dùng"} đến{" "}
                  <b>{formatDate(ent.expiresAt)}</b>
                </span>
                <Link href={`/buy/${product.id}?kind=annual`} className="font-semibold underline">
                  {ent.source === "trial" ? "Mua gói năm" : "Gia hạn"}
                </Link>
              </p>
            ) : !ownedEnt && topping && !featureKey ? (
              <p className="mt-3 rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-xs text-accent">
                ✦ Bạn dùng được qua Full Topping (đến {formatDate(toppingUntil!)})
              </p>
            ) : ent && !ent.active && ent.expiresAt ? (
              <p className="mt-3 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
                {ent.source === "trial" ? "Thời gian dùng thử" : "Quyền dùng"} đã hết hạn ngày {formatDate(ent.expiresAt)} — mua để
                dùng tiếp.
              </p>
            ) : null}
            {featureKey && (
              <p className="mt-3 rounded-xl border border-border bg-surface-hover/60 px-3 py-2 text-xs text-text-muted">
                🧩 Tính năng trong Giáo Lý Số — bật cho <b className="text-text">cả giáo xứ</b> của bạn sau khi mua.
              </p>
            )}
            {product.usesWallet && (
              <p className="mt-3 rounded-xl border border-border bg-surface-hover/60 px-3 py-2 text-xs text-text-muted">
                ◈ Một số dịch vụ trong ứng dụng tính phí theo lượt dùng — trừ point trong Ví Ephata (bạn được hỏi trước khi
                kết nối).
              </p>
            )}

            {isSoftware ? (
              <SoftwarePanel productId={product.id} slug={product.slug} priceVnd={product.priceMonth} userId={user?.id} />
            ) : isHostedTool ? (
              /* ===== CÔNG CỤ WEB host nội bộ: mở tự do, AI trừ point ===== */
              <>
                <div className="mt-5 rounded-2xl border border-border bg-surface-hover/60 p-4 text-sm">
                  <div className="font-semibold text-text">Công cụ web trên Ephata Store</div>
                  <p className="mt-1 text-text-muted">
                    Mở và dùng trực tiếp trong store. Một số dịch vụ trong công cụ có thể trừ point trong Ví của bạn.
                  </p>
                </div>
                <div className="mt-5 space-y-2">
                  {user ? (
                    <Link
                      href={`/play/${product.slug}`}
                      className="block w-full rounded-xl bg-accent px-4 py-3 text-center font-extrabold text-accent-contrast hover:bg-accent-hover"
                    >
                      Mở công cụ →
                    </Link>
                  ) : (
                    <Link
                      href={`/login?next=/play/${product.slug}`}
                      className="block w-full rounded-xl bg-accent px-4 py-3 text-center font-extrabold text-accent-contrast hover:bg-accent-hover"
                    >
                      Đăng nhập để dùng →
                    </Link>
                  )}
                  <Link href="/wallet" className="block text-center text-xs text-text-faint hover:text-text">
                    Nạp point vào Ví →
                  </Link>
                </div>
              </>
            ) : isGame ? (
              /* ===== GAME: free / mua vĩnh viễn bằng point (Pro Giáo Lý Số free nếu sản phẩm gắn nhãn) ===== */
              <>
                <div className="mt-5 rounded-2xl border border-border bg-surface-hover/60 p-4 text-sm">
                  <div className="font-semibold text-text">Game trên Ephata Store</div>
                  <p className="mt-1 text-text-muted">
                    {hasPro
                      ? "Bạn có gói Pro Giáo Lý Số — chơi miễn phí và thêm được vào Giáo Lý Số."
                      : ownedEnt
                        ? "Bạn đã sở hữu game này — chơi ngay."
                        : topping
                          ? "Bạn có Full Topping — chơi ngay."
                          : isFreeGame
                        ? "Game miễn phí — chơi ngay."
                        : product.giaolyProFree
                          ? "Có Pro Giáo Lý Số thì chơi miễn phí, hoặc mua bằng point."
                          : "Mua bằng point để chơi."}
                  </p>
                </div>
                <div className="mt-5 space-y-2">
                  {hasPro || ownedEnt || isFreeGame || topping ? (
                    <>
                      <OwnedActions product={product} className="w-full" />
                      {isGiaolyPro && <AddToGiaolyButton productId={product.id} />}
                    </>
                  ) : (
                    <Link
                      href={`/buy/${product.id}?kind=perpetual`}
                      className="block w-full rounded-xl bg-accent px-4 py-3 text-center font-extrabold text-accent-contrast hover:bg-accent-hover"
                    >
                      Mua bằng point · {gamePoints.toLocaleString("vi-VN")} point →
                    </Link>
                  )}
                </div>
              </>
            ) : !isProTier ? (
              /* ===== SẢN PHẨM FREE ===== */
              <>
                <div className="mt-5 rounded-2xl border border-border bg-surface-hover/60 p-4 text-sm">
                  <b className="text-[24px]">
                    0đ <small className="text-xs font-semibold text-text-muted">/ miễn phí</small>
                  </b>
                </div>
                <div className="mt-5 space-y-2">
                  {ownedEnt ? (
                    <OwnedActions product={product} className="w-full" />
                  ) : featureBlocked ? (
                    featureBlocked
                  ) : (
                    <form action={claimProduct}>
                      <input type="hidden" name="product_id" value={product.id} />
                      <input type="hidden" name="slug" value={product.slug} />
                      <button type="submit" className="w-full rounded-xl bg-accent px-4 py-3 font-extrabold text-accent-contrast hover:bg-accent-hover">
                        Nhận miễn phí →
                      </button>
                    </form>
                  )}
                </div>
              </>
            ) : isDownloadable ? (
              /* ===== FILE TẢI VỀ: mua vĩnh viễn ===== */
              <>
                <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface-hover/60 p-4">
                  <div>
                    <span className="mb-1.5 block text-[11px] text-text-faint">Mua vĩnh viễn</span>
                    <b className="text-[27px]">
                      {perpetualPoints.toLocaleString("vi-VN")}
                      <small className="ml-1 text-xs font-semibold text-text-muted">point</small>
                    </b>
                  </div>
                  <div className="border-l border-border pl-4 text-xs leading-5 text-text-muted">
                    {hasPro ? (
                      <strong className="text-accent">Miễn phí với Pro Giáo Lý Số</strong>
                    ) : (
                      <>≈ {formatPrice(product.priceMonth)} · tải về dùng mãi</>
                    )}
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  {hasPro || ownedEnt || topping ? (
                    <OwnedActions product={product} className="w-full" />
                  ) : (
                    <Link
                      href={`/buy/${product.id}?kind=perpetual`}
                      className="block w-full rounded-xl bg-accent px-4 py-3 text-center font-extrabold text-accent-contrast hover:bg-accent-hover"
                    >
                      Mua · {perpetualPoints.toLocaleString("vi-VN")} point (vĩnh viễn) →
                    </Link>
                  )}
                </div>
              </>
            ) : (
              /* ===== SẢN PHẨM PRO (tool/feature — thuê bao) ===== */
              <>
                <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl border border-border bg-surface-hover/60 p-4">
                  <div>
                    <span className="mb-1.5 block text-[11px] text-text-faint">Gói năm</span>
                    <b className="text-[27px]">
                      {annualPoints.toLocaleString("vi-VN")}
                      <small className="ml-1 text-xs font-semibold text-text-muted">point</small>
                    </b>
                  </div>
                  <div className="border-l border-border pl-4 text-xs leading-5 text-text-muted">
                    {hasPro ? (
                      <strong className="text-accent">Miễn phí với Pro Giáo Lý Số</strong>
                    ) : (
                      <>≈ {formatPrice(annual)} · 100đ = 1 point</>
                    )}
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  {(featureKey ? ownedEnt : hasPro || ownedEnt || topping) ? (
                    <>
                      <OwnedActions product={product} className="w-full" />
                      <Link href="/library" className="block text-center text-xs text-text-faint hover:text-text">
                        Mở Thư viện
                      </Link>
                    </>
                  ) : featureBlocked ? (
                    featureBlocked
                  ) : featureKey && hasPro ? (
                    <Link
                      href={`/buy/${product.id}?kind=annual`}
                      className="block w-full rounded-xl bg-accent px-4 py-3 text-center font-extrabold text-accent-contrast hover:bg-accent-hover"
                    >
                      Kích hoạt miễn phí cho giáo xứ (Pro Giáo Lý Số) →
                    </Link>
                  ) : (
                    <>
                      <Link
                        href={`/buy/${product.id}?kind=annual`}
                        className="block w-full rounded-xl bg-accent px-4 py-3 text-center font-extrabold text-accent-contrast hover:bg-accent-hover"
                      >
                        Mua gói năm · {annualPoints.toLocaleString("vi-VN")} point →
                      </Link>
                      <Link
                        href={`/buy/${product.id}?kind=freedom`}
                        className="block w-full rounded-xl border border-border-strong bg-surface px-4 py-3 text-center text-sm font-bold text-text hover:border-accent/50"
                      >
                        Mua lẻ {freedomDays} ngày · {freedomPoints.toLocaleString("vi-VN")} point
                      </Link>
                      {/* Dùng thử chỉ 1 lần: đã từng có quyền (thử / mua) với sản phẩm này thì ẩn. */}
                      {product.trial && !ent && (
                        <form action={startTrial}>
                          <input type="hidden" name="product_id" value={product.id} />
                          <input type="hidden" name="slug" value={product.slug} />
                          <button type="submit" className="w-full rounded-xl border border-border px-4 py-3 text-sm font-bold text-text-muted hover:border-accent/50 hover:text-text">
                            Dùng thử {product.trialDays} ngày miễn phí
                          </button>
                        </form>
                      )}
                      {!featureKey && (
                        <Link href="/topping" className="block pt-1 text-center text-xs text-accent-hover hover:underline">
                          hoặc mở khoá tất cả PRO với Full Topping →
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Khung nền liền rộng hết trang; nội dung là cột giữa ≤880px. min-w-0: bảng/code rộng cuộn trong khung. */}
      <section
        className="mt-10 min-w-0 rounded-3xl border border-border bg-surface px-5 py-8 sm:px-10 sm:py-10"
        style={{ "--fade-bg": "var(--surface)" } as React.CSSProperties}
      >
        <div className="mx-auto max-w-[880px] min-w-0 space-y-6">
          <div>
            <h2 className="font-display mb-2 text-2xl font-bold">Giới thiệu</h2>
            <Expandable>
              {product.descriptionHtml ? (
                // Lọc lại khi hiển thị: chính sách lọc đổi thì nội dung cũ cũng theo.
                <div className="rich-text" dangerouslySetInnerHTML={{ __html: sanitizeDescription(product.descriptionHtml) }} />
              ) : (
                <p className="whitespace-pre-line leading-relaxed text-text-muted">{product.description}</p>
              )}
            </Expandable>
          </div>
          {product.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {product.tags.map((t) => (
                <span key={t} className="rounded-full border border-border bg-surface-hover/60 px-3 py-1 text-sm text-text-muted">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {related.length > 0 && (
        <div className="mt-12">
          <ProductRow title="Sản phẩm liên quan" products={related} />
        </div>
      )}
    </div>
  );
}

/** Đoán hệ điều hành từ user-agent — chỉ để làm nổi bật nút, không ẩn nút nào. */
function guessPlatform(ua: string): Platform | null {
  if (/iPhone|iPad|Android/i.test(ua)) return null;
  if (/Windows/i.test(ua)) return "windows";
  if (/Macintosh|Mac OS X/i.test(ua)) return "macos";
  return null;
}

/* ===== PHẦN MỀM CÀI ĐẶT: tải miễn phí + mua key bằng point (không free theo Pro / topping) ===== */
async function SoftwarePanel({
  productId,
  slug,
  priceVnd,
  userId,
}: {
  productId: string;
  slug: string;
  priceVnd: number;
  userId?: string;
}) {
  const [sw, releases, key, ua] = await Promise.all([
    getSoftwareProduct(slug),
    latestReleases(productId),
    userId ? getMyLicenseKey(userId, productId) : Promise.resolve(null),
    headers().then((h) => h.get("user-agent") ?? ""),
  ]);
  const points = vndToPoints(priceVnd);
  // Nút chính theo hệ điều hành của khách; nền tảng còn lại là một hàng gọn bên dưới.
  const os: Platform = guessPlatform(ua) ?? "windows";
  const order: Platform[] = [os, ...PLATFORMS.filter((p) => p !== os)];
  const newest = Object.values(releases).sort((a, b) => b!.created_at.localeCompare(a!.created_at))[0];
  const size = (b: number | null) => (b ? `${(b / 1048576).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB` : "");
  const deviceLimit = sw?.license_device_limit ?? 2;

  return (
    <>
      {/* Mọi phần mềm đều dùng miễn phí được — tải về đặt trước, key Pro là phần tùy chọn bên dưới. */}
      <div className="mt-4 rounded-2xl border border-success/30 bg-success/5 p-3.5">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="rounded-md bg-success/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-success">
              Bản miễn phí
            </span>
            <span className="text-[13px] font-semibold text-text">Tải về dùng ngay</span>
          </span>
          {newest && (
            <span className="text-[11px] tabular-nums text-text-faint">
              v{newest.version} · {formatDate(newest.created_at)}
            </span>
          )}
        </div>
        {/* 2 nút ngang hàng, cùng một mẫu; hệ điều hành của khách đứng trước. */}
        <div className="grid grid-cols-2 gap-2">
          {order.map((p) => {
            const rel = releases[p];
            const store = p === "windows" && sw?.ms_store_url;
            if (!rel && !store) {
              return (
                <div key={p} className="flex items-center gap-2 rounded-xl border border-dashed border-border px-2.5 py-2 text-text-faint">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-hover">
                    <OsIcon p={p} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold">{PLATFORM_LABEL[p]}</span>
                    <span className="block text-[11px]">Sắp có</span>
                  </span>
                </div>
              );
            }
            return (
              <a
                key={p}
                href={store ? sw!.ms_store_url! : `/dl/${slug}/${p}`}
                {...(store ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                title={store ? "Tải từ Microsoft Store" : `Tải ${rel!.file_name}`}
                className="flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-2.5 py-2 transition hover:border-accent/70 hover:bg-accent/15"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-contrast">
                  <OsIcon p={p} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-text">{PLATFORM_LABEL[p]}</span>
                  <span className="block truncate text-[11px] text-text-faint">
                    {store ? (
                      "Microsoft Store ↗"
                    ) : (
                      <>
                        {/* Màn hẹp: chỉ dung lượng (nút ~130px), rộng hơn mới kèm đuôi file. */}
                        <span className="hidden sm:inline">.{p === "windows" ? "exe" : "dmg"}{rel!.size_bytes ? " · " : ""}</span>
                        {rel!.size_bytes ? size(rel!.size_bytes) : <span className="sm:hidden">.{p === "windows" ? "exe" : "dmg"}</span>}
                      </>
                    )}
                  </span>
                </span>
              </a>
            );
          })}
        </div>
        {sw?.ms_store_url && releases.windows && (
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] text-text-faint">
            <span>Không dùng được Store?</span>
            <a
              href={`/dl/${slug}/windows`}
              className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-0.5 font-semibold text-text-muted transition hover:border-accent/50 hover:text-text"
            >
              <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2.5v7.5M4.75 7 8 10.25 11.25 7M3 13.25h10" />
              </svg>
              Tải .exe
              {releases.windows.size_bytes ? <span className="font-normal tabular-nums text-text-faint">· {size(releases.windows.size_bytes)}</span> : null}
            </a>
          </div>
        )}
      </div>

      {/* Key Pro: mua một lần, dùng vĩnh viễn — không bắt buộc */}
      <div className="mt-3 rounded-2xl border border-border bg-surface-hover/60 p-3.5">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-faint">Nâng cấp Pro · tùy chọn</div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <div className="flex items-baseline gap-1.5">
            <b className="text-[22px] leading-none tabular-nums">{points.toLocaleString("vi-VN")}</b>
            <span className="text-xs font-semibold text-text-muted">point</span>
          </div>
          <span className="text-[11px] text-text-faint">
            Key vĩnh viễn · ≈ {formatPrice(priceVnd)} · {deviceLimit} thiết bị
          </span>
        </div>
        {key ? (
          <Link
            href="/library"
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-extrabold text-accent-contrast hover:bg-accent-hover"
          >
            <span aria-hidden>✓</span> Đã sở hữu key Pro — xem key
          </Link>
        ) : (
          <Link
            href={`/buy/${productId}?kind=software`}
            className="mt-3 block w-full rounded-xl bg-accent px-4 py-2.5 text-center font-extrabold text-accent-contrast hover:bg-accent-hover"
          >
            Mua key Pro · {points.toLocaleString("vi-VN")} point
          </Link>
        )}
        <p className="mt-3 border-t border-border pt-2.5 text-[11px] text-text-faint">
          Bản miễn phí không cần key. Có key: cài app → mục <b className="font-semibold text-text-muted">Bản quyền</b> → dán key
          {key ? " (ở Thư viện)" : " sau khi mua"} → Kích hoạt
        </p>
      </div>
    </>
  );
}

function OsIcon({ p }: { p: Platform }) {
  return p === "windows" ? (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden fill="currentColor">
      <path d="M0 2.3 6.5 1.4v6.2H0V2.3Zm7.3-1L16 0v7.6H7.3V1.3ZM0 8.4h6.5v6.2L0 13.7V8.4Zm7.3 0H16V16l-8.7-1.2V8.4Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden fill="currentColor">
      <path d="M11.2 8.5c0-1.7 1.4-2.5 1.5-2.6-.8-1.2-2-1.3-2.5-1.3-1-.1-2 .6-2.6.6-.5 0-1.3-.6-2.2-.6C4.3 4.6 3.2 5.3 2.6 6.4c-1.2 2.1-.3 5.2.9 6.9.6.8 1.2 1.7 2.1 1.7.8 0 1.2-.5 2.2-.5s1.3.5 2.2.5c.9 0 1.5-.8 2-1.7.7-1 .9-1.9.9-2-.1 0-1.7-.7-1.7-2.8ZM9.6 3.5c.4-.5.8-1.3.7-2-.7 0-1.5.5-1.9 1-.4.5-.8 1.2-.7 1.9.7.1 1.5-.4 1.9-.9Z" />
    </svg>
  );
}

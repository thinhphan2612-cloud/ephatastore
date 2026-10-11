import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentUserPlan } from "@/lib/plan";
import { getGiaolyContext } from "@/lib/giaoly-context";
import { getBalance } from "@/data/wallet";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { getSettings } from "@/data/settings";
import { purchasePricePoints, confirmPurchase } from "@/lib/actions/purchase";
import { kindsFor, type PurchaseKind } from "@/lib/purchase-kinds";
import { quoteCoupon, type CouponQuote } from "@/lib/coupons";
import { getMyLicenseKey } from "@/data/software";
import { getToppingUntil, isOwned } from "@/data/store-user";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Xác nhận mua" };

const KIND_LABEL: Record<PurchaseKind, string> = {
  annual: "Gói năm (365 ngày)",
  freedom: "Mua lẻ",
  perpetual: "Mua vĩnh viễn",
  topping: "Full Topping",
  software: "Key bản quyền vĩnh viễn",
};


/** /buy/<productId>?kind=… — xác nhận mua sản phẩm; /buy/topping — xác nhận Full Topping (cùng một màn hình). */
export default async function BuyPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ kind?: string; coupon?: string }>;
}) {
  const { productId } = await params;
  const { kind: kindRaw, coupon: couponRaw } = await searchParams;
  const isTopping = productId === "topping";
  const kind = (isTopping ? "topping" : kindRaw ?? "annual") as PurchaseKind;

  const user = await getCurrentUser();
  if (!user) redirect(isTopping ? "/login?next=/buy/topping" : `/login?next=/buy/${productId}?kind=${kind}`);

  const [balance, settings] = await Promise.all([getBalance(user.id), getSettings()]);

  // Thông tin chung cho màn hình xác nhận.
  let item: {
    productId: string;
    title: string;
    icon: string;
    note: string;
    points: number;
    isPro: boolean;
    alreadyOwned: boolean;
    backHref: string;
    backLabel: string;
  };

  if (isTopping) {
    const until = await getToppingUntil(user.id);
    item = {
      productId: "",
      title: "Full Topping",
      icon: "✦",
      note: until
        ? `Đang bật đến ${formatDate(until)} — mua thêm sẽ cộng nối 365 ngày`
        : "365 ngày · mở khoá tất cả sản phẩm PRO",
      points: await purchasePricePoints("topping", 0),
      isPro: false,
      alreadyOwned: false,
      backHref: "/topping",
      backLabel: "← Quay lại Full Topping",
    };
  } else {
    const supabase = createStoreAdminClient();
    const { data: product } = await supabase
      .from("products")
      .select("id,slug,title,tagline,icon,type,price_month,giaoly_pro_free,published")
      .eq("id", productId)
      .maybeSingle();
    if (!product || !product.published) notFound();
    // Gói mua phải hợp loại sản phẩm (server cũng kiểm lại) — link lạ → gói đúng của sản phẩm.
    const allowed = kindsFor(product.type);
    if (!allowed.includes(kind)) redirect(`/buy/${product.id}?kind=${allowed[0]}`);
    // Mỗi tài khoản 1 key/sản phẩm — đã có thì về Thư viện xem key.
    if (kind === "software" && (await getMyLicenseKey(user.id, product.id))) redirect("/library");

    // Chỉ sản phẩm gắn nhãn "Miễn phí cho Pro Giáo Lý Số" mới free cho Pro (phần mềm không bao giờ có nhãn này).
    const isPro = kind !== "software" && product.giaoly_pro_free && (await getCurrentUserPlan()) === "pro";
    const proUntil = isPro ? (await getGiaolyContext())?.planExpiresAt : null;
    item = {
      productId: product.id,
      title: product.title,
      icon: product.icon ?? "✦",
      note: isPro
        ? `Miễn phí theo gói Pro Giáo Lý Số — dùng đến ${proUntil ? formatDate(proUntil) : "hết 365 ngày"}`
        : kind === "freedom"
          ? `Dùng ${settings.freedomDays} ngày`
          : KIND_LABEL[kind],
      points: isPro ? 0 : await purchasePricePoints(kind, product.price_month ?? 0),
      isPro,
      // Mua vĩnh viễn mà đã sở hữu → không cho trả tiền lần nữa (gói năm / mua lẻ thì mua thêm là gia hạn).
      alreadyOwned: kind === "perpetual" && (await isOwned(user.id, product.id)),
      backHref: `/product/${product.slug}`,
      backLabel: "← Quay lại sản phẩm",
    };
  }

  // Mã giảm giá: báo giá từ ?coupon= (chưa trừ lượt — trừ khi thanh toán).
  const quote: CouponQuote | null =
    couponRaw && item.points > 0 && !item.isPro && !item.alreadyOwned ? await quoteCoupon(user.id, couponRaw, item.points) : null;
  const discount = quote && "discount" in quote ? quote.discount : 0;
  const pay = item.points - discount;
  const enough = balance >= pay;
  const selfHref = isTopping ? "/buy/topping" : `/buy/${item.productId}?kind=${kind}`;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold">Xác nhận mua</h1>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-2xl text-accent">
            {item.icon}
          </div>
          <div>
            <div className="font-semibold text-text">{item.title}</div>
            <div className="text-sm text-text-muted">{item.note}</div>
          </div>
        </div>

        <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
          <Row label="Giá" value={item.isPro ? "Miễn phí (Pro Giáo Lý Số)" : `${item.points.toLocaleString("vi-VN")} point`} strong={!discount} />
          {discount > 0 && quote && (
            <>
              <Row label={`Mã ${quote.code} (${"label" in quote ? quote.label : ""})`} value={`−${discount.toLocaleString("vi-VN")} point`} />
              <Row label="Thanh toán" value={`${pay.toLocaleString("vi-VN")} point`} strong />
            </>
          )}
          <Row label="Số dư ví" value={`${balance.toLocaleString("vi-VN")} point`} />
          {!item.isPro && !item.alreadyOwned && (
            <Row label="Sau khi mua" value={`${(balance - pay).toLocaleString("vi-VN")} point`} />
          )}
        </dl>

        {item.points > 0 && !item.isPro && !item.alreadyOwned && (
          // Form GET về chính trang này → server báo giá; không cần JS.
          <form action={isTopping ? "/buy/topping" : `/buy/${item.productId}`} className="mt-4 border-t border-border pt-4">
            {!isTopping && <input type="hidden" name="kind" value={kind} />}
            <label className="block text-sm text-text-muted" htmlFor="coupon">
              Mã giảm giá
            </label>
            <div className="mt-1 flex gap-2">
              <input
                id="coupon"
                name="coupon"
                defaultValue={quote?.code ?? ""}
                maxLength={40}
                placeholder="Nhập mã nếu có"
                className="min-w-0 flex-1 rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm uppercase text-text focus:border-accent focus:outline-none"
              />
              <button type="submit" className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-text hover:border-accent">
                Áp dụng
              </button>
            </div>
            {quote && "error" in quote && <p className="mt-2 text-sm text-danger">{quote.error}</p>}
            {discount > 0 && (
              <p className="mt-2 text-sm text-success">
                Đã áp mã — giảm {discount.toLocaleString("vi-VN")} point.{" "}
                <Link href={selfHref} className="text-text-muted underline hover:text-text">
                  Bỏ mã
                </Link>
              </p>
            )}
          </form>
        )}
      </div>

      {item.alreadyOwned ? (
        <div className="mt-5 rounded-xl border border-success/40 bg-success/10 p-4 text-center text-sm">
          <p className="font-medium text-success">Bạn đã sở hữu sản phẩm này — không cần mua lại.</p>
          <Link
            href="/library"
            className="mt-3 inline-block rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-contrast hover:bg-accent-hover"
          >
            Mở Thư viện →
          </Link>
        </div>
      ) : item.isPro || enough ? (
        <form action={confirmPurchase} className="mt-5">
          <input type="hidden" name="product_id" value={item.productId} />
          <input type="hidden" name="kind" value={kind} />
          {/* Khóa chống trùng: mỗi lần mở trang một khóa — bấm 2 lần / gửi lại không trừ point 2 lần. */}
          <input type="hidden" name="purchase_key" value={crypto.randomUUID()} />
          {discount > 0 && quote && <input type="hidden" name="coupon" value={quote.code} />}
          <button
            type="submit"
            className="w-full rounded-xl bg-accent px-4 py-3 font-extrabold text-accent-contrast hover:bg-accent-hover"
          >
            {item.isPro ? "Kích hoạt miễn phí →" : `Thanh toán ${pay.toLocaleString("vi-VN")} point →`}
          </button>
        </form>
      ) : (
        <div className="mt-5 rounded-xl border border-danger/40 bg-danger/10 p-4 text-center text-sm">
          <p className="text-danger">Không đủ point (thiếu {(pay - balance).toLocaleString("vi-VN")}).</p>
          <Link
            href={`/wallet?need=${pay}&back=${encodeURIComponent(discount > 0 && quote ? `${selfHref}${isTopping ? "?" : "&"}coupon=${quote.code}` : selfHref)}`}
            className="mt-3 inline-block rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-contrast hover:bg-accent-hover"
          >
            Nạp point →
          </Link>
        </div>
      )}

      <div className="mt-5 text-sm">
        <Link href={item.backHref} className="text-text-muted hover:text-text">
          {item.backLabel}
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-text-faint">{label}</dt>
      <dd className={`text-right ${strong ? "font-semibold text-text" : "text-text"}`}>{value}</dd>
    </div>
  );
}

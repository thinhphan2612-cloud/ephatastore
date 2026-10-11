import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentUserPlan } from "@/lib/plan";
import { getBalance } from "@/data/wallet";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { getSettings } from "@/data/settings";
import { purchasePricePoints, confirmPurchase, type PurchaseKind } from "@/lib/actions/purchase";
import { getMyLicenseKey } from "@/data/software";
import { getToppingUntil, isOwned } from "@/data/store-user";

export const metadata = { title: "Xác nhận mua" };

const KIND_LABEL: Record<PurchaseKind, string> = {
  annual: "Gói năm (365 ngày)",
  freedom: "Mua lẻ",
  perpetual: "Mua vĩnh viễn",
  topping: "Full Topping",
  software: "Key bản quyền vĩnh viễn",
};

const vnDate = (iso: string) => new Date(iso).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

/** /buy/<productId>?kind=… — xác nhận mua sản phẩm; /buy/topping — xác nhận Full Topping (cùng một màn hình). */
export default async function BuyPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { productId } = await params;
  const { kind: kindRaw } = await searchParams;
  const isTopping = productId === "topping";
  const kind = (
    isTopping
      ? "topping"
      : ["annual", "freedom", "perpetual", "software"].includes(kindRaw ?? "")
        ? kindRaw
        : "annual"
  ) as PurchaseKind;

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
        ? `Đang bật đến ${vnDate(until)} — mua thêm sẽ cộng nối 365 ngày`
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
    if ((kind === "software") !== (product.type === "software")) notFound();
    // Mỗi tài khoản 1 key/sản phẩm — đã có thì về Thư viện xem key.
    if (kind === "software" && (await getMyLicenseKey(user.id, product.id))) redirect("/library");

    // Chỉ sản phẩm gắn nhãn "Miễn phí cho Pro Giáo Lý Số" mới free cho Pro (phần mềm không bao giờ có nhãn này).
    const isPro = kind !== "software" && product.giaoly_pro_free && (await getCurrentUserPlan()) === "pro";
    item = {
      productId: product.id,
      title: product.title,
      icon: product.icon ?? "✦",
      note: kind === "freedom" ? `Dùng ${settings.freedomDays} ngày` : KIND_LABEL[kind],
      points: isPro ? 0 : await purchasePricePoints(kind, product.price_month ?? 0),
      isPro,
      // Mua vĩnh viễn mà đã sở hữu → không cho trả tiền lần nữa (gói năm / mua lẻ thì mua thêm là gia hạn).
      alreadyOwned: kind === "perpetual" && (await isOwned(user.id, product.id)),
      backHref: `/product/${product.slug}`,
      backLabel: "← Quay lại sản phẩm",
    };
  }

  const enough = balance >= item.points;

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
          <Row label="Giá" value={item.isPro ? "Miễn phí (Pro Giáo Lý Số)" : `${item.points.toLocaleString("vi-VN")} point`} strong />
          <Row label="Số dư ví" value={`${balance.toLocaleString("vi-VN")} point`} />
          {!item.isPro && !item.alreadyOwned && (
            <Row label="Sau khi mua" value={`${(balance - item.points).toLocaleString("vi-VN")} point`} />
          )}
        </dl>
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
          <button
            type="submit"
            className="w-full rounded-xl bg-accent px-4 py-3 font-extrabold text-accent-contrast hover:bg-accent-hover"
          >
            {item.isPro ? "Kích hoạt miễn phí →" : `Thanh toán ${item.points.toLocaleString("vi-VN")} point →`}
          </button>
        </form>
      ) : (
        <div className="mt-5 rounded-xl border border-danger/40 bg-danger/10 p-4 text-center text-sm">
          <p className="text-danger">Không đủ point (thiếu {(item.points - balance).toLocaleString("vi-VN")}).</p>
          <Link
            href="/wallet"
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

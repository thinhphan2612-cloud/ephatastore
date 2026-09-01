import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentUserPlan } from "@/lib/plan";
import { getBalance } from "@/data/wallet";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { getSettings } from "@/data/settings";
import { purchasePricePoints, confirmPurchase, type PurchaseKind } from "@/lib/actions/purchase";

export const metadata = { title: "Xác nhận mua" };

const KIND_LABEL: Record<PurchaseKind, string> = {
  annual: "Gói năm (365 ngày)",
  freedom: "Mua lẻ",
  game: "Mua vĩnh viễn",
  topping: "Full Topping",
};

export default async function BuyPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ kind?: string }>;
}) {
  const { productId } = await params;
  const { kind: kindRaw } = await searchParams;
  const kind = (["annual", "freedom", "game"].includes(kindRaw ?? "")
    ? kindRaw
    : "annual") as PurchaseKind;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/buy/${productId}?kind=${kind}`);

  const supabase = createStoreAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("id,slug,title,tagline,icon,price_month,published")
    .eq("id", productId)
    .maybeSingle();
  if (!product || !product.published) notFound();

  const plan = await getCurrentUserPlan();
  const isPro = plan === "pro";
  const [balance, settings] = await Promise.all([getBalance(user.id), getSettings()]);
  const points = isPro ? 0 : await purchasePricePoints(kind, product.price_month ?? 0);
  const enough = balance >= points;

  const kindNote =
    kind === "freedom"
      ? `Dùng ${settings.freedomDays} ngày`
      : KIND_LABEL[kind];

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold">Xác nhận mua</h1>

      <div className="mt-6 rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-2xl text-accent">
            {product.icon ?? "✦"}
          </div>
          <div>
            <div className="font-semibold text-text">{product.title}</div>
            <div className="text-sm text-text-muted">{kindNote}</div>
          </div>
        </div>

        <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
          <Row label="Giá" value={isPro ? "Miễn phí (Pro Giáo Lý Số)" : `${points.toLocaleString("vi-VN")} point`} strong />
          <Row label="Số dư ví" value={`${balance.toLocaleString("vi-VN")} point`} />
          {!isPro && (
            <Row
              label="Sau khi mua"
              value={`${(balance - points).toLocaleString("vi-VN")} point`}
            />
          )}
        </dl>
      </div>

      {isPro || enough ? (
        <form action={confirmPurchase} className="mt-5">
          <input type="hidden" name="product_id" value={product.id} />
          <input type="hidden" name="kind" value={kind} />
          <button
            type="submit"
            className="w-full rounded-xl bg-accent px-4 py-3 font-extrabold text-accent-contrast hover:bg-accent-hover"
          >
            {isPro ? "Kích hoạt miễn phí →" : `Thanh toán ${points.toLocaleString("vi-VN")} point →`}
          </button>
        </form>
      ) : (
        <div className="mt-5 rounded-xl border border-warn/40 bg-warn/10 p-4 text-center text-sm">
          <p className="text-warn">
            Không đủ point (thiếu {(points - balance).toLocaleString("vi-VN")}).
          </p>
          <Link
            href="/wallet"
            className="mt-3 inline-block rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-contrast hover:bg-accent-hover"
          >
            Nạp point →
          </Link>
        </div>
      )}

      <div className="mt-5 text-sm">
        <Link href={`/product/${product.slug}`} className="text-text-muted hover:text-text">
          ← Quay lại sản phẩm
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

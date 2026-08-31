import Link from "next/link";
import { getSettings } from "@/data/settings";
import { getCurrentUser } from "@/lib/auth";
import { hasActiveTopping } from "@/data/store-user";
import { buyTopping } from "@/lib/actions/store";
import { formatPrice } from "@/lib/format";

export const metadata = { title: "Full Topping" };

const BENEFITS = [
  "Mở khoá tất cả sản phẩm PRO",
  "Không cần mua lẻ từng tiện ích",
  "Cập nhật & tính năng mới tự động",
  "Một thuê bao cho toàn bộ Store",
];

export default async function ToppingPage() {
  const { fullToppingPrice } = await getSettings();
  const annual = fullToppingPrice * 12;
  const user = await getCurrentUser();
  const active = user ? await hasActiveTopping(user.id) : false;

  return (
    <div className="mx-auto w-[min(760px,calc(100%-40px))] py-[clamp(48px,8vw,90px)]">
      <div className="text-center">
        <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-accent-hover">
          Ephata · All-Access
        </div>
        <h1 className="font-display mt-3 text-[clamp(36px,6vw,58px)] font-bold">
          Full Topping
        </h1>
        <p className="mx-auto mt-3 max-w-[560px] text-text-muted">
          Một thuê bao mở khoá <strong className="text-text">toàn bộ sản phẩm PRO</strong> trên
          Ephata Store — thay vì mua lẻ từng cái.
        </p>
      </div>

      <div className="mx-auto mt-9 max-w-[440px] rounded-3xl border border-accent/30 bg-gradient-to-br from-[#1b170f] to-[#0b1115] p-8">
        <div className="flex items-end gap-2">
          <span className="font-display text-[44px] font-bold text-accent">
            {formatPrice(fullToppingPrice)}
          </span>
          <span className="pb-2 text-text-muted">/tháng</span>
        </div>
        <div className="mt-1 text-sm text-text-faint">
          Thanh toán theo năm · <strong className="text-text">{formatPrice(annual)}/năm</strong>
        </div>

        <ul className="mt-6 space-y-2.5">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-text">
              <span className="text-accent">✓</span>
              {b}
            </li>
          ))}
        </ul>

        <div className="mt-7">
          {active ? (
            <div className="rounded-xl border border-success/40 bg-success/10 px-4 py-3 text-center font-semibold text-success">
              ✓ Full Topping đang bật
            </div>
          ) : (
            <form action={buyTopping}>
              <button
                type="submit"
                className="w-full rounded-xl bg-accent px-4 py-3.5 font-extrabold text-accent-contrast hover:bg-accent-hover"
              >
                Kích hoạt Full Topping →
              </button>
            </form>
          )}
          {!user && (
            <p className="mt-2 text-center text-xs text-text-faint">
              Cần đăng nhập để kích hoạt.
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 text-center">
        <Link href="/browse" className="text-sm text-brand hover:text-brand-hover">
          Xem tất cả sản phẩm →
        </Link>
      </div>
    </div>
  );
}

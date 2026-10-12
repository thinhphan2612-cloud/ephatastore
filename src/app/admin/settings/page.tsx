import { getSettings } from "@/data/settings";
import { saveSettings } from "@/lib/actions/admin";
import { vndToPoints } from "@/lib/points";

const input =
  "w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-text focus:border-accent focus:outline-none";

export default async function AdminSettingsPage() {
  const s = await getSettings();

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-lg font-semibold">Cài đặt / Chính sách giá</h2>

      <form action={saveSettings} className="space-y-4 rounded-lg border border-border bg-surface p-5">
        <label className="block">
          <span className="mb-1 block text-sm text-text-muted">
            Giá Full Topping (all-access) / tháng — VND
          </span>
          <input
            type="number"
            name="full_topping_price"
            min={10000}
            max={100000000}
            step={10000}
            defaultValue={s.fullToppingPrice}
            className={input}
          />
          <span className="mt-1 block text-xs text-text-faint">
            Đang áp dụng: khách trả 12 tháng / lần = {(s.fullToppingPrice * 12).toLocaleString("vi-VN")}đ ={" "}
            <b className="text-text-muted">{vndToPoints(s.fullToppingPrice * 12).toLocaleString("vi-VN")} point / năm</b>.
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-text-muted">
            Số ngày cho mua lẻ Freedom
          </span>
          <input
            type="number"
            name="freedom_days"
            min={1}
            max={365}
            defaultValue={s.freedomDays}
            className={input}
          />
        </label>

        <p className="text-xs leading-relaxed text-text-faint">
          <b>Mua lẻ (Freedom)</b>: công cụ / tính năng bán thuê bao có thêm nút “Mua lẻ N ngày”, giá bằng 1 tháng. <b>Full Topping</b>:
          thuê bao 365 ngày của khách, mở mọi sản phẩm PRO trừ phần mềm bán key và tính năng Giáo Lý Số. Đổi giá chỉ áp cho lượt mua sau
          đó. Miễn phí cho Pro Giáo Lý Số đặt riêng ở từng sản phẩm (ô “Miễn phí cho Pro Giáo Lý Số”).
        </p>

        <button
          type="submit"
          className="rounded-md bg-accent px-5 py-2 font-semibold text-accent-contrast hover:bg-accent-hover"
        >
          Lưu chính sách
        </button>
      </form>
    </div>
  );
}

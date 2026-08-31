import { getSettings } from "@/data/settings";
import { saveSettings } from "@/lib/actions/admin";

const input =
  "w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-text focus:border-accent focus:outline-none";

export default async function AdminSettingsPage() {
  const s = await getSettings();

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-lg font-semibold">Cài đặt / Chính sách giá</h2>

      <form action={saveSettings} className="space-y-4 rounded-lg border border-border bg-surface p-5">
        <label className="block">
          <span className="mb-1 block text-sm text-text-muted">Chế độ truy cập</span>
          <select name="access_mode" defaultValue={s.accessMode} className={input}>
            <option value="giaoly_pro">Gói Pro giaoly (giai đoạn đầu — cần Pro giaoly, không bán trên store)</option>
            <option value="store">Bán trên store (gói năm / Freedom / Full Topping / Trial)</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-text-muted">
            Giá Full Topping (all-access) / tháng — VND
          </span>
          <input
            type="number"
            name="full_topping_price"
            min={0}
            step={10000}
            defaultValue={s.fullToppingPrice}
            className={input}
          />
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

        <p className="text-xs text-text-faint">
          Freedom: mua lẻ một sản phẩm để dùng trong số ngày trên (giá bằng 1 tháng). Full
          Topping: thuê bao mở khoá mọi sản phẩm PRO (đang phát triển).
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

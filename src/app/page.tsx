import Link from "next/link";
import Form from "next/form";
import { getCategories } from "@/data/categories";
import { getAllProducts } from "@/data/products";
import { Catalog } from "@/components/catalog";
import { ContactDialog } from "@/components/contact-dialog";
import { getCurrentUser } from "@/lib/auth";
import { readQuery } from "@/lib/catalog";
import { COMPANY } from "@/lib/company";

const STATS = [
  { b: "✦ Rõ đối tượng", s: "Linh mục · Giáo dân · Người tìm hiểu" },
  { b: "▦ Tất cả trong một nơi", s: "Web app · tài liệu · thiết kế · game" },
  { b: "⚡ Dùng ngay trên web", s: "Ưu tiên đơn giản, nhanh và dễ chia sẻ" },
];

const STEPS = [
  { t: "Tạo tài khoản", d: "Miễn phí, đăng ký bằng email. Sản phẩm miễn phí mở được ngay." },
  { t: "Nạp point", d: "100đ = 1 point, chuyển khoản ở trang Ví. Point được cộng sau khi Ephata đối soát." },
  { t: "Mua & dùng", d: "Sản phẩm đã mua nằm ở Thư viện: mở công cụ, chơi game, tải file hoặc lấy key." },
];

// Câu hỏi thường gặp — nội dung khớp trang Điều khoản (/dieu-khoan); đổi chính sách thì sửa cả hai.
const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Point là gì? Có hết hạn không?",
    a: <>Point là đơn vị thanh toán trên Ephata: 100đ = 1 point. Point <b>không có hạn sử dụng</b>, nhưng không quy đổi lại thành tiền và không chuyển sang tài khoản khác.</>,
  },
  {
    q: "Nạp point bao lâu thì được cộng?",
    a: (
      <>
        Chuyển khoản đúng số tiền và nội dung ghi ở trang <Link href="/wallet">Ví</Link>; point được cộng sau khi Ephata xác nhận đã nhận
        tiền. Quá 24 giờ làm việc chưa thấy cộng, gửi <Link href="/lien-he?chu-de=nap-point">Liên hệ</Link> kèm mã nạp.
      </>
    ),
  },
  {
    q: "Mua xong thì dùng / tải lại ở đâu?",
    a: (
      <>
        Mọi sản phẩm đã mua nằm ở <Link href="/library">Thư viện</Link>. Mua vĩnh viễn (file, game, key phần mềm) dùng không thời hạn; gói
        năm, mua lẻ, Full Topping dùng đến hạn ghi trong Thư viện — không tự gia hạn, mua thêm trước khi hết hạn thì thời gian được cộng nối.
      </>
    ),
  },
  {
    q: "Tôi đã có tài khoản Giáo Lý Số?",
    a: (
      <>
        <Link href="/login">Đăng nhập</Link> thẳng bằng tài khoản Giáo Lý Số — hệ thống tự tạo và liên kết tài khoản Ephata. Sản phẩm có nhãn
        “Miễn phí với Pro Giáo Lý Số” được dùng miễn phí khi gói Pro của giáo xứ còn hạn.
      </>
    ),
  },
  {
    q: "Phần mềm cài được trên mấy máy?",
    a: <>Mỗi key dùng trên số thiết bị ghi ở trang sản phẩm. Đổi máy thì tự gỡ máy cũ trong Thư viện rồi kích hoạt trên máy mới. Không chia sẻ hay bán lại key.</>,
  },
  {
    q: "Có được hoàn point không?",
    a: (
      <>
        Sản phẩm số đã giao (đã tải về, đã kích hoạt key, đã bật tính năng) không hoàn point. Lỗi từ phía hệ thống (trừ sai, trừ trùng, dịch vụ
        không thực hiện được) được hoàn point vào Ví. Chi tiết ở <Link href="/dieu-khoan">Điều khoản</Link>.
      </>
    ),
  },
];

// Gợi ý bấm nhanh dưới ô tìm — đều ra kết quả với dữ liệu hiện có.
const SUGGEST = ["Rung Chuông Vàng", "Chứng chỉ", "Đơn từ", "Hôn nhân", "Quản lý giáo lý"];

const eyebrow = "text-xs font-extrabold uppercase tracking-[0.14em] text-accent-hover";
const wrap = "mx-auto w-[min(1240px,calc(100%-40px))]";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [categories, products, user, sp] = await Promise.all([getCategories(), getAllProducts(), getCurrentUser(), searchParams]);
  const query = readQuery(sp);
  const freeCount = products.filter((p) => p.tier === "free").length;

  return (
    <div>
      {/* HERO gọn: 1 dòng giới thiệu + tìm kiếm */}
      <header className="border-b border-border">
        <div className={`${wrap} flex flex-wrap items-end justify-between gap-x-10 gap-y-5 py-8 sm:py-10`}>
          <div className="max-w-[700px]">
            <div className={eyebrow}>Ephata Store · cộng đồng Công giáo</div>
            <h1 className="font-display mt-2 text-[clamp(26px,3.2vw,38px)] font-bold leading-tight text-balance">
              Công cụ số cho giáo&nbsp;xứ <span className="text-accent">&amp; cộng&nbsp;đoàn.</span>
            </h1>
            <p className="mt-2 text-base text-text-muted">
              {products.length} sản phẩm · {freeCount} miễn phí — ứng dụng, biểu mẫu, thiết kế, tài liệu và game giáo lý.
            </p>
          </div>

          <div className="w-full max-w-[540px]">
            {/* Tìm ngay trong lưới bên dưới, giữ nguyên bộ lọc đang chọn */}
            <Form
              action="/"
              scroll={false}
              className="flex gap-2 rounded-2xl border border-border-strong bg-bg-elevated p-1.5 focus-within:border-accent"
            >
              <input
                type="search"
                name="q"
                defaultValue={query.q}
                placeholder="Tìm công cụ, game…"
                aria-label="Tìm sản phẩm"
                className="min-w-0 flex-1 bg-transparent px-3 text-[17px] text-text placeholder:text-text-faint focus:outline-none"
              />
              {query.cat && <input type="hidden" name="cat" value={query.cat} />}
              {query.price && <input type="hidden" name="price" value={query.price} />}
              {query.type && <input type="hidden" name="type" value={query.type} />}
              {query.sort !== "featured" && <input type="hidden" name="sort" value={query.sort} />}
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-accent px-5 py-2.5 text-base font-extrabold text-accent-contrast hover:bg-accent-hover"
              >
                Tìm
              </button>
            </Form>
            <div className="mt-2.5 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-text-faint">Gợi ý:</span>
              {SUGGEST.map((q) => (
                <Link
                  key={q}
                  href={`/?q=${encodeURIComponent(q)}`}
                  scroll={false}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-text-muted hover:border-accent/50 hover:text-text"
                >
                  {q}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* CỬA HÀNG: bộ lọc + lưới */}
      <section className="py-8 sm:py-10">
        <div className={wrap}>
          <Catalog products={products} categories={categories} query={query} base="/" limit={12} />
        </div>
      </section>

      {/* BẮT ĐẦU — 3 bước + 2 cách dùng nhiều sản phẩm */}
      <section className="border-t border-border bg-bg-elevated py-12">
        <div className={`${wrap} grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]`}>
          <div>
            <div className={eyebrow}>Bắt đầu</div>
            <h2 className="font-display mt-2 text-[clamp(24px,3vw,32px)] font-bold">Dùng Ephata trong 3 bước.</h2>
            <ol className="mt-5 grid gap-3 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <li key={s.t} className="rounded-2xl border border-border bg-surface p-4">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-accent/15 text-sm font-bold text-accent">{i + 1}</span>
                  <b className="mt-3 block text-base text-text">{s.t}</b>
                  <p className="mt-1 text-[14px] leading-relaxed text-text-muted">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
          <div className="grid content-end gap-3">
            <Link href="/topping" className="group rounded-2xl border border-accent/30 bg-accent/5 p-4 hover:border-accent/60">
              <b className="block text-base text-text">Full Topping</b>
              <p className="mt-1 text-[14px] leading-relaxed text-text-muted">
                Một gói năm mở mọi sản phẩm có phí — trừ phần mềm bán key và tính năng Giáo Lý Số.
              </p>
              <span className="mt-2 inline-block text-sm font-semibold text-brand group-hover:text-brand-hover">Xem gói →</span>
            </Link>
            <div className="rounded-2xl border border-border bg-surface p-4">
              <b className="block text-base text-text">Có gói Pro Giáo Lý Số?</b>
              <p className="mt-1 text-[14px] leading-relaxed text-text-muted">
                Sản phẩm có nhãn “Miễn phí với Pro Giáo Lý Số” dùng miễn phí khi gói Pro của giáo xứ còn hạn.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CÂU HỎI THƯỜNG GẶP */}
      <section className="py-12">
        <div className={`${wrap} grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.7fr)]`}>
          <div>
            <div className={eyebrow}>Hỏi đáp</div>
            <h2 className="font-display mt-2 text-[clamp(24px,3vw,32px)] font-bold">Câu hỏi thường gặp.</h2>
            <p className="mt-2 text-[15px] text-text-muted">Không thấy câu trả lời? Gửi yêu cầu hỗ trợ ở cuối trang.</p>
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
            {FAQ.map((f) => (
              <details key={f.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-base font-semibold text-text hover:bg-surface-hover [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span aria-hidden className="shrink-0 text-xl leading-none text-text-faint transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="px-5 pb-4 text-[15px] leading-relaxed text-text-muted [&_a]:font-semibold [&_a]:text-brand [&_a:hover]:text-brand-hover">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* GIỚI THIỆU — 1 dải gọn */}
      <section className="py-12">
        <div className={wrap}>
          <div className="grid gap-6 rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/10 to-bg-elevated p-[clamp(24px,4vw,40px)] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:items-center">
            <div>
              <div className={eyebrow}>Ephata · Hãy mở ra</div>
              <h2 className="font-display mt-3 text-[clamp(24px,3.2vw,34px)] font-bold leading-snug text-balance">
                Công nghệ tốt nhất là công nghệ giúp việc phục vụ trở nên nhẹ hơn.
              </h2>
              {/* Số liệu lấy thẳng từ dữ liệu (không viết cứng) */}
              <p className="mt-3 text-[15px] text-text-muted">
                Phát triển bởi <b className="text-text">{COMPANY.name}</b> · {products.length} sản phẩm · {categories.length} danh mục
              </p>
            </div>
            <ul className="space-y-3">
              {STATS.map((s) => (
                <li key={s.b}>
                  <b className="block text-base">{s.b}</b>
                  <span className="text-[15px] text-text-muted">{s.s}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* LIÊN HỆ — 1 dải */}
      <section className="border-t border-border py-10">
        <div className={`${wrap} flex flex-wrap items-center justify-between gap-5`}>
          <div>
            <h2 className="text-xl font-bold">Cần hỗ trợ hoặc muốn đề xuất một công cụ?</h2>
            <p className="mt-1 text-[15px] text-text-muted">Chúng tôi trả lời qua email · {COMPANY.name}</p>
          </div>
          <div className="w-full sm:w-auto sm:min-w-[280px]">
            <ContactDialog
              label="Gửi yêu cầu hỗ trợ"
              value="Mở form liên hệ →"
              defaultEmail={user?.email ?? undefined}
              className="block rounded-2xl border border-border bg-surface px-[18px] py-[15px] hover:border-accent/50"
            />
          </div>
        </div>
      </section>
    </div>
  );
}

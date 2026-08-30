import Link from "next/link";
import { CATEGORIES } from "@/data/categories";

const STATS = [
  { b: "✦ Rõ đối tượng", s: "Linh mục · Giáo dân · Người tìm hiểu" },
  { b: "▦ Tất cả trong một nơi", s: "Web app · tài liệu · thiết kế · game" },
  { b: "⚡ Dùng ngay trên web", s: "Ưu tiên đơn giản, nhanh và dễ chia sẻ" },
];

const FEATURED = [
  {
    tag: "GAME SHOW",
    eyebrow: "Game Store",
    title: "Rung Chuông Vàng",
    desc: "Game show giáo lý chạy trên trình duyệt, có màn hình điều khiển và màn hình trình chiếu.",
    href: "/category/game-store",
  },
  {
    tag: "WEB APP",
    eyebrow: "Linh mục quản xứ",
    title: "Quản lý giáo lý",
    desc: "Quản lý lớp, học viên, giáo lý viên, điểm danh và kết quả theo từng năm học.",
    href: "/category/linh-muc-quan-xu",
  },
  {
    tag: "DESIGN KIT",
    eyebrow: "Thiết kế Công giáo",
    title: "Bộ Rước lễ lần đầu",
    desc: "Bộ nhận diện đồng nhất cho banner, thiệp, backdrop, chứng chỉ và truyền thông.",
    href: "/category/thiet-ke-cong-giao",
  },
];

export default function HomePage() {
  return (
    <div>
      {/* HERO */}
      <header className="border-b border-border">
        <div className="mx-auto w-[min(1180px,calc(100%-40px))] py-[clamp(56px,9vw,105px)] text-center">
          <span className="inline-block rounded-full border border-accent/25 bg-accent/5 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-accent-hover">
            ● Công cụ số · dành cho cộng đồng Công giáo
          </span>
          <h1 className="font-display mx-auto my-7 max-w-[1000px] text-[clamp(40px,8vw,86px)] font-bold leading-[0.98]">
            Mở ra những cách mới
            <br />
            <em className="not-italic text-accent">để phục vụ.</em>
          </h1>
          <p className="mx-auto max-w-[720px] text-[17px] leading-[1.7] text-text-muted">
            Ephata Store gom ứng dụng, biểu mẫu, thiết kế, tài liệu và game giáo lý về
            một nơi — dễ tìm, dễ dùng, dễ triển khai cho giáo xứ và cộng đoàn.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="#categories"
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3.5 text-sm font-extrabold text-accent-contrast hover:bg-accent-hover"
            >
              Khám phá Store →
            </Link>
            <Link
              href="/category/game-store"
              className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-white/5 px-5 py-3.5 text-sm font-extrabold text-text hover:border-accent/50"
            >
              ▷ Vào Game Store
            </Link>
          </div>

          <div className="mt-14 grid grid-cols-1 overflow-hidden rounded-3xl border border-border bg-white/[0.03] text-left sm:grid-cols-3">
            {STATS.map((s, i) => (
              <div
                key={i}
                className="border-b border-border p-6 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
              >
                <b className="mb-1.5 block">{s.b}</b>
                <span className="text-[13px] text-text-faint">{s.s}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* CATEGORIES */}
      <section id="categories" className="py-[clamp(48px,8vw,90px)]">
        <div className="mx-auto w-[min(1180px,calc(100%-40px))]">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-accent-hover">
            // 01 / DÀNH CHO BẠN
          </div>
          <h2 className="font-display my-3 mb-9 text-[clamp(32px,5vw,54px)] font-bold">
            Chọn đúng nơi bạn cần.
          </h2>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {CATEGORIES.map((c, i) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="group relative flex min-h-[300px] flex-col justify-end overflow-hidden rounded-[26px] border border-border p-6 transition hover:-translate-y-1 hover:border-accent/40"
              >
                <div className="media-placeholder absolute inset-0 transition-transform duration-300 group-hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/90" />
                <span className="absolute right-6 top-6 z-10 text-[11px] text-white/70">
                  {String(i + 1).padStart(2, "0")} ↗
                </span>
                <div className="relative z-10 mb-auto grid h-12 w-12 place-items-center rounded-[15px] border border-white/20 bg-black/35 text-[21px] text-accent backdrop-blur">
                  {c.icon}
                </div>
                <div className="relative z-10">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-accent-hover">
                    {c.eyebrow}
                  </div>
                  <h3 className="my-2 text-[21px] font-bold [text-shadow:0_2px_14px_rgba(0,0,0,0.65)]">
                    {c.name}
                  </h3>
                  <p className="text-[13px] leading-[1.65] text-white/80 [text-shadow:0_2px_12px_rgba(0,0,0,0.6)]">
                    {c.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      <section className="border-y border-border bg-white/[0.03] py-[clamp(48px,8vw,90px)]">
        <div className="mx-auto w-[min(1180px,calc(100%-40px))]">
          <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-accent-hover">
            // 02 / NỔI BẬT
          </div>
          <h2 className="font-display my-3 mb-9 text-[clamp(32px,5vw,54px)] font-bold">
            Công cụ đáng dùng.
          </h2>
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
            {FEATURED.map((f) => (
              <Link
                key={f.title}
                href={f.href}
                className="group relative flex min-h-[360px] flex-col justify-end overflow-hidden rounded-[26px] border border-border p-7 transition hover:-translate-y-1 hover:border-accent/40"
              >
                <div className="media-placeholder absolute inset-0 transition-transform duration-300 group-hover:scale-[1.04]" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/40 to-black/90" />
                <span className="relative z-10 mb-auto self-start rounded-full border border-white/15 bg-black/35 px-2.5 py-1.5 text-[10px] font-black tracking-[0.15em] text-accent-hover backdrop-blur">
                  {f.tag}
                </span>
                <div className="relative z-10">
                  <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-accent-hover">
                    {f.eyebrow}
                  </div>
                  <h3 className="my-2 text-[26px] font-bold [text-shadow:0_2px_14px_rgba(0,0,0,0.65)]">
                    {f.title}
                  </h3>
                  <p className="text-[14px] leading-[1.65] text-white/80 [text-shadow:0_2px_12px_rgba(0,0,0,0.6)]">
                    {f.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="about" className="py-[clamp(40px,6vw,80px)]">
        <div className="mx-auto w-[min(1180px,calc(100%-40px))]">
          <div className="rounded-[30px] border border-accent/20 bg-gradient-to-br from-[#1b170f] to-[#0b1115] p-[clamp(30px,5vw,48px)]">
            <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-accent-hover">
              // EPHATA / HÃY MỞ RA
            </div>
            <h2 className="font-display my-4 max-w-[860px] text-[clamp(30px,5vw,52px)] font-bold">
              Công nghệ tốt nhất là công nghệ giúp việc phục vụ trở nên nhẹ hơn.
            </h2>
            <p className="max-w-[680px] leading-[1.7] text-text-muted">
              Ephata Store được thiết kế như một “kho công cụ số”: mỗi sản phẩm có thể là
              web app, template, tài liệu tải về hoặc game chạy trực tiếp.
            </p>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="border-t border-border bg-gradient-to-b from-white/[0.02] to-transparent py-[clamp(48px,7vw,78px)]">
        <div className="mx-auto grid w-[min(1180px,calc(100%-40px))] gap-10 md:grid-cols-[1.1fr_0.9fr] md:gap-[70px]">
          <div>
            <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-accent-hover">
              // LIÊN HỆ EPHATA
            </div>
            <h2 className="font-display my-4 text-[clamp(30px,4.5vw,50px)] font-bold">
              Cần hỗ trợ hoặc muốn đề xuất một công cụ?
            </h2>
            <p className="max-w-[600px] leading-[1.7] text-text-muted">
              Liên hệ Ephata Store để tư vấn triển khai cho giáo xứ, giáo lý viên hoặc
              chương trình riêng.
            </p>
          </div>
          <div className="grid gap-2.5">
            <ContactCard label="Email" value="hello@ephata.vn" href="mailto:hello@ephata.vn" />
            <ContactCard label="Điện thoại" value="0900 000 000" href="tel:+84900000000" />
            <ContactCard label="Thời gian hỗ trợ" value="Thứ 2 – Thứ 7 · 08:00–20:00" />
          </div>
        </div>
      </section>
    </div>
  );
}

function ContactCard({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <>
      <span className="mb-1.5 block text-[10px] uppercase tracking-[0.14em] text-text-faint">
        {label}
      </span>
      <b className="text-sm">{value}</b>
    </>
  );
  const cls =
    "block rounded-2xl border border-border bg-white/[0.03] px-[18px] py-[17px]";
  return href ? (
    <a href={href} className={cls}>
      {inner}
    </a>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

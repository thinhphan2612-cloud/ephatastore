import Link from "next/link";
import Form from "next/form";
import { getCategories } from "@/data/categories";
import { getAllProducts } from "@/data/products";
import { ProductCard } from "@/components/product-card";
import { ContactDialog } from "@/components/contact-dialog";
import { getCurrentUser } from "@/lib/auth";
import { COMPANY } from "@/lib/company";
import type { Product } from "@/lib/types";

const STATS = [
  { b: "✦ Rõ đối tượng", s: "Linh mục · Giáo dân · Người tìm hiểu" },
  { b: "▦ Tất cả trong một nơi", s: "Web app · tài liệu · thiết kế · game" },
  { b: "⚡ Dùng ngay trên web", s: "Ưu tiên đơn giản, nhanh và dễ chia sẻ" },
];

// Gợi ý bấm nhanh dưới ô tìm — đều ra kết quả với dữ liệu hiện có.
const SUGGEST = ["Rung Chuông Vàng", "Chứng chỉ", "Đơn từ", "Hôn nhân", "Quản lý giáo lý"];

const eyebrow = "text-xs font-extrabold uppercase tracking-[0.14em] text-accent-hover";
const wrap = "mx-auto w-[min(1180px,calc(100%-40px))]";

export default async function HomePage() {
  const [categories, products, user] = await Promise.all([getCategories(), getAllProducts(), getCurrentUser()]);

  const count = (slug: string) =>
    products.filter((p) => p.categoryId === slug || p.categorySlugs.includes(slug)).length;
  // Nổi bật + mới lên kệ (cờ do admin bật); thiếu thì bù bằng sản phẩm mới phát hành nhất.
  const picked = [
    ...products.filter((p) => p.featured),
    ...products.filter((p) => p.isNew && !p.featured),
    ...products.filter((p) => !p.featured && !p.isNew),
  ].slice(0, 8);
  const pickedIds = new Set(picked.map((p) => p.id));
  const free = products.filter((p) => p.tier === "free" && !pickedIds.has(p.id)).slice(0, 8);

  return (
    <div>
      {/* HERO */}
      <header className="border-b border-border">
        <div className={`${wrap} py-[clamp(48px,8vw,96px)] text-center`}>
          <span className="inline-block rounded-full border border-accent/25 bg-accent/5 px-3.5 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-accent-hover">
            ● Công cụ số · dành cho cộng đồng Công giáo
          </span>
          <h1 className="font-display mx-auto my-6 max-w-[1000px] text-[clamp(38px,7.5vw,82px)] font-bold leading-[1.02]">
            Mở ra những cách mới
            <br />
            <em className="not-italic text-accent">để phục vụ.</em>
          </h1>
          <p className="mx-auto max-w-[720px] text-[18px] leading-[1.7] text-text-muted">
            Ephata Store gom ứng dụng, biểu mẫu, thiết kế, tài liệu và game giáo lý về
            một nơi — dễ tìm, dễ dùng, dễ triển khai cho giáo xứ và cộng đoàn.
          </p>

          {/* Tìm nhanh: gõ không dấu cũng được */}
          <Form
            action="/browse"
            className="mx-auto mt-8 flex max-w-[640px] gap-2 rounded-2xl border border-border-strong bg-bg-elevated p-2 focus-within:border-accent"
          >
            <input
              type="search"
              name="q"
              placeholder="Tìm công cụ, game…"
              aria-label="Tìm sản phẩm"
              className="min-w-0 flex-1 bg-transparent px-3 text-[17px] text-text placeholder:text-text-faint focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-accent px-5 py-3 text-base font-extrabold text-accent-contrast hover:bg-accent-hover"
            >
              Tìm
            </button>
          </Form>
          <div className="mx-auto mt-3 flex max-w-[680px] flex-wrap items-center justify-center gap-2 text-sm">
            <span className="text-text-faint">Gợi ý:</span>
            {SUGGEST.map((q) => (
              <Link
                key={q}
                href={`/browse?q=${encodeURIComponent(q)}`}
                className="rounded-full border border-border bg-white/[0.03] px-3 py-1.5 text-text-muted hover:border-accent/50 hover:text-text"
              >
                {q}
              </Link>
            ))}
          </div>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="#categories"
              className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-white/5 px-5 py-3.5 text-base font-extrabold text-text hover:border-accent/50"
            >
              Xem theo danh mục ↓
            </Link>
            <Link
              href="/category/game-store"
              className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-white/5 px-5 py-3.5 text-base font-extrabold text-text hover:border-accent/50"
            >
              ▷ Vào Game Store
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-1 overflow-hidden rounded-3xl border border-border bg-white/[0.03] text-left sm:grid-cols-3">
            {STATS.map((s, i) => (
              <div
                key={i}
                className="border-b border-border px-6 py-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
              >
                <b className="mb-1 block text-base">{s.b}</b>
                <span className="text-[15px] text-text-muted">{s.s}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* CATEGORIES */}
      <section id="categories" className="scroll-mt-20 py-[clamp(44px,7vw,80px)]">
        <div className={wrap}>
          <div className={eyebrow}>Dành cho bạn</div>
          <h2 className="font-display mb-8 mt-2 text-[clamp(30px,4.6vw,50px)] font-bold">Chọn đúng nơi bạn cần.</h2>
          {/* Dạng danh mục: một khung, mỗi dòng một mục — gọn, đọc nhanh, không cần ảnh minh họa. */}
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}`}
                className="group flex min-w-0 items-center gap-3 bg-surface px-4 py-3.5 transition hover:bg-surface-hover sm:gap-4 sm:px-5 sm:py-4"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-bg-elevated text-[19px] text-accent">
                  {c.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-semibold leading-snug text-text group-hover:text-accent">{c.name}</span>
                  {c.description && <span className="block truncate text-[14px] text-text-muted">{c.description}</span>}
                </span>
                <span className="shrink-0 text-right text-[13px] tabular-nums text-text-faint">
                  {count(c.slug)} <span className="hidden sm:inline">sản phẩm</span>
                </span>
                <span aria-hidden className="shrink-0 text-lg text-text-faint transition group-hover:translate-x-0.5 group-hover:text-accent">
                  ›
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* SẢN PHẨM THẬT */}
      <section className="border-y border-border bg-white/[0.03] py-[clamp(44px,7vw,80px)]">
        <div className={`${wrap} space-y-14`}>
          <Shelf
            label="Nổi bật"
            title="Mới lên kệ & đáng dùng."
            note="Sản phẩm mới và được Ephata giới thiệu."
            products={picked}
            moreHref="/browse"
          />
          <Shelf
            label="Miễn phí"
            title="Dùng ngay, không cần mua."
            note="Chỉ cần tài khoản miễn phí là mở được."
            products={free}
            moreHref="/browse?price=free"
          />
        </div>
      </section>

      {/* CTA */}
      <section id="about" className="py-[clamp(40px,6vw,80px)]">
        <div className={wrap}>
          <div className="rounded-[30px] border border-accent/20 bg-gradient-to-br from-accent/10 to-bg-elevated p-[clamp(30px,5vw,48px)]">
            <div className={eyebrow}>Ephata · Hãy mở ra</div>
            <h2 className="font-display my-4 max-w-[860px] text-[clamp(30px,5vw,52px)] font-bold">
              Công nghệ tốt nhất là công nghệ giúp việc phục vụ trở nên nhẹ hơn.
            </h2>
            <p className="max-w-[680px] text-[17px] leading-[1.7] text-text-muted">
              Ephata Store được thiết kế như một “kho công cụ số”: mỗi sản phẩm có thể là
              web app, template, tài liệu tải về hoặc game chạy trực tiếp.
            </p>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="border-t border-border bg-gradient-to-b from-white/[0.02] to-transparent py-[clamp(48px,7vw,78px)]">
        <div className={`${wrap} grid gap-10 md:grid-cols-[1.1fr_0.9fr] md:gap-[70px]`}>
          <div>
            <div className={eyebrow}>Liên hệ Ephata</div>
            <h2 className="font-display my-4 text-[clamp(30px,4.5vw,50px)] font-bold">
              Cần hỗ trợ hoặc muốn đề xuất một công cụ?
            </h2>
            <p className="max-w-[600px] text-[17px] leading-[1.7] text-text-muted">
              Liên hệ Ephata Store để tư vấn triển khai cho giáo xứ, giáo lý viên hoặc
              chương trình riêng.
            </p>
          </div>
          <div className="grid gap-2.5">
            <ContactDialog
              label="Gửi yêu cầu hỗ trợ"
              value="Mở form liên hệ →"
              defaultEmail={user?.email ?? undefined}
              className="block rounded-2xl border border-border bg-white/[0.03] px-[18px] py-[17px] hover:border-accent/50"
            />
            <ContactCard label="Trả lời qua" value="Email bạn nhập trong form" />
            <ContactCard label="Đơn vị vận hành" value={COMPANY.name} />
          </div>
        </div>
      </section>
    </div>
  );
}

/** Một kệ sản phẩm: điện thoại cuộn ngang, màn rộng lưới 4 cột. */
function Shelf({
  label,
  title,
  note,
  products,
  moreHref,
}: {
  label: string;
  title: string;
  note: string;
  products: Product[];
  moreHref: string;
}) {
  if (products.length === 0) return null;
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <div className={eyebrow}>{label}</div>
          <h2 className="font-display mt-2 text-[clamp(28px,4.2vw,44px)] font-bold">{title}</h2>
          <p className="mt-1 text-base text-text-muted">{note}</p>
        </div>
        <Link href={moreHref} className="text-base font-semibold text-brand hover:text-brand-hover">
          Xem tất cả →
        </Link>
      </div>
      <div className="scrollbar-thin -mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
        {products.map((p) => (
          <div key={p.id} className="w-[78%] shrink-0 snap-start sm:w-auto [&>a]:h-full">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ContactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="block rounded-2xl border border-border bg-white/[0.03] px-[18px] py-[17px]">
      <span className="mb-1 block text-xs uppercase tracking-[0.1em] text-text-muted">{label}</span>
      <b className="text-base">{value}</b>
    </div>
  );
}

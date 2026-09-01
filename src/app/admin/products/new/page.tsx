import Link from "next/link";
import { adminListCategories, adminListPublishers } from "@/data/admin";
import { ProductForm, type ProductPreset } from "@/components/admin/product-form";

const PRESETS: Record<string, { title: string; hint: string }> = {
  download: {
    title: "Tải về",
    hint: "File PDF / DOCX / ảnh / bộ thiết kế (.zip). Người mua tải qua link ký có hạn.",
  },
  link: {
    title: "Link ngoài",
    hint: "App đã host nơi khác (có backend riêng). Mở tab khi người dùng đã sở hữu.",
  },
  feature: {
    title: "Tính năng Giáo Lý Số",
    hint: "Bật một tính năng bên Giáo Lý Số cho người mua (feature key).",
  },
};

const CARDS = [
  {
    href: "/admin/products/new?kind=download",
    icon: "⬇",
    title: "Tải về",
    desc: "File PDF, DOCX, ảnh, bộ thiết kế (.zip). Nút Tải về sau khi mua.",
  },
  {
    href: "/admin/games/new",
    icon: "▶",
    title: "Chạy trên store",
    desc: "Game hoặc web app (.zip build tĩnh). Chạy thẳng trong store như game.",
  },
  {
    href: "/admin/products/new?kind=link",
    icon: "↗",
    title: "Link ngoài",
    desc: "App đã host nơi khác (có backend). Mở tab khi đã sở hữu.",
  },
  {
    href: "/admin/products/new?kind=feature",
    icon: "🧩",
    title: "Tính năng Giáo Lý Số",
    desc: "Bật tính năng bên Giáo Lý Số cho người mua (feature key).",
  },
];

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const presetInfo = kind ? PRESETS[kind] : undefined;

  // Không có kind hợp lệ → hub chọn loại.
  if (!presetInfo) {
    return (
      <div className="space-y-5">
        <div className="text-sm text-text-faint">
          <Link href="/admin" className="hover:text-text">
            Sản phẩm
          </Link>{" "}
          / Thêm mới
        </div>
        <h2 className="text-lg font-semibold">Thêm sản phẩm — chọn cách đăng</h2>
        <p className="max-w-xl text-sm text-text-muted">
          Mỗi loại có cách tải lên và cách hiển thị riêng. Chọn đúng loại để form gọn.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {CARDS.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-xl border border-border bg-surface p-5 transition hover:border-accent/50 hover:bg-accent/5"
            >
              <div className="mb-2 grid h-11 w-11 place-items-center rounded-xl border border-accent/30 bg-accent/10 text-xl text-accent">
                {c.icon}
              </div>
              <div className="font-semibold text-text">{c.title}</div>
              <p className="mt-1 text-sm text-text-muted">{c.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const [categories, publishers] = await Promise.all([
    adminListCategories(),
    adminListPublishers(),
  ]);

  return (
    <div className="space-y-5">
      <div className="text-sm text-text-faint">
        <Link href="/admin" className="hover:text-text">
          Sản phẩm
        </Link>{" "}
        /{" "}
        <Link href="/admin/products/new" className="hover:text-text">
          Thêm mới
        </Link>{" "}
        / {presetInfo.title}
      </div>
      <h2 className="text-lg font-semibold">Thêm sản phẩm · {presetInfo.title}</h2>
      <p className="max-w-xl text-sm text-text-muted">{presetInfo.hint}</p>
      <ProductForm
        categories={categories}
        publishers={publishers}
        preset={kind as ProductPreset}
      />
    </div>
  );
}

import Form from "next/form";
import { getAllProducts } from "@/data/products";
import { getCategories } from "@/data/categories";
import { Catalog } from "@/components/catalog";
import { readQuery } from "@/lib/catalog";

export const metadata = { title: "Khám phá" };

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [products, categories, sp] = await Promise.all([getAllProducts(), getCategories(), searchParams]);
  const query = readQuery(sp);

  return (
    <div className="mx-auto w-[min(1240px,calc(100%-40px))] space-y-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold">{query.q ? `Kết quả cho “${query.q}”` : "Tất cả sản phẩm"}</h1>
        <Form
          action="/browse"
          scroll={false}
          className="flex w-full max-w-[460px] gap-2 rounded-2xl border border-border-strong bg-bg-elevated p-1.5 focus-within:border-accent"
        >
          <input
            type="search"
            name="q"
            defaultValue={query.q}
            placeholder="Tìm công cụ, game…"
            aria-label="Tìm sản phẩm"
            className="min-w-0 flex-1 bg-transparent px-3 text-base text-text placeholder:text-text-faint focus:outline-none"
          />
          {query.cat && <input type="hidden" name="cat" value={query.cat} />}
          {query.price && <input type="hidden" name="price" value={query.price} />}
          {query.type && <input type="hidden" name="type" value={query.type} />}
          {query.sort !== "featured" && <input type="hidden" name="sort" value={query.sort} />}
          <button type="submit" className="shrink-0 rounded-xl bg-accent px-4 py-2 font-extrabold text-accent-contrast hover:bg-accent-hover">
            Tìm
          </button>
        </Form>
      </div>
      <Catalog products={products} categories={categories} query={query} base="/browse" />
    </div>
  );
}

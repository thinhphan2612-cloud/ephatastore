import Link from "next/link";
import { CATEGORIES } from "@/data/categories";
import {
  getFeatured,
  getNewReleases,
  getPopular,
  getProductsByCategory,
} from "@/data/products";
import { FeaturedHero } from "@/components/featured-hero";
import { ProductRow } from "@/components/product-row";

export default function HomePage() {
  const featured = getFeatured();
  const hero = featured[0];

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-8">
      {/* hero */}
      {hero && <FeaturedHero product={hero} />}

      {/* lối tắt danh mục */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {CATEGORIES.map((c) => (
          <Link
            key={c.id}
            href={`/category/${c.slug}`}
            className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface p-4 text-center transition hover:border-accent/50 hover:bg-surface-hover"
          >
            <span className="text-3xl">{c.icon}</span>
            <span className="text-sm font-medium text-text">{c.name}</span>
          </Link>
        ))}
      </div>

      <ProductRow title="Mới phát hành" products={getNewReleases()} moreHref="/browse" />
      <ProductRow title="Phổ biến" products={getPopular()} moreHref="/browse" />
      <ProductRow title="Nổi bật" products={getFeatured()} moreHref="/browse" />

      {/* một hàng theo danh mục game để làm mẫu */}
      <ProductRow
        title="Game giáo lý"
        products={getProductsByCategory("cat-game")}
        moreHref="/category/game-giao-ly"
      />
    </div>
  );
}

import { type NextRequest } from "next/server";
import { getAllProducts } from "@/data/products";
import { displayPrice, hasFreeVersion, sortProducts } from "@/lib/catalog";
import { vndToPoints } from "@/lib/points";
import { TYPE_LABEL } from "@/lib/labels";
import { kindsFor } from "@/lib/purchase-kinds";

/**
 * Danh mục nổi bật công khai cho app đối tác (vd Giáo Lý Số nhúng mục "App nổi bật" trong tab Ephata Store).
 * Chỉ trả dữ liệu đã hiện công khai trên trang chủ (sản phẩm published + active), không có gì riêng tư,
 * nên cho mọi origin đọc (CORS *). CDN giữ 10 phút để không dội vào Supabase.
 * GET /api/public/v1/featured?limit=6  (1..12, mặc định 6)
 */
const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Cache-Control": "public, s-maxage=600, stale-while-revalidate=86400",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: HEADERS });
}

export async function GET(request: NextRequest) {
  const raw = Number(request.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(Math.floor(raw), 12) : 6;
  try {
    const all = await getAllProducts();
    // Thứ tự giống "Nổi bật" trên trang chủ: featured trước, rồi mới, rồi theo ngày phát hành
    const picked = sortProducts(all, "featured").slice(0, limit);
    const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://ephatastore.com").replace(/\/$/, "");
    return Response.json(
      {
        total: all.length,
        free: all.filter(hasFreeVersion).length,
        products: picked.map((p) => {
          const annual = kindsFor(p.type)[0] === "annual";
          // Khách chỉ thấy giá bằng point (không quy ra đ). Phần mềm bán key vẫn có bản miễn phí.
          const points = vndToPoints(displayPrice(p));
          return {
            slug: p.slug,
            title: p.title,
            tagline: p.tagline,
            type: p.type,
            typeLabel: TYPE_LABEL[p.type] ?? "",
            tier: p.tier,
            hasFree: hasFreeVersion(p), // phần mềm PRO vẫn có bản miễn phí
            price: displayPrice(p),
            points,
            priceLabel:
              p.tier === "free"
                ? "Miễn phí"
                : p.type === "software"
                  ? `Miễn phí · Pro ${points.toLocaleString("vi-VN")} point`
                  : `${points.toLocaleString("vi-VN")} point${annual ? "/năm" : ""}`,
            giaolyProFree: p.giaolyProFree,
            coverUrl: p.coverUrl || null,
            logoUrl: p.logoUrl ?? null,
            icon: p.icon ?? null,
            featured: p.featured,
            isNew: p.isNew,
            isPopular: p.isPopular,
            url: `${site}/product/${p.slug}`,
          };
        }),
      },
      { headers: HEADERS }
    );
  } catch (e) {
    console.error("[public/featured]", e);
    return Response.json({ error: "Không tải được danh mục" }, { status: 500, headers: { ...HEADERS, "Cache-Control": "no-store" } });
  }
}

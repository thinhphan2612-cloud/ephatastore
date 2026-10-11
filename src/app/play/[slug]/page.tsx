import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canAccessProduct } from "@/lib/access";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { GameFrame } from "@/components/game-frame";
import { hostedPlayUrl } from "@/lib/hosted-access";
import { hasActiveConnection } from "@/data/apps";
import { acceptAppConnection } from "@/lib/actions/apps";

export const metadata = { title: "Chơi game" };

export default async function PlayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = createStoreAdminClient();
  const { data: product } = await supabase
    .from("products")
    .select("id,title,type,tier,price_month,giaoly_pro_free,uses_wallet,game_url,published")
    .eq("slug", slug)
    .maybeSingle();

  if (!product || !product.published) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/play/${slug}`);

  const owned = await canAccessProduct(user.id, {
    id: product.id,
    tier: product.tier,
    type: product.type,
    priceMonth: product.price_month ?? 0,
    giaolyProFree: product.giaoly_pro_free,
  });
  if (!owned) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold">Chưa sở hữu</h1>
        <p className="mt-2 text-text-muted">Bạn cần mua/nhận game này để chơi.</p>
        <Link
          href={`/product/${slug}`}
          className="mt-5 inline-block rounded-md bg-accent px-5 py-2 font-semibold text-accent-contrast hover:bg-accent-hover"
        >
          Xem sản phẩm
        </Link>
      </div>
    );
  }

  if (!product.game_url) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-bold">{product.title}</h1>
        <p className="mt-2 text-text-muted">Game chưa được cấu hình để chơi.</p>
      </div>
    );
  }

  // App trừ point qua Ví Ephata: xin phép người dùng lần đầu.
  if (product.uses_wallet && !(await hasActiveConnection(product.id, user.id))) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-xl font-bold">Cho phép {product.title} dùng Ví Ephata?</h1>
        <p className="mt-3 text-text-muted">
          Một số dịch vụ trong ứng dụng này tính phí theo lượt dùng và sẽ <b className="text-text">trừ point trong Ví Ephata</b>{" "}
          của bạn. Mỗi lần trừ đều ghi rõ trong lịch sử Ví; bạn ngắt kết nối được bất cứ lúc nào ở trang Ví.
        </p>
        <form action={acceptAppConnection} className="mt-6 flex flex-wrap gap-3">
          <input type="hidden" name="product_id" value={product.id} />
          <input type="hidden" name="next" value={`/play/${slug}`} />
          <button type="submit" className="rounded-xl bg-accent px-5 py-2.5 font-bold text-accent-contrast hover:bg-accent-hover">
            Cho phép và mở
          </button>
          <Link href={`/product/${slug}`} className="rounded-xl border border-border px-5 py-2.5 text-text-muted hover:text-text">
            Hủy
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">{product.title}</h1>
        <Link href="/library" className="text-sm text-brand hover:text-brand-hover">
          ← Thư viện
        </Link>
      </div>
      {/* File host trên store: URL kèm mã truy cập theo người chơi (bucket private). */}
      <GameFrame src={hostedPlayUrl(product.game_url, user.id) ?? product.game_url} title={product.title} />
    </div>
  );
}

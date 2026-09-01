import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { canAccessProduct } from "@/lib/access";
import { createStoreAdminClient } from "@/lib/supabase/store-admin";
import { GameFrame } from "@/components/game-frame";

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
    .select("id,title,type,tier,game_url,published")
    .eq("slug", slug)
    .maybeSingle();

  if (!product || !product.published) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/play/${slug}`);

  const owned = await canAccessProduct(user.id, {
    id: product.id,
    tier: product.tier,
    type: product.type,
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">{product.title}</h1>
        <Link href="/library" className="text-sm text-brand hover:text-brand-hover">
          ← Thư viện
        </Link>
      </div>
      <GameFrame src={product.game_url} title={product.title} />
    </div>
  );
}

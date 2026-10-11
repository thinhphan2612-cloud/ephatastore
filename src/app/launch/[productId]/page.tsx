import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { accessFor, connect, createLaunchToken, getAppProductById, hasActiveConnection } from "@/data/apps";
import { acceptAppConnection } from "@/lib/actions/apps";

export const metadata = { title: "Mở ứng dụng" };

/**
 * Cửa vào app ngoài (Link ngoài / Tính năng có URL): kiểm quyền → (app trừ point) xin phép lần đầu →
 * chuyển sang app kèm ?ephata_token= (ký Ed25519, hạn 5 phút) để app nhận diện người dùng.
 */
export default async function LaunchPage({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/launch/${productId}`);

  const product = await getAppProductById(productId);
  if (!product?.app_url) notFound();

  const access = await accessFor(user.id, product);
  if (!access.active) {
    return (
      <Box>
        <h1 className="text-xl font-bold">Chưa có quyền dùng</h1>
        <p className="mt-2 text-text-muted">Bạn cần mua hoặc nhận {product.title} trước khi mở.</p>
        <Link href={`/product/${product.slug}`} className={btn}>
          Xem sản phẩm
        </Link>
      </Box>
    );
  }

  if (product.uses_wallet && !(await hasActiveConnection(product.id, user.id))) {
    return (
      <Box>
        <h1 className="text-xl font-bold">Cho phép {product.title} dùng Ví Ephata?</h1>
        <p className="mt-3 text-text-muted">
          Ứng dụng này tính phí theo lượt dùng dịch vụ. Khi bạn dùng, ứng dụng sẽ <b className="text-text">trừ point trong Ví
          Ephata</b> của bạn. Mỗi lần trừ đều ghi rõ trong lịch sử Ví, và bạn ngắt kết nối được bất cứ lúc nào ở trang Ví.
        </p>
        <p className="mt-2 text-sm text-text-faint">Ứng dụng cũng nhận email tài khoản Ephata của bạn để nhận diện.</p>
        <form action={acceptAppConnection} className="mt-6 flex flex-wrap gap-3">
          <input type="hidden" name="product_id" value={product.id} />
          <input type="hidden" name="next" value={`/launch/${product.id}`} />
          <button type="submit" className="rounded-xl bg-accent px-5 py-2.5 font-bold text-accent-contrast hover:bg-accent-hover">
            Cho phép và mở ứng dụng
          </button>
          <Link href={`/product/${product.slug}`} className="rounded-xl border border-border px-5 py-2.5 text-text-muted hover:text-text">
            Hủy
          </Link>
        </form>
      </Box>
    );
  }

  // App không trừ point: kết nối tự động (để app đổi token lấy mã kết nối / kiểm quyền về sau).
  if (!product.uses_wallet) await connect(product.id, user.id);

  const token = await createLaunchToken(product, user);
  const url = new URL(product.app_url);
  url.searchParams.set("ephata_token", token);
  redirect(url.toString());
}

const btn =
  "mt-5 inline-block rounded-xl bg-accent px-5 py-2.5 font-bold text-accent-contrast hover:bg-accent-hover";

function Box({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-lg px-4 py-16">{children}</div>;
}

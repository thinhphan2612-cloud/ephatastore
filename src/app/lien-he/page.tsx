import { getCurrentUser } from "@/lib/auth";
import { ContactForm } from "@/components/contact-form";
import { COMPANY } from "@/lib/company";
import type { CONTACT_TOPICS } from "@/lib/contact-topics";

export const metadata = { title: "Liên hệ" };

// ?chu-de= (slug) → chủ đề chọn sẵn; ?ma= mã nạp → điền sẵn vào nội dung (vd từ trang đơn nạp bị từ chối).
const TOPIC_SLUG: Record<string, (typeof CONTACT_TOPICS)[number]> = {
  "nap-point": "Nạp point",
  "mua-hang": "Mua hàng / sản phẩm",
  "tai-khoan": "Tài khoản / đăng nhập",
  "hop-tac": "Hợp tác / đưa sản phẩm lên",
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ "chu-de"?: string; ma?: string }> }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const topic = TOPIC_SLUG[sp["chu-de"] ?? ""];
  const code = /^[A-Z0-9]{4,20}$/.test(sp.ma ?? "") ? sp.ma : undefined;
  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <h1 className="text-2xl font-bold">Liên hệ Ephata Store</h1>
      <p className="mt-2 text-text-muted">
        Hỗ trợ nạp point, mua hàng, tài khoản, hoặc đề xuất / hợp tác đưa sản phẩm lên Ephata. Chúng tôi trả lời qua email.
      </p>
      <div className="mt-8 rounded-xl border border-border bg-bg-elevated p-6">
        <ContactForm
          defaultEmail={user?.email ?? undefined}
          defaultTopic={topic}
          defaultMessage={code ? `Mã nạp: ${code}
Thời gian chuyển khoản: 
Ngân hàng chuyển: 
` : undefined}
        />
      </div>
      <p className="mt-6 text-xs text-text-faint">
        Ephata Store do <strong className="text-text-muted">{COMPANY.name}</strong> vận hành.
      </p>
    </div>
  );
}

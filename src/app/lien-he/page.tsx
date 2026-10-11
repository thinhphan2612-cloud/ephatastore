import { getCurrentUser } from "@/lib/auth";
import { ContactForm } from "@/components/contact-form";
import { COMPANY } from "@/lib/company";

export const metadata = { title: "Liên hệ" };

export default async function ContactPage() {
  const user = await getCurrentUser();
  return (
    <div className="mx-auto max-w-2xl px-4 py-14">
      <h1 className="text-2xl font-bold">Liên hệ Ephata Store</h1>
      <p className="mt-2 text-text-muted">
        Hỗ trợ nạp point, mua hàng, tài khoản, hoặc đề xuất / hợp tác đưa sản phẩm lên Ephata. Chúng tôi trả lời qua email.
      </p>
      <div className="mt-8 rounded-xl border border-border bg-bg-elevated p-6">
        <ContactForm defaultEmail={user?.email ?? undefined} />
      </div>
      <p className="mt-6 text-xs text-text-faint">
        Ephata Store do <strong className="text-text-muted">{COMPANY.name}</strong> vận hành.
      </p>
    </div>
  );
}

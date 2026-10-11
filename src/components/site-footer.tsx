import Link from "next/link";
import { COMPANY } from "@/lib/company";

export function SiteFooter() {
  return (
    <footer className="border-t border-border py-11 text-[13px] text-text-muted">
      <div className="mx-auto grid w-[min(1180px,calc(100%-40px))] gap-6 sm:grid-cols-2 sm:items-end">
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="Ephata Store"
            width={466}
            height={200}
            className="h-8 w-auto"
          />
          <p className="mt-2">Công cụ số cho cộng đồng Công giáo Việt Nam.</p>
        </div>
        <div className="grid gap-1.5 sm:justify-items-end sm:text-right">
          <span>
            © {new Date().getFullYear()} {COMPANY.name}
          </span>
          <nav className="flex flex-wrap gap-x-2 sm:justify-end">
            <Link href="/dieu-khoan" className="hover:text-text">
              Điều khoản
            </Link>
            ·
            <Link href="/quyen-rieng-tu" className="hover:text-text">
              Quyền riêng tư
            </Link>
            ·
            <Link href="/lien-he" className="hover:text-text">
              Liên hệ
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

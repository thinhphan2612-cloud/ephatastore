import type { Metadata } from "next";
import { Be_Vietnam_Pro, Lora } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-ui",
  weight: ["400", "500", "600", "700", "800"],
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

const lora = Lora({
  variable: "--font-display",
  weight: ["600", "700"],
  subsets: ["latin", "vietnamese"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Ephata Store — Công cụ số cho cộng đồng Công giáo",
    template: "%s · Ephata Store",
  },
  description:
    "Kho công cụ số Công giáo: web app, biểu mẫu, thiết kế, tài liệu và game giáo lý — cho giáo xứ, giáo lý viên và cộng đoàn.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${beVietnam.variable} ${lora.variable} h-full antialiased`}
      // Script theme bên dưới đặt data-theme / color-scheme trước khi React chạy → bỏ qua lệch thuộc tính của riêng thẻ này.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <script
          dangerouslySetInnerHTML={{
            __html:
              // Theme: khách chọn Sáng / Tối, hoặc mặc định Theo máy (prefers-color-scheme, đổi theo máy ngay khi máy đổi).
              "(function(){var r=document.documentElement,m=window.matchMedia&&matchMedia('(prefers-color-scheme: light)');function pref(){try{var p=localStorage.getItem('ephata_theme');return p==='light'||p==='dark'?p:'system'}catch(e){return 'system'}}function apply(){var p=pref(),l=p==='light'||(p==='system'&&!!m&&m.matches);r.dataset.themePref=p;if(l){r.dataset.theme='light';r.style.colorScheme='light'}else{delete r.dataset.theme;r.style.colorScheme='dark'}}window.__ephataApplyTheme=apply;apply();if(m&&m.addEventListener)m.addEventListener('change',apply)})()",
          }}
        />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

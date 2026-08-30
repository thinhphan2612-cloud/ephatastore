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
    >
      <body className="min-h-full flex flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}

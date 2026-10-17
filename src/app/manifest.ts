import type { MetadataRoute } from "next";

/**
 * Lưu trang ra màn hình chính điện thoại ("Thêm vào Màn hình chính") → hiện như app, icon chữ EPHATA trên nền kem.
 * Không đặt start_url: app mở đúng trang lúc lưu (lưu từ /admin thì mở /admin).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ephata Store",
    short_name: "Ephata",
    description: "Kho công cụ số Công giáo cho giáo xứ, giáo lý viên và cộng đoàn.",
    display: "standalone",
    background_color: "#f6f1e7",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      // Android cắt icon theo khung tròn / bo góc — bản này chữ nhỏ hơn để không mất chữ.
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

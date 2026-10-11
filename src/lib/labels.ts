import type { ProductType } from "@/lib/types";

export const TYPE_LABEL: Record<ProductType, string> = {
  tool: "Công cụ",
  game: "Game",
  asset: "Tài liệu tải về",
  image: "Hình ảnh",
  feature: "Tính năng",
  software: "Phần mềm",
};

export const TYPE_ICON: Record<ProductType, string> = {
  tool: "🛠️",
  game: "🎮",
  asset: "🎨",
  image: "🖼️",
  feature: "🧩",
  software: "💻",
};

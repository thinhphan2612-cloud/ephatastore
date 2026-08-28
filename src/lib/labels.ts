import type { ProductType } from "@/lib/types";

export const TYPE_LABEL: Record<ProductType, string> = {
  tool: "Công cụ",
  game: "Game",
  asset: "Asset",
  image: "Hình ảnh",
  feature: "Tính năng",
};

export const TYPE_ICON: Record<ProductType, string> = {
  tool: "🛠️",
  game: "🎮",
  asset: "🎨",
  image: "🖼️",
  feature: "🧩",
};

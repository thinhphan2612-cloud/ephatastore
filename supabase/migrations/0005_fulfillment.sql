-- ============================================================
-- 0005 — Giao hàng theo loại sản phẩm. CHẠY TRONG SUPABASE STORE.
-- ============================================================

-- Đường file tải về (nằm trong bucket PRIVATE 'product-files'); dùng cho asset/image/tool.
alter table products add column if not exists download_path text;

-- URL game để nhúng/chơi trên store (/play/[slug]); dùng cho game.
alter table products add column if not exists game_url text;

-- Khoá tính năng tích hợp vào giaoly; dùng cho feature (provision ở Phase 4).
alter table products add column if not exists giaoly_feature_key text;

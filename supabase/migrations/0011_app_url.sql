-- ============================================================
-- 0011 — URL mở tiện ích web-app (tool/feature). CHẠY TRONG SUPABASE STORE.
-- ============================================================

-- Nơi mở tiện ích khi đã sở hữu (mở tab mới). Dùng cho type tool/feature.
alter table products add column if not exists app_url text;

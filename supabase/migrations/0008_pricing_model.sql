-- ============================================================
-- 0008 — Mô hình giá v3: entitlements có hạn + Trial + gói năm.
-- CHẠY TRONG SUPABASE STORE.
-- ============================================================

-- Quyền sở hữu có thời hạn. expires_at NULL = vĩnh viễn (free / grant tay).
alter table entitlements add column if not exists expires_at timestamptz;
-- Nguồn cấp: free | trial | purchase | freedom | topping | grant
alter table entitlements add column if not exists source text not null default 'purchase';

-- Đơn: số ngày cấp quyền khi duyệt (NULL = vĩnh viễn) + loại đơn.
alter table orders add column if not exists access_days int;
alter table orders add column if not exists kind text not null default 'purchase';

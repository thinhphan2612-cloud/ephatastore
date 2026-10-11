-- 0021 — Tin nhắn từ form Liên hệ (/lien-he). Lưu lại để không mất tin khi gửi email lỗi + chống spam theo giờ.
-- CHẠY TRÊN PROJECT SUPABASE "EPHATA STORE" (ref keaelbirdtpyfxyifdlf). An toàn chạy lại.

do $$
begin
  if to_regclass('public.products') is null then
    raise exception 'Không thấy bảng public.products — có thể đang mở nhầm project. Hãy chạy trên project Ephata Store (keaelbirdtpyfxyifdlf).';
  end if;
end $$;

create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  topic       text not null,
  message     text not null,
  store_user_id uuid,                 -- người gửi đang đăng nhập (nếu có)
  ip_hash     text,                   -- sha256(IP + muối) — không lưu IP gốc; dùng giới hạn số lần gửi
  email_sent  boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);
create index if not exists contact_messages_ip_idx on public.contact_messages (ip_hash, created_at desc);
create index if not exists contact_messages_email_idx on public.contact_messages (email, created_at desc);
alter table public.contact_messages enable row level security;  -- chỉ server đọc/ghi

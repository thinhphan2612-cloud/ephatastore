-- Pha 1: Ví Point (nạp trước, trừ khi dùng công cụ AI).
-- Quy đổi: 100đ = 1 point (xem src/lib/points.ts).

-- Số dư điểm mỗi user
create table if not exists point_wallets (
  user_id    uuid primary key references profiles(id) on delete cascade,
  balance    integer not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- Sổ cái: mỗi thay đổi điểm là 1 dòng (+nạp / -tiêu / hoàn)
create table if not exists point_ledger (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  amount        integer not null,            -- + nạp / - tiêu
  balance_after integer not null,
  kind          text not null,               -- 'topup' | 'spend' | 'refund' | 'adjust'
  ref           text,                        -- mã đơn nạp / id phiên AI
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists point_ledger_user_idx on point_ledger(user_id, created_at desc);

-- Yêu cầu nạp điểm (VietQR + admin duyệt tay)
create table if not exists point_topups (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  code        text unique not null,          -- nội dung chuyển khoản
  amount_vnd  integer not null check (amount_vnd > 0),
  points      integer not null check (points > 0),
  status      text not null default 'pending', -- pending | paid | rejected
  created_at  timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid
);
create index if not exists point_topups_status_idx on point_topups(status, created_at desc);

-- Chỉ truy cập qua service role (admin client). Bật RLS, không policy = deny cho anon/authenticated.
alter table point_wallets enable row level security;
alter table point_ledger  enable row level security;
alter table point_topups  enable row level security;

-- Điều chỉnh điểm ATOMIC + ghi sổ cái. delta âm để trừ; chặn số dư âm.
create or replace function adjust_points(
  p_user   uuid,
  p_amount integer,
  p_kind   text,
  p_ref    text default null,
  p_note   text default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_balance integer;
begin
  insert into point_wallets(user_id, balance) values (p_user, 0)
    on conflict (user_id) do nothing;

  update point_wallets
     set balance = balance + p_amount, updated_at = now()
   where user_id = p_user
  returning balance into new_balance;

  if new_balance < 0 then
    raise exception 'INSUFFICIENT_POINTS';
  end if;

  insert into point_ledger(user_id, amount, balance_after, kind, ref, note)
    values (p_user, p_amount, new_balance, p_kind, p_ref, p_note);

  return new_balance;
end;
$$;

-- ============================================================
-- Ephata Store — schema thương mại (DB store, TÁCH khỏi DB giaoly)
-- Chỉ chứa dữ liệu marketplace. KHÔNG chứa dữ liệu giáo dân.
-- Identity user tham chiếu sang Supabase giaoly qua giaoly_user_id (uuid).
-- ============================================================

create extension if not exists "uuid-ossp";

-- ---- Enums ----
create type product_type as enum ('tool', 'game', 'asset', 'image', 'feature');
create type min_plan as enum ('free', 'pro');
create type order_status as enum ('pending', 'paid', 'failed', 'refunded', 'cancelled');

-- ---- Danh mục ----
create table categories (
  id          uuid primary key default uuid_generate_v4(),
  slug        text not null unique,
  name        text not null,
  icon        text,
  description text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ---- Nhà phát hành ----
create table publishers (
  id          uuid primary key default uuid_generate_v4(),
  slug        text not null unique,
  name        text not null,
  avatar_url  text,
  verified    boolean not null default false,
  -- chủ sở hữu publisher = 1 user bên giaoly (nếu là seller)
  owner_giaoly_user_id uuid,
  created_at  timestamptz not null default now()
);

-- ---- Sản phẩm ----
create table products (
  id            uuid primary key default uuid_generate_v4(),
  slug          text not null unique,
  title         text not null,
  tagline       text not null default '',
  description   text not null default '',
  type          product_type not null,
  category_id   uuid not null references categories(id) on delete restrict,
  publisher_id  uuid not null references publishers(id) on delete restrict,

  price_vnd          int not null default 0 check (price_vnd >= 0),
  original_price_vnd int check (original_price_vnd >= 0),

  cover_url     text,
  gallery       jsonb not null default '[]'::jsonb,   -- text[]
  tags          jsonb not null default '[]'::jsonb,   -- text[]

  min_plan      min_plan,                              -- null = ai cũng mua được

  rating        numeric(2,1) not null default 0,
  rating_count  int not null default 0,

  released_at   date,
  featured      boolean not null default false,
  is_new        boolean not null default false,
  is_popular    boolean not null default false,
  published     boolean not null default true,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index products_category_idx on products(category_id);
create index products_type_idx     on products(type);
create index products_published_idx on products(published);

-- ---- Đơn hàng ----
create table orders (
  id                 uuid primary key default uuid_generate_v4(),
  giaoly_user_id     uuid not null,                 -- người mua (từ giaoly auth)
  status             order_status not null default 'pending',
  total_vnd          int not null default 0 check (total_vnd >= 0),

  -- PayOS
  payos_order_code   bigint unique,
  payos_payment_link text,
  paid_at            timestamptz,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index orders_user_idx on orders(giaoly_user_id);

create table order_items (
  id           uuid primary key default uuid_generate_v4(),
  order_id     uuid not null references orders(id) on delete cascade,
  product_id   uuid not null references products(id) on delete restrict,
  -- chốt giá tại thời điểm mua
  unit_price_vnd int not null check (unit_price_vnd >= 0),
  created_at   timestamptz not null default now()
);

create index order_items_order_idx on order_items(order_id);

-- ---- Sở hữu (entitlement) — user nào có quyền dùng product nào ----
create table entitlements (
  id             uuid primary key default uuid_generate_v4(),
  giaoly_user_id uuid not null,
  product_id     uuid not null references products(id) on delete cascade,
  order_id       uuid references orders(id) on delete set null,
  granted_at     timestamptz not null default now(),
  unique (giaoly_user_id, product_id)
);

create index entitlements_user_idx on entitlements(giaoly_user_id);

-- ---- updated_at tự động ----
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger products_updated_at before update on products
  for each row execute function set_updated_at();
create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();

-- ============================================================
-- LƯU Ý RLS (làm ở migration sau, khi đã chốt cách verify JWT giaoly):
--   * categories/publishers/products: cho phép SELECT công khai (published = true).
--   * orders/order_items/entitlements: chỉ chủ sở hữu (giaoly_user_id = auth.uid())
--     đọc được; ghi qua service role ở API server sau khi PayOS xác nhận.
-- ============================================================

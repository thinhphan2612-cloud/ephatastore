-- Ephata Store — bootstrap DB (chạy 1 lần trong Supabase SQL Editor)

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


-- ============================================================
-- RLS: catalog đọc công khai; đơn hàng/sở hữu bị khoá.
-- ============================================================

-- Bật RLS toàn bộ
alter table categories   enable row level security;
alter table publishers   enable row level security;
alter table products     enable row level security;
alter table orders       enable row level security;
alter table order_items  enable row level security;
alter table entitlements enable row level security;

-- Catalog: cho phép SELECT công khai (anon + authenticated)
create policy "public read categories" on categories
  for select using (true);

create policy "public read publishers" on publishers
  for select using (true);

create policy "public read products" on products
  for select using (published = true);

-- orders / order_items / entitlements: KHÔNG có policy công khai.
-- Chỉ ghi/đọc qua service_role ở API server (sau khi có SSO + PayOS).
-- Sẽ thêm policy theo auth.uid() = giaoly_user_id ở migration SSO.


-- ============================================================
-- Seed catalog — dữ liệu mẫu ban đầu (khớp với src/data cũ).
-- Idempotent: chạy lại không nhân đôi (dựa trên slug unique).
-- ============================================================

-- ---- Danh mục ----
insert into categories (slug, name, icon, description, sort_order) values
  ('cong-cu',        'Công cụ',            '🛠️', 'Công cụ hỗ trợ mục vụ, quản lý, phụng vụ cho giáo xứ.', 1),
  ('game-giao-ly',   'Game giáo lý',       '🎮', 'Trò chơi học hỏi Kinh Thánh và giáo lý cho mọi lứa tuổi.', 2),
  ('asset-thiet-ke', 'Asset thiết kế',     '🎨', 'Template, font, đồ hoạ dùng cho ấn phẩm Công giáo.', 3),
  ('hinh-anh',       'Hình ảnh',           '🖼️', 'Kho ảnh thánh, tranh, hình nền chất lượng cao.', 4),
  ('tinh-nang',      'Tính năng tích hợp', '🧩', 'Tính năng cắm thẳng vào app.giaoly.com.vn.', 5)
on conflict (slug) do nothing;

-- ---- Nhà phát hành ----
insert into publishers (slug, name, verified) values
  ('ephata',        'Ephata Team',    true),
  ('126verse',      '126verse',       true),
  ('giaoxu-studio', 'Giáo Xứ Studio', false),
  ('lumen',         'Lumen Creative', false)
on conflict (slug) do nothing;

-- ---- Sản phẩm ----
insert into products
  (slug, title, tagline, description, type, category_id, publisher_id,
   price_vnd, original_price_vnd, tags, min_plan, rating, rating_count,
   released_at, featured, is_new, is_popular)
select v.slug, v.title, v.tagline, v.description, v.type::product_type,
       c.id, p.id,
       v.price_vnd, v.original_price_vnd, v.tags::jsonb, v.min_plan::min_plan,
       v.rating, v.rating_count, v.released_at, v.featured, v.is_new, v.is_popular
from (values
  ('bo-cong-cu-quan-ly-giao-ly', 'Bộ công cụ Quản lý Giáo lý',
   'Điểm danh, chấm điểm, xếp lớp — tất cả trong một.',
   'Công cụ toàn diện cho ban giáo lý viên: quản lý danh sách học viên theo lớp, điểm danh nhanh, theo dõi tiến độ học tập và xuất báo cáo cuối khoá. Tích hợp trực tiếp với hệ thống giáo dân theo giáo xứ.',
   'tool', 'cong-cu', 'ephata', 299000, 499000,
   '["giáo lý","quản lý","giáo xứ","báo cáo"]', 'pro', 4.8, 142, date '2026-06-15', true, false, true),

  ('hanh-trinh-emmau', 'Hành Trình Emmau',
   'Game phiêu lưu học Kinh Thánh Tân Ước.',
   'Đồng hành cùng hai môn đệ trên đường Emmau, giải các câu đố dựa trên Tin Mừng và khám phá câu chuyện Phục Sinh. Phù hợp thiếu nhi và dự tòng.',
   'game', 'game-giao-ly', '126verse', 0, null,
   '["Kinh Thánh","thiếu nhi","phiêu lưu","Tân Ước"]', 'free', 4.6, 310, date '2026-07-01', true, true, true),

  ('do-vui-giao-ly-online', 'Đố Vui Giáo Lý',
   '1000+ câu hỏi trắc nghiệm, chơi theo đội.',
   'Bộ đố vui trắc nghiệm giáo lý theo cấp độ Khai Tâm đến Vào Đời, hỗ trợ chơi theo đội trong buổi sinh hoạt. Có bảng xếp hạng và câu hỏi cập nhật hằng tuần.',
   'game', 'game-giao-ly', 'ephata', 149000, null,
   '["trắc nghiệm","sinh hoạt","đội nhóm"]', null, 4.5, 88, date '2026-05-20', false, false, true),

  ('template-thiep-le-trong', 'Template Thiệp Lễ Trọng',
   '40 mẫu thiệp Canva cho các lễ lớn trong năm.',
   'Bộ 40 template Canva chỉnh sửa được cho Giáng Sinh, Phục Sinh, lễ bổn mạng, thêm sức, rước lễ lần đầu... Định dạng in ấn và mạng xã hội.',
   'asset', 'asset-thiet-ke', 'lumen', 199000, 350000,
   '["Canva","thiệp","in ấn","lễ trọng"]', null, 4.9, 205, date '2026-04-10', true, false, true),

  ('bo-font-thu-phap-cong-giao', 'Bộ Font Thư Pháp Công Giáo',
   '6 font thư pháp Việt cho câu Lời Chúa.',
   'Sáu font thư pháp Việt hoá hoàn chỉnh, hỗ trợ dấu tiếng Việt đầy đủ, lý tưởng để trình bày câu Lời Chúa, băng rôn và ấn phẩm phụng vụ.',
   'asset', 'asset-thiet-ke', 'lumen', 129000, null,
   '["font","thư pháp","tiếng Việt"]', null, 4.7, 64, date '2026-03-28', false, false, false),

  ('kho-anh-thanh-4k', 'Kho Ảnh Thánh 4K',
   '500 ảnh thánh & tranh cổ điển độ phân giải cao.',
   'Bộ sưu tập 500 ảnh thánh, tranh cổ điển và hình nền độ phân giải 4K, phân loại theo mùa phụng vụ và thánh bổn mạng. Giấy phép dùng trong sinh hoạt giáo xứ.',
   'image', 'hinh-anh', 'giaoxu-studio', 249000, null,
   '["ảnh thánh","4K","hình nền","phụng vụ"]', null, 4.6, 121, date '2026-02-14', false, false, true),

  ('tinh-nang-lich-phung-vu', 'Lịch Phụng Vụ Tự Động',
   'Cắm vào app: lịch phụng vụ, bài đọc mỗi ngày.',
   'Tính năng tích hợp hiển thị lịch phụng vụ Công giáo, màu áo lễ, bài đọc và Tin Mừng mỗi ngày ngay trong app.giaoly.com.vn. Cập nhật tự động theo năm phụng vụ.',
   'feature', 'tinh-nang', 'ephata', 0, null,
   '["phụng vụ","lịch","bài đọc","tích hợp"]', 'free', 4.9, 178, date '2026-07-20', true, true, false),

  ('tinh-nang-so-quy-giao-xu', 'Sổ Quỹ Giáo Xứ',
   'Quản lý thu chi, quỹ, báo cáo minh bạch.',
   'Tính năng quản lý thu chi và các quỹ của giáo xứ, kèm báo cáo minh bạch cho hội đồng mục vụ. Phân quyền theo vai trò, xuất PDF/Excel.',
   'feature', 'tinh-nang', 'ephata', 399000, null,
   '["tài chính","quỹ","báo cáo","tích hợp"]', 'pro', 4.7, 53, date '2026-06-30', false, true, false),

  ('goi-thiet-ke-giang-sinh-2026', 'Gói Thiết Kế Giáng Sinh 2026',
   'Trọn bộ đồ hoạ cho mùa Giáng Sinh.',
   'Trọn bộ đồ hoạ mùa Giáng Sinh 2026: phông sân khấu, thiệp, story mạng xã hội, khung ảnh và icon. File nguồn PSD và Canva.',
   'asset', 'asset-thiet-ke', 'giaoxu-studio', 279000, 450000,
   '["Giáng Sinh","phông","story","PSD"]', null, 4.8, 97, date '2026-08-01', false, true, true),

  ('game-hanh-huong-thanh-dia', 'Hành Hương Thánh Địa',
   'Game bản đồ khám phá các trung tâm hành hương.',
   'Khám phá các trung tâm hành hương Công giáo qua bản đồ tương tác, trả lời câu hỏi lịch sử và tích luỹ huy hiệu. Kết nối với khu hành hương thực tế.',
   'game', 'game-giao-ly', '126verse', 99000, null,
   '["hành hương","bản đồ","lịch sử"]', null, 4.4, 41, date '2026-08-10', false, true, false),

  ('bo-icon-phung-vu', 'Bộ Icon Phụng Vụ',
   '240 icon vector chủ đề Công giáo.',
   '240 icon vector (SVG) chủ đề phụng vụ và bí tích, nét đồng nhất, dùng cho slide, app và ấn phẩm. Bao gồm bản line và bản đặc.',
   'asset', 'asset-thiet-ke', 'lumen', 89000, null,
   '["icon","SVG","vector"]', null, 4.5, 72, date '2026-01-18', false, false, false),

  ('cong-cu-diem-danh-thieu-nhi', 'Điểm Danh Thiếu Nhi',
   'Quét QR điểm danh Thiếu Nhi Thánh Thể.',
   'Ứng dụng điểm danh nhanh bằng QR cho các đoàn Thiếu Nhi Thánh Thể, thống kê chuyên cần và nhắc phụ huynh tự động.',
   'tool', 'cong-cu', 'ephata', 179000, null,
   '["QR","điểm danh","thiếu nhi"]', null, 4.6, 60, date '2026-05-05', false, false, true)
) as v(slug, title, tagline, description, type, cat_slug, pub_slug,
       price_vnd, original_price_vnd, tags, min_plan, rating, rating_count,
       released_at, featured, is_new, is_popular)
join categories c on c.slug = v.cat_slug
join publishers p on p.slug = v.pub_slug
on conflict (slug) do nothing;

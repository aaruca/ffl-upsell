-- ============================================
-- GameStore - FIXED Schema (No Recursion)
-- ============================================

-- Drop tables to reset (Cascade to remove dependencies)
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.customers cascade;
drop table if exists public.product_variants cascade;
drop table if exists public.product_images cascade;
drop table if exists public.products cascade;
drop table if exists public.categories cascade;
drop table if exists public.store_users cascade;
drop table if exists public.stores cascade;

create extension if not exists "uuid-ossp";

-- STORES
create table public.stores (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  slug text unique not null,
  description text,
  logo_url text,
  banner_url text,
  whatsapp text,
  instagram text,
  email text,
  phone text,
  address text,
  currency text default 'USD' not null,
  country text,
  created_at timestamptz default now() not null
);
create index idx_stores_slug on public.stores(slug);
create index idx_stores_owner on public.stores(owner_id);

-- STORE USERS
create table public.store_users (
  id uuid default uuid_generate_v4() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('owner', 'admin', 'seller')) default 'seller' not null,
  created_at timestamptz default now() not null,
  unique(store_id, user_id)
);

-- CATEGORIES
create table public.categories (
  id uuid default uuid_generate_v4() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  name text not null,
  slug text not null,
  icon_url text,
  position int default 0 not null,
  parent_id uuid references public.categories(id) on delete set null,
  created_at timestamptz default now() not null,
  unique(store_id, slug)
);
create index idx_categories_store on public.categories(store_id);

-- PRODUCTS
create table public.products (
  id uuid default uuid_generate_v4() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  slug text not null,
  description text,
  price numeric(10,2) default 0 not null,
  compare_price numeric(10,2),
  cost numeric(10,2),
  sku text,
  barcode text,
  stock_quantity int default 0 not null,
  low_stock_alert int default 5 not null,
  condition text check (condition in ('new','used','refurbished','cib','loose','sealed')) default 'new' not null,
  platform text check (platform in ('switch','ps5','ps4','xbox-series','xbox-one','pc','retro','3ds','wii-u','other')) default 'other' not null,
  region text check (region in ('ntsc','pal','ntsc-j','region-free')) default 'region-free' not null,
  is_active boolean default true not null,
  is_featured boolean default false not null,
  position int default 0 not null,
  created_at timestamptz default now() not null,
  unique(store_id, slug)
);
create index idx_products_store on public.products(store_id);
create index idx_products_category on public.products(category_id);
create index idx_products_active on public.products(store_id, is_active);

-- PRODUCT IMAGES
create table public.product_images (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  url text not null,
  position int default 0 not null,
  is_primary boolean default false not null
);
create index idx_product_images_product on public.product_images(product_id);

-- PRODUCT VARIANTS
create table public.product_variants (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid references public.products(id) on delete cascade not null,
  name text not null,
  value text not null,
  price_adjustment numeric(10,2) default 0 not null,
  stock_quantity int default 0 not null
);

-- CUSTOMERS
create table public.customers (
  id uuid default uuid_generate_v4() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  whatsapp text,
  address text,
  notes text,
  total_orders int default 0 not null,
  total_spent numeric(10,2) default 0 not null,
  created_at timestamptz default now() not null
);
create index idx_customers_store on public.customers(store_id);

-- ORDERS
create table public.orders (
  id uuid default uuid_generate_v4() primary key,
  store_id uuid references public.stores(id) on delete cascade not null,
  customer_id uuid references public.customers(id) on delete set null,
  order_number serial,
  status text check (status in ('pending','confirmed','shipped','delivered','cancelled')) default 'pending' not null,
  subtotal numeric(10,2) default 0 not null,
  discount numeric(10,2) default 0 not null,
  shipping_cost numeric(10,2) default 0 not null,
  total numeric(10,2) default 0 not null,
  payment_method text,
  payment_status text check (payment_status in ('pending','paid','failed','refunded')) default 'pending' not null,
  shipping_method text,
  tracking_number text,
  notes text,
  source text check (source in ('web','whatsapp','pos','instagram')) default 'web' not null,
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_address text,
  created_at timestamptz default now() not null
);
create index idx_orders_store on public.orders(store_id);
create index idx_orders_status on public.orders(store_id, status);

-- ORDER ITEMS
create table public.order_items (
  id uuid default uuid_generate_v4() primary key,
  order_id uuid references public.orders(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  quantity int default 1 not null,
  unit_price numeric(10,2) not null,
  total_price numeric(10,2) not null
);
create index idx_order_items_order on public.order_items(order_id);

-- RLS
alter table public.stores enable row level security;
alter table public.store_users enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- FUNCTIONS TO AVOID RECURSION
create or replace function public.is_store_member(store_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.store_users 
    where store_users.store_id = is_store_member.store_id 
    and store_users.user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

create or replace function public.is_store_owner(store_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.stores 
    where stores.id = is_store_owner.store_id 
    and stores.owner_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- POLICIES

-- Stores
create policy "Public stores are viewable by everyone" on public.stores for select using (true);
create policy "Users can create stores" on public.stores for insert with check (auth.uid() = owner_id);
create policy "Owners can update their stores" on public.stores for update using (auth.uid() = owner_id);

-- Store Users (Fixed recursion)
create policy "Users can view their own membership" on public.store_users for select using (auth.uid() = user_id);
create policy "Owners can view their store members" on public.store_users for select using (
  exists (select 1 from public.stores where id = store_users.store_id and owner_id = auth.uid())
);
create policy "Owners can manage store members" on public.store_users for all using (
  exists (select 1 from public.stores where id = store_users.store_id and owner_id = auth.uid())
);

-- Categories
create policy "Categories viewable by everyone" on public.categories for select using (true);
create policy "Members can manage categories" on public.categories for all using (public.is_store_member(store_id));

-- Products
create policy "Active products viewable by everyone" on public.products for select using (is_active = true or public.is_store_member(store_id));
create policy "Members can manage products" on public.products for all using (public.is_store_member(store_id));

-- Product Images
create policy "Images viewable by everyone" on public.product_images for select using (true);
create policy "Members can manage images" on public.product_images for all using (
  exists (select 1 from public.products where id = product_images.product_id and public.is_store_member(store_id))
);

-- Variants
create policy "Variants viewable by everyone" on public.product_variants for select using (true);
create policy "Members can manage variants" on public.product_variants for all using (
  exists (select 1 from public.products where id = product_variants.product_id and public.is_store_member(store_id))
);

-- Customers
create policy "Members can view customers" on public.customers for select using (public.is_store_member(store_id));
create policy "Anyone can create customers" on public.customers for insert with check (true);
create policy "Members can manage customers" on public.customers for all using (public.is_store_member(store_id));

-- Orders
create policy "Members can view orders" on public.orders for select using (public.is_store_member(store_id));
create policy "Anyone can create orders" on public.orders for insert with check (true);
create policy "Members can manage orders" on public.orders for all using (public.is_store_member(store_id));

-- Order Items
create policy "Members can view order items" on public.order_items for select using (
  exists (select 1 from public.orders where id = order_items.order_id and public.is_store_member(store_id))
);
create policy "Anyone can create order items" on public.order_items for insert with check (true);

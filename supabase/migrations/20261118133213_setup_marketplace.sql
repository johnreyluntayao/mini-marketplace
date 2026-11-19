create table public.listings (
  id uuid primary key default gen_random_uuid(),
  title varchar(255) not null check (title ~ '[^[:space:]]'),
  description text not null
    check (description ~ '[^[:space:]]' and char_length(description) <= 5000),
  price numeric(10, 2) not null check (price between 0 and 99999999.99),
  category varchar(100) not null check (category ~ '[^[:space:]]'),
  seller_email varchar(255) not null
    check (seller_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  location varchar(255),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_text text generated always as (
    title::text || ' ' || description || ' ' || coalesce(location, '')
  ) stored
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_email varchar(255) not null
    check (buyer_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
  message text not null
    check (message ~ '[^[:space:]]' and char_length(message) <= 5000),
  created_at timestamptz not null default now()
);

create index listings_created_at_id_idx on public.listings (created_at desc, id desc);
create index listings_category_created_at_id_idx
  on public.listings (category, created_at desc, id desc);
create index messages_listing_id_idx on public.messages (listing_id);

alter table public.listings enable row level security;
alter table public.messages enable row level security;

revoke all on public.listings, public.messages from public, anon, authenticated;
grant select on public.listings to anon, authenticated;
grant select, insert, update, delete on public.listings, public.messages to service_role;

create policy "Visitors can read listings"
  on public.listings for select to anon, authenticated
  using (true);

create function public.set_listing_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke execute on function public.set_listing_updated_at() from public, anon, authenticated;

create trigger set_listing_updated_at
  before update on public.listings
  for each row execute function public.set_listing_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'listing-images',
  'listing-images',
  false,
  4194304,
  array['image/webp']
);

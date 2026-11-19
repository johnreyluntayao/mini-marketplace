alter table public.listings add column sold_at timestamptz;

create table public.listing_owners (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  owner_hash text not null check (owner_hash ~ '^[0-9a-f]{64}$')
);

create table public.seller_payment_accounts (
  owner_hash text not null check (owner_hash ~ '^[0-9a-f]{64}$'),
  seller_email text not null check (seller_email = lower(seller_email) and char_length(seller_email) <= 255),
  stripe_account_id text not null unique check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  charges_enabled boolean not null default false,
  payouts_enabled boolean not null default false,
  details_submitted boolean not null default false,
  stripe_checked_at timestamptz not null default '-infinity',
  primary key (owner_hash, seller_email)
);

create table public.orders (
  id uuid primary key,
  listing_id uuid not null references public.listings(id) on delete restrict,
  title text not null,
  stripe_account_id text not null references public.seller_payment_accounts(stripe_account_id) on delete restrict,
  stripe_checkout_id text unique check (stripe_checkout_id ~ '^cs_test_[A-Za-z0-9]+$'),
  stripe_payment_intent_id text unique check (stripe_payment_intent_id ~ '^pi_[A-Za-z0-9]+$'),
  amount_cents integer not null check (amount_cents between 50 and 99999999),
  platform_fee_cents integer not null check (platform_fee_cents between 0 and amount_cents),
  currency text not null default 'usd' check (currency = 'usd'),
  status text not null default 'pending' check (status in ('pending', 'paid', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '45 minutes'),
  paid_at timestamptz,
  check ((status = 'paid') = (paid_at is not null)),
  check (status <> 'paid' or (stripe_checkout_id is not null and stripe_payment_intent_id is not null))
);

create unique index orders_current_listing_idx on public.orders(listing_id) where status in ('pending', 'paid');
create index orders_listing_id_idx on public.orders(listing_id);
create index orders_stripe_account_id_idx on public.orders(stripe_account_id);

alter table public.listing_owners enable row level security;
alter table public.seller_payment_accounts enable row level security;
alter table public.orders enable row level security;

revoke all on public.listing_owners, public.seller_payment_accounts, public.orders from public, anon, authenticated;
grant select, insert, update, delete on public.listing_owners, public.seller_payment_accounts, public.orders to service_role;

create function public.publish_marketplace_listing(p_listing jsonb, p_owner_hash text)
returns public.listings
language plpgsql
set search_path = ''
as $$
declare
  saved public.listings;
begin
  insert into public.listings (id, title, description, price, category, seller_email, location, image_url)
  values (
    (p_listing ->> 'id')::uuid, p_listing ->> 'title', p_listing ->> 'description',
    (p_listing ->> 'price')::numeric, p_listing ->> 'category', p_listing ->> 'seller_email',
    p_listing ->> 'location', p_listing ->> 'image_url'
  )
  returning * into saved;

  insert into public.listing_owners (listing_id, owner_hash) values (saved.id, p_owner_hash);
  return saved;
end;
$$;

create function public.marketplace_listing_can_buy(p_listing_id uuid)
returns boolean
language sql stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.listings l
    join public.listing_owners o on o.listing_id = l.id
    join public.seller_payment_accounts a on a.owner_hash = o.owner_hash and a.seller_email = lower(l.seller_email)
    where l.id = p_listing_id and l.sold_at is null and l.price between 0.50 and 999999.99
      and a.charges_enabled and a.payouts_enabled and a.details_submitted
  );
$$;

create function public.reserve_marketplace_order(p_listing_id uuid, p_order_id uuid)
returns public.orders
language plpgsql
set search_path = ''
as $$
declare
  item public.listings;
  reserved public.orders;
  account_id text;
  cents integer;
begin
  select * into item from public.listings where id = p_listing_id for update;
  if not found or item.sold_at is not null then
    raise exception 'listing_unavailable';
  end if;

  -- A Checkout URL is only returned after its session ID is saved on a pending order.
  update public.orders set status = 'expired'
  where listing_id = item.id and status = 'pending' and stripe_checkout_id is null
    and created_at < now() - interval '3 minutes';

  select * into reserved from public.orders where listing_id = item.id and status = 'pending';
  if found then
    return reserved;
  end if;

  select a.stripe_account_id into account_id
  from public.listing_owners o
  join public.seller_payment_accounts a on a.owner_hash = o.owner_hash and a.seller_email = lower(item.seller_email)
  where o.listing_id = item.id and a.charges_enabled and a.payouts_enabled and a.details_submitted;
  if not found or item.price not between 0.50 and 999999.99 then
    raise exception 'listing_not_purchasable';
  end if;

  cents := (item.price * 100)::integer;
  insert into public.orders (id, listing_id, title, stripe_account_id, amount_cents, platform_fee_cents)
  values (p_order_id, item.id, item.title, account_id, cents, (cents + 5) / 10)
  returning * into reserved;
  return reserved;
end;
$$;

create function public.confirm_marketplace_order(
  p_order_id uuid, p_checkout_id text, p_account_id text, p_intent_id text, p_amount integer, p_fee integer
)
returns boolean
language plpgsql
set search_path = ''
as $$
declare
  item_id uuid;
  confirmed_at timestamptz := now();
begin
  select listing_id into item_id from public.orders
  where id = p_order_id and stripe_checkout_id = p_checkout_id and stripe_account_id = p_account_id;
  if not found then return false; end if;

  perform 1 from public.listings where id = item_id for update;
  update public.orders
  set status = 'paid', paid_at = confirmed_at, stripe_payment_intent_id = p_intent_id
  where id = p_order_id and status = 'pending' and stripe_checkout_id = p_checkout_id
    and stripe_account_id = p_account_id and amount_cents = p_amount and platform_fee_cents = p_fee;
  if not found then return false; end if;

  update public.listings set sold_at = confirmed_at where id = item_id and sold_at is null;
  if not found then raise exception 'already_sold'; end if;
  return true;
end;
$$;

revoke all on function public.publish_marketplace_listing(jsonb, text),
  public.marketplace_listing_can_buy(uuid), public.reserve_marketplace_order(uuid, uuid),
  public.confirm_marketplace_order(uuid, text, text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.publish_marketplace_listing(jsonb, text),
  public.marketplace_listing_can_buy(uuid), public.reserve_marketplace_order(uuid, uuid),
  public.confirm_marketplace_order(uuid, text, text, text, integer, integer)
  to service_role;

alter table public.seller_payment_accounts
  add column payments_enabled boolean not null default true;

create or replace function public.marketplace_listing_can_buy(p_listing_id uuid)
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
      and a.payments_enabled and a.charges_enabled and a.payouts_enabled and a.details_submitted
  );
$$;

create or replace function public.reserve_marketplace_order(p_listing_id uuid, p_order_id uuid)
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

  -- Serialize new reservations against changes to this seller's payment settings.
  select a.stripe_account_id into account_id
  from public.listing_owners o
  join public.seller_payment_accounts a on a.owner_hash = o.owner_hash and a.seller_email = lower(item.seller_email)
  where o.listing_id = item.id and a.payments_enabled and a.charges_enabled and a.payouts_enabled and a.details_submitted
  for share of a;
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

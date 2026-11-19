alter table public.listings
  add column image_url text
  constraint listings_image_url_format check (
    image_url = ('/api/listings/' || id::text || '/photo')
    or image_url ~ '^/listings/[a-z0-9][a-z0-9-]{0,100}[.]webp$'
  );

update public.listings
set image_url = '/api/listings/' || id::text || '/photo'
where image_url is null;

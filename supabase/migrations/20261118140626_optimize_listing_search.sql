create extension if not exists pg_trgm with schema extensions;

create index listings_search_text_trgm_idx
  on public.listings using gin (search_text extensions.gin_trgm_ops);

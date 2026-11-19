"use client";

import { useEffect, useRef, useState } from "react";
import { Button, CircleAlert, Grid2X2, Link, List, LoaderCircle, SearchX, Store } from "@/lib/imports";
import { CategoryNavigation } from "./category-navigation";
import { ListingCard } from "./listing-card";
import { listingFilterParams, type Category, type ListingFilters, type ListingPage } from "@/lib/listings";
import { marketplaceRequest } from "@/lib/marketplace-client";
import { cn } from "@/lib/utils";

function readListings(search: string, signal: AbortSignal, cursor?: string) {
  const params = new URLSearchParams(search);
  if (cursor) params.set("cursor", cursor);
  return marketplaceRequest<ListingPage>(`/api/listings?${params}`, { signal });
}

function ListingsResults({ category, filters, search, pendingQuery, listView, onLayoutChange }: {
  category?: Category;
  filters: ListingFilters;
  search: string;
  pendingQuery: boolean;
  listView: boolean;
  onLayoutChange: (list: boolean) => void;
}) {
  const [result, setResult] = useState<ListingPage | null>(null);
  const [error, setError] = useState("");
  const [pageError, setPageError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const loadingPage = useRef<AbortController | null>(null);
  const { q: query, location, minPrice, maxPrice } = filters;
  const filtered = Boolean(query || location || minPrice || maxPrice);

  useEffect(() => {
    if (pendingQuery) return;
    const controller = new AbortController();
    readListings(search, controller.signal).then((data) => {
      if (!controller.signal.aborted) setResult(data);
    }).catch((failure: Error) => {
      if (!controller.signal.aborted) setError(failure.message);
    });
    return () => {
      controller.abort();
      loadingPage.current?.abort();
    };
  }, [attempt, pendingQuery, search]);

  async function loadMore() {
    if (!result?.nextCursor || loadingPage.current) return;
    const controller = new AbortController();
    loadingPage.current = controller;
    setLoadingMore(true);
    setPageError("");
    try {
      const next = await readListings(search, controller.signal, result.nextCursor);
      if (!controller.signal.aborted) {
        setResult({ listings: [...result.listings, ...next.listings], nextCursor: next.nextCursor });
      }
    } catch (failure) {
      if (!controller.signal.aborted) setPageError((failure as Error).message);
    } finally {
      loadingPage.current = null;
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  }

  const listings = result?.listings ?? [];
  const title = category?.label ?? (filtered ? "Search results" : "Latest listings");
  const clearHref = category ? `/category/${category.slug}` : "/";
  const listClasses = cn("grid gap-x-3 gap-y-5 sm:gap-x-4 sm:gap-y-6", !listView && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-[repeat(auto-fill,minmax(182px,1fr))]");

  return (
    <section aria-labelledby="results-heading">
      <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
        <div className="min-w-0">
          <h1 id="results-heading" className="text-[1.35rem] leading-tight font-bold tracking-tight sm:text-[1.75rem]">{title}</h1>
          {result && (
            <p aria-live="polite" className="mt-1 text-sm text-muted-foreground">
              {listings.length} {listings.length === 1 ? "listing" : "listings"}{result.nextCursor ? " shown" : ""}{query && <> for “<span className="wrap-anywhere">{query}</span>”</>}
            </p>
          )}
        </div>
        <div role="group" aria-label="Listing layout" className="flex shrink-0 gap-0.5 rounded-lg border bg-card p-0.5">
          <Button type="button" variant="ghost" size="icon" aria-label="Grid view" aria-pressed={!listView} onClick={() => onLayoutChange(false)} className={cn("size-8", !listView && "bg-accent text-accent-foreground")}>
            <Grid2X2 aria-hidden="true" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="List view" aria-pressed={listView} onClick={() => onLayoutChange(true)} className={cn("size-8", listView && "bg-accent text-accent-foreground")}>
            <List aria-hidden="true" />
          </Button>
        </div>
      </div>
      {error ? (
        <div className="grid justify-items-center gap-3 rounded-xl border bg-card px-5 py-12 text-center">
          <CircleAlert aria-hidden="true" className="size-7 text-destructive" />
          <p role="alert" className="font-medium">{error}</p>
          <Button variant="outline" onClick={() => { setError(""); setAttempt((value) => value + 1); }}>Try again</Button>
        </div>
      ) : !result ? (
        <div role="status">
          <span className="sr-only">Loading listings…</span>
          <div aria-hidden="true" className={listClasses}>
            {[0, 1, 2, 3].map((index) => (
              <div key={index} className={cn("motion-safe:animate-pulse", listView && "flex gap-3 sm:gap-4")}>
                <div className={cn("aspect-square rounded-lg bg-secondary", listView && "w-27 shrink-0 sm:w-36")} />
                <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-0.5 py-2">
                  <div className="h-4 w-16 rounded bg-secondary" />
                  <div className="h-3 w-3/4 max-w-48 rounded bg-secondary" />
                  <div className="h-3 w-1/2 max-w-28 rounded bg-secondary" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : listings.length ? (
        <>
          <ul className={listClasses}>
            {listings.map((listing) => <li key={listing.id}><ListingCard listing={listing} listView={listView} /></li>)}
          </ul>
          {result.nextCursor && (
            <div className="mt-5 flex flex-col items-center gap-3">
              {pageError && <p role="alert" className="text-sm text-destructive">{pageError}</p>}
              <Button type="button" variant="outline" disabled={loadingMore} onClick={() => void loadMore()}>
                {loadingMore && <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />}
                {loadingMore ? "Loading…" : pageError ? "Retry loading listings" : "Load more listings"}
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="grid justify-items-center gap-3 rounded-xl border border-dashed bg-card px-5 py-14 text-center">
          {filtered ? <SearchX aria-hidden="true" className="size-7 text-primary" /> : <Store aria-hidden="true" className="size-7 text-primary" />}
          <p className="text-lg font-semibold">{filtered ? "No listings found" : category ? "No listings in this category yet" : "No listings yet"}</p>
          <Button asChild variant="outline"><Link href={filtered ? clearHref : category ? "/" : "/create"}>{filtered ? "Reset search" : category ? "Browse all" : "Sell an item"}</Link></Button>
        </div>
      )}
    </section>
  );
}

export function Browse({ category, filters, pendingQuery = false }: { category?: Category; filters: ListingFilters; pendingQuery?: boolean }) {
  const [listView, setListView] = useState(false);
  const params = listingFilterParams(filters);
  if (category) params.set("category", category.slug);
  const search = params.toString();

  return (
    <div className="grid min-w-0 lg:grid-cols-[296px_minmax(0,1fr)]">
      <CategoryNavigation category={category?.slug} filters={filters} />
      <main id="main-content" className="w-full min-w-0 max-w-[1520px] px-4 pt-5 pb-12 sm:px-6 lg:px-7 lg:pt-6">
        <ListingsResults key={search} category={category} filters={filters} search={search} pendingQuery={pendingQuery} listView={listView} onLayoutChange={setListView} />
      </main>
    </div>
  );
}

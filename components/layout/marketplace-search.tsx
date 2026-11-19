"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { ArrowRight, Input, Search } from "@/lib/imports/foundation";
import { listingFilterHref, listingFilterParams, type ListingFilters } from "@/lib/listings";

export function MarketplaceSearch({ path = "/", filters = {} }: { path?: string; filters?: ListingFilters }) {
  const router = useRouter();
  const { q = "", ...otherFilters } = filters;

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const term = new FormData(event.currentTarget).get("q")?.toString().trim();
    router.push(listingFilterHref(path, { ...otherFilters, q: term }));
  }

  return (
    <form action={path} onSubmit={search} role="search" className="relative">
      {Array.from(listingFilterParams(otherFilters), ([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-[17px] -translate-y-1/2 text-muted-foreground" />
      <Input
        key={q}
        aria-label="Search marketplace"
        name="q"
        type="search"
        placeholder="Search Marketplace"
        defaultValue={q}
        maxLength={200}
        className="h-10 rounded-lg border-transparent bg-muted pr-10 pl-10 text-base shadow-none sm:text-sm"
      />
      <button type="submit" aria-label="Search listings" className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-card hover:text-primary">
        <ArrowRight aria-hidden="true" className="size-4" />
      </button>
    </form>
  );
}

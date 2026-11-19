import { Suspense } from "react";
import { Browse } from "./browse";
import { listingFilterKeys, type Category, type ListingFilters } from "@/lib/listings";

type BrowseProps = {
  category?: Category;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function SearchResults({ category, searchParams }: BrowseProps) {
  const params = await searchParams;
  const filters: ListingFilters = {};
  for (const key of listingFilterKeys) {
    const raw = params[key];
    const value = (Array.isArray(raw) ? raw[0] : raw)?.trim();
    if (value) filters[key] = key === "q" ? value.slice(0, 200) : value;
  }
  return <Browse category={category} filters={filters} />;
}

export function QueryBrowse({ category, searchParams }: BrowseProps) {
  return (
    <Suspense fallback={<Browse category={category} filters={{}} pendingQuery />}>
      <SearchResults category={category} searchParams={searchParams} />
    </Suspense>
  );
}

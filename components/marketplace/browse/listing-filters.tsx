"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  SlidersHorizontal,
} from "@/lib/imports";
import { listingFilterHref, listingFilterParams, parsePriceRange, type ListingFilters } from "@/lib/listings";
import { cn } from "@/lib/utils";

export function ListingFiltersDialog({ path, filters }: { path: string; filters: ListingFilters }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const { q, ...applied } = filters;
  const filterCount = listingFilterParams(applied).size;

  function apply(next: ListingFilters) {
    router.push(listingFilterHref(path, { ...next, q }));
    setOpen(false);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const min = form.get("minPrice")?.toString().trim() ?? "";
    const max = form.get("maxPrice")?.toString().trim() ?? "";
    const priceRange = parsePriceRange(min, max);
    if ("error" in priceRange) {
      setError(priceRange.error);
      return;
    }
    apply({
      location: form.get("location")?.toString().trim(),
      minPrice: priceRange.minPrice?.toString(),
      maxPrice: priceRange.maxPrice?.toString(),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (next) setError(""); }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className={cn("h-10 bg-card lg:justify-start", filterCount > 0 && "border-primary/25 bg-accent text-accent-foreground")}>
          <SlidersHorizontal aria-hidden="true" />
          Filters{filterCount > 0 && ` (${filterCount})`}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle>Listing filters</DialogTitle>
          <DialogDescription>Filter by city, area, or price range.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="filter-location" className="text-sm font-semibold">Location</label>
            <Input id="filter-location" name="location" maxLength={255} placeholder="City or area" defaultValue={applied.location} />
          </div>
          <fieldset aria-describedby={error ? "price-filter-error" : undefined} className="grid grid-cols-2 gap-3">
            <legend className="mb-1.5 text-sm font-semibold">Price (USD)</legend>
            <div className="space-y-1.5">
              <label htmlFor="filter-min-price" className="text-sm">Minimum price</label>
              <Input id="filter-min-price" inputMode="decimal" name="minPrice" maxLength={14} placeholder="Any" defaultValue={applied.minPrice} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="filter-max-price" className="text-sm">Maximum price</label>
              <Input id="filter-max-price" inputMode="decimal" name="maxPrice" maxLength={14} placeholder="Any" defaultValue={applied.maxPrice} />
            </div>
          </fieldset>
          {error && <p id="price-filter-error" role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => apply({})}>Clear filters</Button>
            <Button type="submit">Apply filters</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

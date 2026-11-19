import {
  Armchair,
  Bike,
  BookOpen,
  Button,
  Grid2X2,
  Lamp,
  Laptop,
  Link,
  MarketplaceBrand,
  MarketplaceSearch,
  Plus,
  Separator,
  Shirt,
} from "@/lib/imports";
import { ListingFiltersDialog } from "./listing-filters";
import { categories, listingFilterHref, type CategorySlug, type ListingFilters } from "@/lib/listings";
import { cn } from "@/lib/utils";

const icons = {
  furniture: Armchair,
  electronics: Laptop,
  "home-garden": Lamp,
  clothing: Shirt,
  "sports-outdoors": Bike,
  "books-hobbies": BookOpen,
};

export function CategoryNavigation({ category, filters }: { category?: CategorySlug; filters: ListingFilters }) {
  const links = [
    { slug: undefined, label: "Browse all", icon: Grid2X2 },
    ...categories.map((item) => ({ ...item, icon: icons[item.slug] })),
  ];
  const path = category ? `/category/${category}` : "/";

  return (
    <aside className="min-w-0 border-b bg-card lg:sticky lg:top-0 lg:h-dvh lg:self-start lg:overflow-y-auto lg:border-r lg:border-b-0 lg:p-5">
      <div className="mb-6 hidden lg:block"><MarketplaceBrand /></div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 px-4 pt-3 sm:px-6 lg:grid-cols-1 lg:px-0 lg:pt-0">
        <MarketplaceSearch path={path} filters={filters} />
        <ListingFiltersDialog path={path} filters={filters} />
      </div>
      <Button asChild className="mt-4 hidden h-10 w-full justify-start gap-2.5 px-3 font-semibold lg:inline-flex">
        <Link href="/create"><Plus aria-hidden="true" /> Create listing</Link>
      </Button>
      <nav aria-label="Listing categories" className="lg:mt-5">
        <ul className="flex gap-2 overflow-x-auto px-4 py-3 [scrollbar-width:none] sm:px-6 lg:block lg:space-y-1 lg:overflow-visible lg:p-0">
          {links.map(({ slug, label, icon: Icon }) => {
            const active = slug === category;

            return (
              <li key={label} className="shrink-0">
                {slug === "furniture" && (
                  <div className="hidden lg:block">
                    <Separator className="my-4" />
                    <p className="mb-2 px-2.5 text-sm font-semibold text-muted-foreground">Categories</p>
                  </div>
                )}
                <Link
                  href={listingFilterHref(slug ? `/category/${slug}` : "/", filters)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center gap-2 whitespace-nowrap rounded-full border bg-card px-3 text-sm font-medium transition-colors hover:bg-accent lg:h-11 lg:gap-2.5 lg:rounded-lg lg:border-transparent lg:bg-transparent lg:px-2.5",
                    active && "border-transparent bg-accent font-semibold text-accent-foreground lg:bg-accent",
                  )}
                >
                  <span className={cn("grid shrink-0 place-items-center lg:size-8 lg:rounded-md lg:bg-muted", active && "lg:bg-card")}>
                    <Icon aria-hidden="true" className="size-4" />
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

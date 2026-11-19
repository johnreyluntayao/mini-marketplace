"use client";

import { usePathname } from "next/navigation";
import { Button, Link, MarketplaceBrand, MarketplaceSearch, Plus } from "@/lib/imports";
import { findCategory } from "@/lib/listings";
import { cn } from "@/lib/utils";

export function HeaderFrame({ catalog = false }: { catalog?: boolean }) {
  return (
    <header className={cn("sticky top-0 z-30 border-b bg-card", catalog && "lg:hidden")}>
      <div className="mx-auto flex min-h-14 max-w-[1560px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6 md:flex-nowrap">
        <MarketplaceBrand />
        {!catalog && (
          <div className="order-last w-full md:order-none md:max-w-sm">
            <MarketplaceSearch />
          </div>
        )}
        <Button asChild className="font-semibold">
          <Link href="/create"><Plus aria-hidden="true" /> Sell an item</Link>
        </Button>
      </div>
    </header>
  );
}

export function Header() {
  const pathname = usePathname();
  const categoryPrefix = "/category/";
  const catalog = pathname === "/" || (pathname.startsWith(categoryPrefix) && Boolean(findCategory(pathname.slice(categoryPrefix.length))));
  return <HeaderFrame catalog={catalog} />;
}

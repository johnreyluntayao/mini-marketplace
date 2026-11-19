import { Link, Store } from "@/lib/imports/foundation";

export function MarketplaceBrand() {
  return (
    <Link href="/" className="flex w-fit min-w-0 items-center gap-2.5 rounded-md text-[15px] font-bold tracking-tight sm:text-base lg:text-lg">
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-primary text-primary-foreground">
        <Store aria-hidden="true" className="size-[19px]" />
      </span>
      <span className="leading-tight">Mini Marketplace</span>
    </Link>
  );
}

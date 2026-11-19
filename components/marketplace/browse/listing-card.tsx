import { Badge, Image, Link, MapPin } from "@/lib/imports";
import { formatPrice, type ListingSummary } from "@/lib/listings";
import { cn } from "@/lib/utils";

export function ListingCard({ listing, listView }: { listing: ListingSummary; listView: boolean }) {
  return (
    <Link href={`/item/${listing.id}`} className={cn("group block h-full rounded-lg", listView && "flex gap-3 sm:gap-4")}>
      <div className={cn("relative aspect-square overflow-hidden rounded-lg bg-secondary", listView && "w-27 shrink-0 sm:w-36")}>
        <Image
          src={listing.imageUrl}
          alt=""
          fill
          unoptimized
          className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.035]"
        />
        {listing.soldAt && <Badge variant="secondary" className="absolute top-2 left-2 bg-card text-card-foreground">Sold</Badge>}
      </div>
      <div className={cn("min-w-0 px-0.5 pt-2", listView && "flex flex-col justify-center py-2")}>
        <p className="mb-0.5 text-[1.05rem] leading-tight font-bold tracking-tight">{formatPrice(listing.price)}</p>
        <h2 className="line-clamp-2 text-sm leading-snug font-medium group-hover:text-primary-strong">{listing.title}</h2>
        {listing.location && (
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin aria-hidden="true" className="size-3 shrink-0" />
            <span className="truncate">{listing.location}</span>
          </p>
        )}
      </div>
    </Link>
  );
}

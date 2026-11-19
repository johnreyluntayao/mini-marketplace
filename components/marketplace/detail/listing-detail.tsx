import {
  ArrowLeft,
  Avatar,
  AvatarFallback,
  Badge,
  CalendarDays,
  Card,
  CheckCircle2,
  Image,
  Link,
  MapPin,
  Separator,
  UserRound,
} from "@/lib/imports";
import { MessageSeller } from "./message-seller";
import { findCategory, formatPrice, type Listing } from "@/lib/listings";

const listedDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

export function ListingDetail({ listing, published }: { listing: Listing; published: boolean }) {
  const category = findCategory(listing.category);

  return (
    <main id="main-content" className="mx-auto max-w-[1240px] px-4 pt-6 pb-16 sm:px-6 sm:pt-9">
      <Link href={category ? `/category/${category.slug}` : "/"} className="mb-5 inline-flex items-center gap-2 rounded-md text-sm font-semibold text-primary-strong hover:underline">
        <ArrowLeft aria-hidden="true" className="size-4" /> {category ? `Back to ${category.label}` : "Back to marketplace"}
      </Link>
      {published && (
        <p role="status" className="mb-5 flex items-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground">
          <CheckCircle2 aria-hidden="true" className="size-5 shrink-0" /> Your listing is published.
        </p>
      )}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.38fr)_minmax(0,1fr)] lg:gap-8">
        <div className="relative aspect-square max-h-[660px] overflow-hidden rounded-2xl border bg-muted sm:aspect-[1.18]">
          <Image
            src={listing.imageUrl}
            alt={listing.title}
            fill
            preload
            unoptimized
            className="object-contain"
          />
        </div>
        <Card className="min-w-0 gap-5 rounded-2xl p-5 shadow-none sm:gap-6 sm:p-7">
          <div className="space-y-2.5">
            <Badge variant="secondary" className="h-auto max-w-full bg-accent whitespace-normal wrap-anywhere text-accent-foreground">{category?.label ?? listing.category}</Badge>
            <h1 className="font-display text-4xl leading-tight font-medium tracking-[-0.04em] wrap-anywhere sm:text-[2.75rem]">{listing.title}</h1>
            <p className="text-3xl leading-none font-bold tracking-tight">{formatPrice(listing.price)}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1 text-sm text-muted-foreground">
              {listing.location && <p className="flex min-w-0 items-start gap-1.5 wrap-anywhere"><MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />{listing.location}</p>}
              <p className="flex items-center gap-1.5"><CalendarDays aria-hidden="true" className="size-4 shrink-0" /><time dateTime={listing.createdAt}>Listed {listedDate.format(new Date(listing.createdAt))}</time></p>
            </div>
          </div>
          <Separator />
          <section aria-labelledby="description-title" className="space-y-2">
            <h2 id="description-title" className="text-base font-semibold">Description</h2>
            <p className="text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap text-muted-foreground">{listing.description}</p>
          </section>
          <Separator />
          <section aria-label="Seller contact" className="flex min-w-0 items-center gap-3">
            <Avatar className="size-10">
              <AvatarFallback className="bg-accent text-primary"><UserRound aria-hidden="true" className="size-5" /></AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-semibold">Seller email</p>
              <p className="text-sm wrap-anywhere text-muted-foreground">{listing.sellerEmail}</p>
            </div>
          </section>
          <MessageSeller listingId={listing.id} title={listing.title} />
        </Card>
      </div>
    </main>
  );
}

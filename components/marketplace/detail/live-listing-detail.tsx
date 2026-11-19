"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Button, Link } from "@/lib/imports";
import { ListingDetail } from "./listing-detail";
import { ListingDetailLoading } from "./listing-detail-loading";
import type { Listing } from "@/lib/listings";
import { MarketplaceRequestError, marketplaceRequest } from "@/lib/marketplace-client";

type ListingStatus =
  | { state: "loading" }
  | { state: "ready"; listing: Listing; canBuy: boolean }
  | { state: "missing" }
  | { state: "error"; message: string };

export function LiveListingDetail({ id, published }: { id: string; published: boolean }) {
  const [status, setStatus] = useState<ListingStatus>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    marketplaceRequest<{ listing: Listing; canBuy: boolean }>(`/api/listings/${id}`, { signal: controller.signal }).then(({ listing, canBuy }) => {
      if (!controller.signal.aborted) setStatus({ state: "ready", listing, canBuy });
    }).catch((failure: Error) => {
      if (controller.signal.aborted) return;
      setStatus(failure instanceof MarketplaceRequestError && failure.status === 404
        ? { state: "missing" }
        : { state: "error", message: failure.message });
    });
    return () => controller.abort();
  }, [attempt, id]);

  if (status.state === "ready") return <ListingDetail listing={status.listing} published={published} canBuy={status.canBuy} />;
  if (status.state === "loading") return <ListingDetailLoading />;

  return (
    <main id="main-content" className="mx-auto grid max-w-xl justify-items-center gap-4 px-6 py-24 text-center">
      <h1 className="font-display text-4xl font-medium tracking-tight">{status.state === "missing" ? "Listing unavailable" : "Couldn’t load the listing"}</h1>
      {status.state === "error" && (
        <>
          <p role="alert" className="text-muted-foreground">{status.message}</p>
          <Button onClick={() => { setStatus({ state: "loading" }); setAttempt((value) => value + 1); }}>Try again</Button>
        </>
      )}
      <Button asChild variant="outline"><Link href="/"><ArrowLeft aria-hidden="true" /> Browse marketplace</Link></Button>
    </main>
  );
}

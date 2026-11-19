"use client";

import { useRef, useState } from "react";
import { Button, CreditCard, LoaderCircle } from "@/lib/imports";
import { isUuid } from "@/lib/listings";
import { MarketplaceRequestError, postMarketplace } from "@/lib/marketplace-client";

export function BuyNowButton({ listingId }: { listingId: string }) {
  const attempt = useRef<string | null>(null);
  const busy = useRef(false);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");

  async function buy() {
    if (busy.current) return;
    busy.current = true;
    setOpening(true);
    setError("");
    const key = `marketplace-checkout-${listingId}`;
    try {
      try {
        const saved = sessionStorage.getItem(key);
        if (!attempt.current && saved && isUuid(saved)) attempt.current = saved;
      } catch { /* Checkout can still work when browser storage is disabled. */ }
      attempt.current ??= crypto.randomUUID();
      try { sessionStorage.setItem(key, attempt.current); } catch { /* Keep the attempt in memory. */ }
      const { url } = await postMarketplace<{ url: string }>("/api/stripe/checkout", { listingId, orderId: attempt.current });
      window.location.assign(url);
    } catch (failure) {
      if (failure instanceof MarketplaceRequestError && failure.status === 409) {
        attempt.current = null;
        try { sessionStorage.removeItem(key); } catch { /* The in-memory attempt is already cleared. */ }
      }
      setError((failure as Error).message);
      setOpening(false);
      busy.current = false;
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={() => void buy()} disabled={opening} className="h-11 w-full">
        {opening ? <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" /> : <CreditCard aria-hidden="true" />}
        {opening ? "Opening Checkout…" : "Buy Now"}
      </Button>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

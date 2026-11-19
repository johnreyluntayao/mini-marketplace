"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button, CreditCard, LoaderCircle } from "@/lib/imports";
import { isUuid } from "@/lib/listings";
import { MarketplaceRequestError, marketplaceRequest, postMarketplace } from "@/lib/marketplace-client";

function savedOrder(key: string) {
  try {
    const saved = sessionStorage.getItem(key);
    return saved && isUuid(saved) ? saved : null;
  } catch { return null; }
}

function clearSavedOrder(key: string) {
  try { sessionStorage.removeItem(key); } catch { /* Storage can be unavailable. */ }
}

function releaseCheckout(listingId: string, orderId: string) {
  return marketplaceRequest<{ cancelled: boolean }>("/api/stripe/checkout", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listingId, orderId }),
  });
}

function removeCancelMarker() {
  const url = new URL(window.location.href);
  if (!url.hash.startsWith("#checkout-cancelled-")) return;
  url.hash = "";
  window.history.replaceState(window.history.state, "", url);
}

export function BuyNowButton({ listingId, canBuy }: { listingId: string; canBuy: boolean }) {
  const key = `marketplace-checkout-${listingId}`;
  const [orderId, setOrderId] = useState(() => savedOrder(key));
  const [returningFromCancel, setReturningFromCancel] = useState(() =>
    orderId !== null && window.location.hash === `#checkout-cancelled-${orderId}`);
  const busy = useRef(false);
  const [action, setAction] = useState<"opening" | "cancelling" | null>(null);
  const [error, setError] = useState("");
  const [cancelled, setCancelled] = useState(false);

  const finishCancellation = useCallback(() => {
    clearSavedOrder(key);
    removeCancelMarker();
    setOrderId(null);
    setCancelled(true);
    setReturningFromCancel(false);
  }, [key]);

  useEffect(() => {
    function restore(event: PageTransitionEvent) {
      if (!event.persisted) return;
      busy.current = false;
      setAction(null);
    }
    window.addEventListener("pageshow", restore);
    return () => window.removeEventListener("pageshow", restore);
  }, []);

  useEffect(() => {
    if (!returningFromCancel || !orderId) return;
    let active = true;
    releaseCheckout(listingId, orderId).then(() => {
      if (active) finishCancellation();
    }).catch((failure: Error) => {
      if (!active) return;
      setError(failure.message);
      setReturningFromCancel(false);
    });
    return () => { active = false; };
  }, [finishCancellation, listingId, orderId, returningFromCancel]);

  async function buy() {
    if ((!canBuy && !orderId) || busy.current || returningFromCancel) return;
    busy.current = true;
    setAction("opening");
    setError("");
    setCancelled(false);
    try {
      const attempt = orderId ?? crypto.randomUUID();
      setOrderId(attempt);
      try { sessionStorage.setItem(key, attempt); } catch { /* Keep the attempt in memory. */ }
      const { url } = await postMarketplace<{ url: string }>("/api/stripe/checkout", { listingId, orderId: attempt });
      window.location.assign(url);
    } catch (failure) {
      if (failure instanceof MarketplaceRequestError && failure.status === 409) {
        setOrderId(null);
        clearSavedOrder(key);
      }
      setError((failure as Error).message);
      setAction(null);
      busy.current = false;
    }
  }

  async function cancel() {
    if (!orderId || busy.current || returningFromCancel) return;
    busy.current = true;
    setAction("cancelling");
    setError("");
    try {
      await releaseCheckout(listingId, orderId);
      finishCancellation();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      busy.current = false;
      setAction(null);
    }
  }

  if (!canBuy && !orderId && !cancelled && !error) return null;

  return (
    <div className="space-y-2">
      {(canBuy || orderId) && <Button type="button" onClick={() => void buy()} disabled={Boolean(action) || returningFromCancel} className="h-11 w-full">
        {action === "opening" ? <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" /> : <CreditCard aria-hidden="true" />}
        {action === "opening" ? "Opening Checkout…" : orderId ? "Resume Checkout" : "Buy Now"}
      </Button>}
      {orderId && <Button type="button" variant="outline" onClick={() => void cancel()} disabled={Boolean(action) || returningFromCancel} className="w-full">
        {action === "cancelling" || returningFromCancel ? "Cancelling Checkout…" : "Cancel Checkout"}
      </Button>}
      {cancelled && <p role="status" className="text-sm text-muted-foreground">
        {canBuy ? "Checkout cancelled. The item is available again." : "Checkout cancelled."}
      </p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

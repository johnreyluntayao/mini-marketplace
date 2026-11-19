"use client";

import { useEffect, useState } from "react";
import { Button, Card, CheckCircle2, CircleAlert, Link, LoaderCircle } from "@/lib/imports";
import { formatPrice } from "@/lib/listings";
import { marketplaceRequest } from "@/lib/marketplace-client";
import type { OrderReceipt } from "@/lib/payments/types";

export function OrderConfirmation({ orderId, sessionId }: { orderId: string; sessionId: string }) {
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const url = `/api/stripe/orders/${orderId}?${new URLSearchParams({ session_id: sessionId })}`;
    let timer: ReturnType<typeof setTimeout>;
    let checks = 0;

    async function check() {
      try {
        const result = await marketplaceRequest<OrderReceipt>(url, { signal: controller.signal, cache: "no-store" });
        if (controller.signal.aborted) return;
        setReceipt(result);
        if (result.status === "pending") {
          if (++checks >= 25) setError("Stripe is taking longer than expected to confirm this payment.");
          else timer = setTimeout(() => void check(), 2_000);
        }
      } catch (failure) {
        if (!controller.signal.aborted) setError((failure as Error).message);
      }
    }

    void check();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [orderId, sessionId, attempt]);

  const paid = receipt?.status === "paid";
  const expired = receipt?.status === "expired";
  const heading = paid ? "Payment confirmed" : expired ? "Checkout expired" : error ? "Order confirmation" : "Confirming your payment";

  return (
    <Card className="gap-5 p-6 text-center sm:p-9">
      <div role="status" className="space-y-3">
        {paid ? <CheckCircle2 aria-hidden="true" className="mx-auto size-9 text-primary-strong" /> :
          error || expired ? <CircleAlert aria-hidden="true" className="mx-auto size-9 text-muted-foreground" /> :
          <LoaderCircle aria-hidden="true" className="mx-auto size-9 text-primary-strong motion-safe:animate-spin" />}
        <h1 className="text-2xl font-bold tracking-tight">{heading}</h1>
        {receipt && <p className="wrap-anywhere text-muted-foreground">{receipt.title} · {formatPrice(receipt.amountCents / 100)}</p>}
        {paid && <p className="text-sm text-muted-foreground">Stripe confirmed your test payment and the listing is marked as sold.</p>}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        {error && <Button onClick={() => { setError(""); setAttempt((count) => count + 1); }}>Check again</Button>}
        {receipt && <Button asChild variant="outline"><Link href={`/item/${receipt.listingId}`}>View listing</Link></Button>}
        <Button asChild variant={paid ? "default" : "ghost"}><Link href="/">Browse marketplace</Link></Button>
      </div>
    </Card>
  );
}

"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Button, Card, CheckCircle2, CreditCard, Input, LoaderCircle } from "@/lib/imports";
import { isEmail } from "@/lib/listings";
import { marketplaceRequest, postMarketplace } from "@/lib/marketplace-client";

type SellerStatus = "not_connected" | "incomplete" | "pending" | "ready";

export function SellerPayments({ initialEmail, retry }: { initialEmail: string; retry: boolean }) {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<SellerStatus>("not_connected");
  const [checking, setChecking] = useState(Boolean(isEmail(initialEmail)));
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(retry ? "Request a fresh Stripe onboarding link." : "");

  useEffect(() => {
    if (!isEmail(initialEmail)) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ email: initialEmail });
    marketplaceRequest<{ status: SellerStatus }>(`/api/stripe/onboarding?${params}`, { signal: controller.signal })
      .then(({ status }) => { if (!controller.signal.aborted) setStatus(status); })
      .catch((failure: Error) => { if (!controller.signal.aborted) setError(failure.message); })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => controller.abort();
  }, [initialEmail]);

  async function connect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (connecting || checking) return;
    const address = email.trim();
    if (!isEmail(address)) {
      setError("Enter the email you use on your listings.");
      return;
    }
    setError("");
    setConnecting(true);
    try {
      const { url } = await postMarketplace<{ url: string }>("/api/stripe/onboarding", { email: address });
      window.location.assign(url);
    } catch (failure) {
      setError((failure as Error).message);
      setConnecting(false);
    }
  }

  return (
    <Card className="gap-5 p-6 sm:p-8">
      {status === "ready" ? (
        <p role="status" className="flex items-start gap-3 rounded-lg bg-accent p-4 text-accent-foreground">
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          Stripe is connected. Eligible listings posted in this browser with {email} can accept test payments.
        </p>
      ) : (
        <form onSubmit={connect} className="space-y-4">
          {status === "pending" && <p role="status" className="text-sm text-muted-foreground">Stripe is still reviewing your account. Refresh this page to check again.</p>}
          <div className="space-y-2">
            <label htmlFor="connect-seller-email" className="text-sm font-semibold">Seller email</label>
            <Input id="connect-seller-email" type="email" name="email" autoComplete="email" required maxLength={255}
              value={email} disabled={connecting || checking}
              onChange={(event) => { setEmail(event.target.value); setStatus("not_connected"); setError(""); }} className="h-11" />
          </div>
          <Button disabled={connecting || checking} type="submit" className="h-11 w-full">
            {connecting || checking ? <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" /> : <CreditCard aria-hidden="true" />}
            {checking ? "Checking Stripe…" : connecting ? "Opening Stripe…" : status === "not_connected" ? "Connect with Stripe" : "Continue Stripe onboarding"}
          </Button>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </Card>
  );
}

"use client";

import { type FormEvent, useEffect, useState } from "react";
import { Button, Card, CheckCircle2, CreditCard, Input, LoaderCircle } from "@/lib/imports";
import { isEmail } from "@/lib/listings";
import { marketplaceRequest, postMarketplace } from "@/lib/marketplace-client";
import type { SellerPaymentStatus } from "@/lib/payments/types";

const onboardingPath = "/api/stripe/onboarding";

export function SellerPayments({ initialEmail, retry }: { initialEmail: string; retry: boolean }) {
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<SellerPaymentStatus>("not_connected");
  const [checking, setChecking] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState(retry ? "Request a fresh Stripe onboarding link." : "");

  useEffect(() => {
    const controller = new AbortController();
    const path = initialEmail ? `${onboardingPath}?${new URLSearchParams({ email: initialEmail })}` : onboardingPath;
    marketplaceRequest<{ status: SellerPaymentStatus; email?: string }>(path, { signal: controller.signal })
      .then(({ status, email: savedEmail }) => {
        if (controller.signal.aborted) return;
        setStatus(status);
        if (savedEmail) setEmail(savedEmail);
        if (status === "ready" || status === "disconnected") setError("");
      })
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
      const { url } = await postMarketplace<{ url: string }>(onboardingPath, { email: address });
      window.location.assign(url);
    } catch (failure) {
      setError((failure as Error).message);
      setConnecting(false);
    }
  }

  async function changePaymentConnection(enabled: boolean) {
    if (updating) return;
    setError("");
    setUpdating(true);
    try {
      const { status } = await marketplaceRequest<{ status: SellerPaymentStatus }>(onboardingPath, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, enabled }),
      });
      setStatus(status);
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Card className="gap-5 p-6 sm:p-8">
      {checking ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle aria-hidden="true" className="size-4 motion-safe:animate-spin" /> Checking Stripe…
        </p>
      ) : status === "ready" || status === "disconnected" ? (
        <>
          {status === "ready" ? (
            <p role="status" className="flex items-start gap-3 rounded-lg bg-accent p-4 text-accent-foreground">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              Stripe is connected. Eligible listings posted in this browser with {email} can accept test payments.
            </p>
          ) : (
            <p role="status" className="rounded-lg bg-muted p-4 text-muted-foreground">
              Stripe is disconnected for {email}. Buyers can still message you. Checkouts already open can finish.
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button type="button" disabled={updating} variant={status === "ready" ? "outline" : "default"}
              onClick={() => void changePaymentConnection(status === "disconnected")}>
              {updating ? "Updating…" : status === "ready" ? "Disconnect Stripe" : "Reconnect Stripe"}
            </Button>
            <Button type="button" disabled={updating} variant="outline"
              onClick={() => { setEmail(""); setStatus("not_connected"); setError(""); }}>
              Use another email
            </Button>
          </div>
        </>
      ) : (
        <form onSubmit={connect} className="space-y-4">
          {status === "pending" && <p role="status" className="text-sm text-muted-foreground">Stripe is still reviewing your account. Refresh this page to check again.</p>}
          <div className="space-y-2">
            <label htmlFor="connect-seller-email" className="text-sm font-semibold">Seller email</label>
            <Input id="connect-seller-email" type="email" name="email" autoComplete="email" required maxLength={255}
              value={email} disabled={connecting}
              onChange={(event) => { setEmail(event.target.value); setStatus("not_connected"); setError(""); }} className="h-11" />
          </div>
          <Button disabled={connecting} type="submit" className="h-11 w-full">
            {connecting ? <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" /> : <CreditCard aria-hidden="true" />}
            {connecting ? "Opening Stripe…" : status === "not_connected" ? "Connect with Stripe" : "Continue Stripe onboarding"}
          </Button>
        </form>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </Card>
  );
}

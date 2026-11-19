import "server-only";
import { createHash } from "node:crypto";
import type Stripe from "stripe";
import { ApiError } from "@/lib/marketplace-server";
import { isEmail } from "@/lib/listings";
import { marketplaceOrigin, stripeClient } from "@/lib/payments/config";
import { createSupabaseServerClient } from "@/lib/supabase";

export function sellerEmail(value: unknown) {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!isEmail(email)) throw new ApiError(400, "Enter the email you use on your listings.");
  return email;
}

export async function findSellerAccount(ownerHash: string, email: string) {
  const { data, error } = await createSupabaseServerClient().from("seller_payment_accounts")
    .select("stripe_account_id").eq("owner_hash", ownerHash).eq("seller_email", email).maybeSingle();
  if (error) throw error;
  return data?.stripe_account_id;
}

export async function connectSeller(ownerHash: string, email: string) {
  const existing = await findSellerAccount(ownerHash, email);
  if (existing) return existing;

  const stripe = stripeClient();
  const country = process.env.STRIPE_CONNECT_COUNTRY?.trim() || undefined;
  const ownerKey = createHash("sha256").update(ownerHash).update(":").update(email).digest("hex");
  const account = await stripe.accounts.create({
    country,
    email,
    controller: {
      fees: { payer: "account" },
      losses: { payments: "stripe" },
      requirement_collection: "stripe",
      stripe_dashboard: { type: "full" },
    },
  }, { idempotencyKey: `marketplace-seller-${ownerKey}` });

  const { error } = await createSupabaseServerClient().from("seller_payment_accounts").upsert({
    owner_hash: ownerHash,
    seller_email: email,
    stripe_account_id: account.id,
  }, { onConflict: "owner_hash,seller_email", ignoreDuplicates: true });
  if (error) throw error;
  const saved = await findSellerAccount(ownerHash, email);
  if (!saved) throw new Error("Stripe account was not saved");
  return saved;
}

export async function refreshSellerAccount(accountId: string, stripe: Stripe = stripeClient()) {
  const checkedAt = new Date().toISOString();
  const account = await stripe.accounts.retrieve(accountId);
  const status = {
    charges_enabled: account.charges_enabled === true,
    payouts_enabled: account.payouts_enabled === true,
    details_submitted: account.details_submitted === true,
  };
  const { error } = await createSupabaseServerClient().from("seller_payment_accounts")
    .update({ ...status, stripe_checked_at: checkedAt })
    .eq("stripe_account_id", accountId).lte("stripe_checked_at", checkedAt);
  if (error) throw error;
  if (status.charges_enabled && status.payouts_enabled && status.details_submitted) return "ready";
  return status.details_submitted ? "pending" : "incomplete";
}

export async function sellerOnboardingUrl(request: Request, email: string, stripeAccount: string) {
  const origin = marketplaceOrigin(request);
  const params = new URLSearchParams({ email });
  const link = await stripeClient().accountLinks.create({
    account: stripeAccount,
    type: "account_onboarding",
    refresh_url: `${origin}/api/stripe/onboarding/refresh?${params}`,
    return_url: `${origin}/sell/payments?${params}`,
  });
  return link.url;
}

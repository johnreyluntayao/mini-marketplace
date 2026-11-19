import "server-only";
import Stripe from "stripe";
import { ApiError } from "@/lib/marketplace-server";

export function checkoutConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") && process.env.STRIPE_WEBHOOK_SECRET?.startsWith("whsec_"));
}

export function stripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key?.startsWith("sk_test_")) throw new ApiError(503, "Stripe sandbox payments are unavailable.");
  return new Stripe(key, { maxNetworkRetries: 2, timeout: 15_000 });
}

export function marketplaceOrigin(request: Request) {
  const configured = process.env.MARKETPLACE_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined);
  try {
    const url = new URL(configured ?? request.url);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if ((local && url.protocol === "http:") || (configured && url.protocol === "https:" && !url.username && !url.password)) {
      return url.origin;
    }
  } catch {
    // Treat an invalid origin as a deployment configuration error.
  }
  throw new ApiError(503, "Set the marketplace URL to enable Stripe redirects.");
}

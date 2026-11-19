import { ApiError, apiFailure, apiJson, readJson, requireId } from "@/lib/marketplace-server";
import { openCheckout } from "@/lib/payments/checkout";
import { checkoutConfigured, marketplaceOrigin, stripeClient } from "@/lib/payments/config";

export async function POST(request: Request) {
  try {
    if (!checkoutConfigured()) throw new ApiError(503, "Stripe sandbox checkout is unavailable.");
    const body = await readJson(request);
    const listingId = requireId(body.listingId, "Choose a valid listing.");
    const orderId = requireId(body.orderId, "A valid checkout ID is required.");
    const url = await openCheckout(stripeClient(), marketplaceOrigin(request), listingId, orderId);
    return apiJson({ url });
  } catch (error) {
    return apiFailure(error, "Couldn’t open Checkout. Try again.");
  }
}

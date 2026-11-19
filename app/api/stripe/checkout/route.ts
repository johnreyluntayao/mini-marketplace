import { ApiError, apiFailure, apiJson, readJson, requireId } from "@/lib/marketplace-server";
import { cancelCheckout, openCheckout } from "@/lib/payments/checkout";
import { checkoutConfigured, marketplaceOrigin, stripeClient } from "@/lib/payments/config";

async function checkoutIds(request: Request) {
  const body = await readJson(request);
  return {
    listingId: requireId(body.listingId, "Choose a valid listing."),
    orderId: requireId(body.orderId, "A valid checkout ID is required."),
  };
}

export async function POST(request: Request) {
  try {
    if (!checkoutConfigured()) throw new ApiError(503, "Stripe sandbox checkout is unavailable.");
    const { listingId, orderId } = await checkoutIds(request);
    const url = await openCheckout(stripeClient(), marketplaceOrigin(request), listingId, orderId);
    return apiJson({ url });
  } catch (error) {
    return apiFailure(error, "Couldn’t open Checkout. Try again.");
  }
}

export async function DELETE(request: Request) {
  try {
    const { listingId, orderId } = await checkoutIds(request);
    await cancelCheckout(stripeClient(), listingId, orderId);
    return apiJson({ cancelled: true });
  } catch (error) {
    return apiFailure(error, "Couldn’t cancel Checkout. Try again.");
  }
}

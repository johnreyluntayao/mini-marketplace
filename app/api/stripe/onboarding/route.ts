import { ApiError, apiFailure, apiJson, readJson } from "@/lib/marketplace-server";
import { marketplaceOrigin, stripeClient } from "@/lib/payments/config";
import { connectSeller, findSellerAccount, refreshSellerAccount, sellerEmail, sellerOnboardingUrl, setSellerPaymentsEnabled } from "@/lib/payments/seller-account";
import { rememberSeller, sellerBrowser } from "@/lib/seller-browser";

export async function GET(request: Request) {
  try {
    const requestedEmail = new URL(request.url).searchParams.get("email");
    const email = requestedEmail === null ? undefined : sellerEmail(requestedEmail);
    const seller = sellerBrowser(request);
    if (!seller.hasCookie) return apiJson({ status: "not_connected" });
    const account = await findSellerAccount(seller.hash, email);
    if (!account) return apiJson({ status: "not_connected" });
    const status = account.payments_enabled ? await refreshSellerAccount(account.stripe_account_id) : "disconnected";
    return apiJson(email ? { status } : { status, email: account.seller_email });
  } catch (error) {
    return apiFailure(error, "Couldn’t check your Stripe account. Try again.");
  }
}

export async function POST(request: Request) {
  try {
    const origin = marketplaceOrigin(request);
    stripeClient();
    const email = sellerEmail((await readJson(request)).email);
    const seller = sellerBrowser(request);
    const account = await connectSeller(seller.hash, email);
    const canOpenStripe = account.payments_enabled && !(account.details_submitted && account.charges_enabled && account.payouts_enabled);
    const url = canOpenStripe ? await sellerOnboardingUrl(request, email, account.stripe_account_id)
      : `${origin}/sell/payments?${new URLSearchParams({ email })}`;
    return rememberSeller(request, apiJson({ url }), seller);
  } catch (error) {
    return apiFailure(error, "Couldn’t connect with Stripe. Try again.");
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await readJson(request);
    const email = sellerEmail(body.email);
    if (typeof body.enabled !== "boolean") throw new ApiError(400, "Choose whether to enable seller payments.");
    const seller = sellerBrowser(request);
    if (!seller.hasCookie) throw new ApiError(404, "No Stripe account was found for this seller in this browser.");
    return apiJson({ status: await setSellerPaymentsEnabled(seller.hash, email, body.enabled) });
  } catch (error) {
    return apiFailure(error, "Couldn’t change seller payments. Try again.");
  }
}

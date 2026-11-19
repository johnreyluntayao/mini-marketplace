import { apiFailure, apiJson, readJson } from "@/lib/marketplace-server";
import { marketplaceOrigin, stripeClient } from "@/lib/payments/config";
import { connectSeller, findSellerAccount, refreshSellerAccount, sellerEmail, sellerOnboardingUrl } from "@/lib/payments/seller-account";
import { rememberSeller, sellerBrowser } from "@/lib/seller-browser";

export async function GET(request: Request) {
  try {
    const email = sellerEmail(new URL(request.url).searchParams.get("email"));
    const seller = sellerBrowser(request);
    const account = seller.hasCookie ? await findSellerAccount(seller.hash, email) : undefined;
    return apiJson({ status: account ? await refreshSellerAccount(account) : "not_connected" });
  } catch (error) {
    return apiFailure(error, "Couldn’t check your Stripe account. Try again.");
  }
}

export async function POST(request: Request) {
  try {
    marketplaceOrigin(request);
    stripeClient();
    const email = sellerEmail((await readJson(request)).email);
    const seller = sellerBrowser(request);
    const account = await connectSeller(seller.hash, email);
    const url = await sellerOnboardingUrl(request, email, account);
    return rememberSeller(request, apiJson({ url }), seller);
  } catch (error) {
    return apiFailure(error, "Couldn’t connect with Stripe. Try again.");
  }
}

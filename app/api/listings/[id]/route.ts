import { ApiError, apiFailure, catalogJson, listingDetailColumns, requireId, toListing } from "@/lib/marketplace-server";
import { checkoutConfigured } from "@/lib/payments/config";
import { createSupabaseClient, createSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: Request, { params }: RouteContext<"/api/listings/[id]">) {
  try {
    const id = requireId((await params).id, "Invalid listing ID.");
    const { data, error } = await createSupabaseClient().from("listings")
      .select(listingDetailColumns).eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError(404, "This listing is unavailable.");
    let canBuy = false;
    if (checkoutConfigured() && !data.sold_at) {
      const result = await createSupabaseServerClient().rpc("marketplace_listing_can_buy", { p_listing_id: id });
      canBuy = result.data === true;
      if (result.error) console.error("Couldn’t verify checkout eligibility.", { code: result.error.code });
    }
    return catalogJson(request, { listing: toListing(data), canBuy });
  } catch (error) {
    return apiFailure(error, "Couldn’t load this listing. Please try again.");
  }
}

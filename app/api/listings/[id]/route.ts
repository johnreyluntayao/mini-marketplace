import { ApiError, apiFailure, catalogJson, listingDetailColumns, requireId, toListing } from "@/lib/marketplace-server";
import { createSupabaseClient } from "@/lib/supabase";

export async function GET(request: Request, { params }: RouteContext<"/api/listings/[id]">) {
  try {
    const id = requireId((await params).id, "Invalid listing ID.");
    const { data, error } = await createSupabaseClient().from("listings")
      .select(listingDetailColumns).eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw new ApiError(404, "This listing is unavailable.");
    return catalogJson(request, { listing: toListing(data) });
  } catch (error) {
    return apiFailure(error, "Couldn’t load this listing. Please try again.");
  }
}

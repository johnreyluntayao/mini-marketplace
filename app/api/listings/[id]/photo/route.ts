import { ApiError, apiFailure, photoBucket, photoPath, requireId } from "@/lib/marketplace-server";
import { createSupabaseClient, createSupabaseServerClient } from "@/lib/supabase";

export async function GET(request: Request, { params }: RouteContext<"/api/listings/[id]/photo">) {
  try {
    const id = requireId((await params).id, "Invalid listing ID.");
    const listing = await createSupabaseClient().from("listings").select("image_url").eq("id", id).maybeSingle();
    if (listing.error) throw listing.error;
    if (!listing.data) throw new ApiError(404, "Listing photo is unavailable.");

    if (listing.data.image_url?.startsWith("/listings/")) {
      return new Response(null, {
        status: 302,
        headers: { Location: listing.data.image_url, "Cache-Control": "public, max-age=300" },
      });
    }

    const thumbnail = new URL(request.url).searchParams.get("size") === "thumbnail";
    const bucket = createSupabaseServerClient().storage.from(photoBucket);
    let object = await bucket.createSignedUrl(photoPath(id, thumbnail), 600);
    if (thumbnail && object.error && (
      ("status" in object.error && Number(object.error.status) === 404) ||
      ("code" in object.error && (object.error.code === "NoSuchKey" || object.error.code === "not_found"))
    )) {
      object = await bucket.createSignedUrl(photoPath(id), 600);
    }
    if (object.error) throw object.error;
    return new Response(null, {
      status: 302,
      headers: { Location: object.data.signedUrl, "Cache-Control": "public, max-age=300" },
    });
  } catch (error) {
    return apiFailure(error, "Couldn’t load the listing photo.");
  }
}

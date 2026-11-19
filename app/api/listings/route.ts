import { findCategory, isUuid, parsePriceRange, type ListingPage } from "@/lib/listings";
import { ApiError, apiFailure, apiJson, catalogJson, listingDetailColumns, listingInput, listingSummaryColumns, photoBucket, photoPath, readJson, toListing, toListingSummary } from "@/lib/marketplace-server";
import { createSupabaseClient, createSupabaseServerClient } from "@/lib/supabase";

const pageSize = 24;
const timestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;

function containsPattern(term: string) {
  return "%" + term.replace(/[\\%_]/g, "\\$&") + "%";
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const category = params.get("category");
    const query = params.get("q")?.trim() ?? "";
    const location = params.get("location")?.trim() ?? "";
    const prices = parsePriceRange(params.get("minPrice")?.trim() ?? "", params.get("maxPrice")?.trim() ?? "");
    const cursor = params.get("cursor");
    if (category && !findCategory(category)) throw new ApiError(400, "Unknown category.");
    if (query.length > 200 || query.includes("\0")) throw new ApiError(400, "Enter a search of up to 200 characters.");
    if (location.length > 255 || location.includes("\0")) throw new ApiError(400, "Enter a location of up to 255 characters.");
    if ("error" in prices) throw new ApiError(400, prices.error);

    let listings = createSupabaseClient().from("listings")
      .select(listingSummaryColumns)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(pageSize + 1);

    if (category) listings = listings.eq("category", category);
    if (query) listings = listings.ilike("search_text", containsPattern(query));
    if (location) listings = listings.ilike("location", containsPattern(location));
    if (prices.minPrice !== null) listings = listings.gte("price", prices.minPrice);
    if (prices.maxPrice !== null) listings = listings.lte("price", prices.maxPrice);

    if (cursor) {
      const [createdAt, id, extra] = cursor.split("~");
      if (!id || extra !== undefined || !isUuid(id) || !timestampPattern.test(createdAt) || !Number.isFinite(Date.parse(createdAt))) {
        throw new ApiError(400, "Invalid listing cursor.");
      }
      listings = listings.or(`created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`);
    }

    const { data, error } = await listings;
    if (error) throw error;
    const rows = data.slice(0, pageSize);
    const last = rows.at(-1);
    return catalogJson(request, {
      listings: rows.map(toListingSummary),
      nextCursor: data.length > pageSize && last ? `${last.created_at}~${last.id}` : null,
    } satisfies ListingPage);
  } catch (error) {
    return apiFailure(error, "Couldn’t load listings. Please try again.");
  }
}

export async function POST(request: Request) {
  try {
    const input = listingInput(await readJson(request));
    const supabase = createSupabaseServerClient();
    const storage = await supabase.storage.from(photoBucket).exists(photoPath(input.id));
    if (!storage.data) throw new ApiError(422, "Upload the listing photo before publishing.");

    const { data, error } = await supabase.from("listings").insert(input).select(listingDetailColumns).single();
    if (!error) return apiJson({ listing: toListing(data) }, 201);
    if (error.code !== "23505") throw error;

    const existing = await supabase.from("listings").select(listingDetailColumns).eq("id", input.id).single();
    if (existing.error) throw existing.error;
    const saved = existing.data;
    if (saved.title !== input.title || saved.description !== input.description || saved.price !== input.price ||
        saved.category !== input.category || saved.seller_email !== input.seller_email || saved.location !== input.location ||
        (saved.image_url && saved.image_url !== input.image_url)) {
      throw new ApiError(409, "This upload already belongs to a listing. Choose the photo again to publish another listing.");
    }
    return apiJson({ listing: toListing(saved) });
  } catch (error) {
    return apiFailure(error, "Couldn’t publish the listing. Please try again.");
  }
}

import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { Tables } from "@/lib/database.types";
import { findCategory, isEmail, isUuid, parsePrice, type Listing, type ListingSummary } from "@/lib/listings";
import { SupabaseConfigurationError } from "@/lib/supabase";

export const photoBucket = "listing-images";
export const listingSummaryColumns = "id,title,price,category,location,created_at,image_url";
export const listingDetailColumns = `${listingSummaryColumns},description,seller_email` as const;

type ListingRow = Pick<Tables<"listings">, "id" | "title" | "price" | "category" | "location" | "created_at" | "image_url">;

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function apiJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function catalogJson(request: Request, data: unknown) {
  const body = JSON.stringify(data);
  const tag = `"${createHash("sha256").update(body).digest("base64url")}"`;
  const headers = {
    "Cache-Control": "public, max-age=0, must-revalidate",
    "Content-Type": "application/json; charset=utf-8",
    ETag: `W/${tag}`,
  };
  const matches = request.headers.get("if-none-match")?.split(",").some((value) => {
    const token = value.trim();
    return token === "*" || token.replace(/^W\//, "") === tag;
  });

  return matches ? new Response(null, { status: 304, headers }) : new Response(body, { headers });
}

export function apiFailure(error: unknown, message: string) {
  if (error instanceof ApiError) return apiJson({ error: error.message }, error.status);
  if (error instanceof SupabaseConfigurationError) return apiJson({ error: "The marketplace backend is not configured for this operation." }, 503);
  // Supabase details can contain row data or storage credentials.
  const code = typeof error === "object" && error && "code" in error ? error.code : undefined;
  console.error("Marketplace request failed", { operation: message, code });
  return apiJson({ error: message }, 502);
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await request.json();
    if (typeof body === "object" && body !== null && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // Return the same client error for malformed bodies.
  }
  throw new ApiError(400, "Send a valid JSON object.");
}

export function requireId(value: unknown, message: string) {
  if (typeof value !== "string" || !isUuid(value)) throw new ApiError(400, message);
  return value.toLowerCase();
}

function requireText(value: unknown, label: string, max: number) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text.length > max || text.includes("\0")) {
    throw new ApiError(400, `${label} must be between 1 and ${max} characters.`);
  }
  return text;
}

export function listingInput(body: Record<string, unknown>) {
  const id = requireId(body.uploadId, "Choose a photo for this listing.");
  const category = typeof body.category === "string" ? findCategory(body.category) : undefined;
  if (!category) throw new ApiError(400, "Choose a valid category.");
  const price = typeof body.price === "number" || typeof body.price === "string" ? parsePrice(String(body.price)) : null;
  if (price === null) throw new ApiError(400, "Enter a valid price with up to two decimal places.");
  const email = typeof body.sellerEmail === "string" ? body.sellerEmail.trim() : "";
  if (!isEmail(email)) throw new ApiError(400, "Enter a valid seller email address.");
  const location = body.location === "" || body.location == null ? null : requireText(body.location, "Location", 255);

  return {
    id,
    title: requireText(body.title, "Title", 255),
    description: requireText(body.description, "Description", 5000),
    price,
    category: category.slug,
    seller_email: email,
    image_url: listingPhotoUrl(id),
    location,
  };
}

export function messageInput(body: Record<string, unknown>) {
  const buyerEmail = typeof body.buyerEmail === "string" ? body.buyerEmail.trim() : "";
  if (!isEmail(buyerEmail)) throw new ApiError(400, "Enter a valid email address.");

  return {
    id: requireId(body.id, "A valid message ID is required."),
    listing_id: requireId(body.listingId, "A valid listing ID is required."),
    buyer_email: buyerEmail,
    message: requireText(body.message, "Message", 5000),
  };
}

export function toListingSummary(row: ListingRow): ListingSummary {
  const photoUrl = row.image_url ?? listingPhotoUrl(row.id);

  return {
    id: row.id,
    title: row.title,
    price: row.price,
    category: row.category,
    imageUrl: photoUrl.startsWith("/listings/") ? photoUrl : `${photoUrl}?size=thumbnail`,
    location: row.location ?? "",
    createdAt: row.created_at,
  };
}

export function toListing(row: ListingRow & { description: string; seller_email: string }): Listing {
  return {
    ...toListingSummary(row),
    description: row.description,
    imageUrl: row.image_url ?? listingPhotoUrl(row.id),
    sellerEmail: row.seller_email,
  };
}

function listingPhotoUrl(id: string) {
  return `/api/listings/${id}/photo`;
}

export function photoPath(id: string, thumbnail = false) {
  return thumbnail ? `${id}.thumb.webp` : `${id}.webp`;
}

export function requireAdmin(request: Request) {
  const expectedToken = process.env.MARKETPLACE_ADMIN_TOKEN;
  const providedHeader = request.headers.get("authorization");
  if (expectedToken && expectedToken.length >= 32 && providedHeader?.startsWith("Bearer ")) {
    const expected = Buffer.from(expectedToken);
    const provided = Buffer.from(providedHeader.slice(7));
    if (provided.length === expected.length && timingSafeEqual(provided, expected)) return;
  }
  throw new ApiError(401, "Administrator authorization is required to read messages.");
}

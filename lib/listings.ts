export const categories = [
  { slug: "furniture", label: "Furniture" },
  { slug: "electronics", label: "Electronics" },
  { slug: "home-garden", label: "Home & Garden" },
  { slug: "clothing", label: "Clothing" },
  { slug: "sports-outdoors", label: "Sports & Outdoors" },
  { slug: "books-hobbies", label: "Books & Hobbies" },
] as const;

export type Category = (typeof categories)[number];
export type CategorySlug = Category["slug"];

export type ListingSummary = {
  id: string;
  title: string;
  price: number;
  category: string;
  imageUrl: string;
  location: string;
  createdAt: string;
  soldAt: string | null;
};

export type Listing = ListingSummary & { description: string; sellerEmail: string };

export type ListingPage = {
  listings: ListingSummary[];
  nextCursor: string | null;
};

export const listingFilterKeys = ["q", "location", "minPrice", "maxPrice"] as const;
export type ListingFilters = Partial<Record<(typeof listingFilterKeys)[number], string>>;

export function listingFilterParams(filters: ListingFilters) {
  const params = new URLSearchParams();
  for (const key of listingFilterKeys) {
    const value = filters[key]?.trim();
    if (value) params.set(key, value);
  }
  return params;
}

export function listingFilterHref(path: string, filters: ListingFilters) {
  const search = listingFilterParams(filters).toString();
  return search ? `${path}?${search}` : path;
}

export const acceptedPhotoTypes = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"] as const;
export const maxPhotoBytes = 4 * 1024 * 1024;

export function isUuid(id: string) {
  return /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);
}

export function findCategory(slug: string) {
  return categories.find((category) => category.slug === slug);
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  trailingZeroDisplay: "stripIfInteger",
});

export function formatPrice(price: number) {
  return price === 0 ? "Free" : currency.format(price);
}

export function parsePrice(price: string): number | null {
  const value = price.trim();
  if (!/^(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{0,2})?|\.\d{1,2})$/.test(value)) {
    return null;
  }

  const amount = Number(value.replaceAll(",", ""));
  return amount <= 99999999.99 ? amount : null;
}

export function isEmail(email: string) {
  return email.length <= 255 && !email.includes("\0") && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function parsePriceRange(min: string, max: string): { minPrice: number | null; maxPrice: number | null } | { error: string } {
  const minPrice = min ? parsePrice(min) : null;
  const maxPrice = max ? parsePrice(max) : null;
  if ((min && minPrice === null) || (max && maxPrice === null)) {
    return { error: "Enter valid prices with up to two decimal places." };
  }
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    return { error: "Minimum price must be less than or equal to maximum price." };
  }
  return { minPrice, maxPrice };
}

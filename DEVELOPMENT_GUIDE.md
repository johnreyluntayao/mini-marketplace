# Development guide

## Project structure

| Directory | Responsibility |
| --- | --- |
| `app/` | App Router pages, layout, error states, and global Facebook blue theme |
| `app/api/` | Request validation, catalog reads, listing publishing, image upload, and messaging |
| `components/marketplace/browse/` | Catalog, category navigation, and filters |
| `components/marketplace/create/` | Listing form, photo picker, and preview |
| `components/marketplace/detail/` | Item details, loading state, and seller messages |
| `components/layout/` and `components/ui/` | Shared navigation and shadcn/ui components |
| `lib/` | Typed data contracts, Supabase clients, and listing utilities |
| `supabase/migrations/` | Versioned database schema, indexing, and access grants |
| `tests/` | Production-server HTTP integration tests with a local Supabase fixture |

Import shared UI and icons from `@/lib/imports`. Shared components that build on the underlying primitives use `@/lib/imports/foundation` to avoid circular imports. Server route files use `@/lib/imports/screens` for screen components. Feature components can import siblings directly.

## API

| Method and route | Request and response |
| --- | --- |
| `GET /api/listings` | Optional `q`, `category`, `location`, `minPrice`, `maxPrice`, and `cursor` query parameters. Returns `listings` and `nextCursor`. |
| `POST /api/listings` | JSON with `uploadId`, `title`, `description`, `price`, `category`, `sellerEmail`, and optional `location`. Returns the published `listing`. |
| `GET /api/listings/[id]` | Returns a `listing` with the description and seller contact. |
| `POST /api/upload` | Multipart `uploadId` (UUID) and `photo` (file). Returns `uploadId` after staging the images. |
| `GET /api/listings/[id]/photo` | Redirects to a short-lived Storage URL. Use `size=thumbnail` for a gallery-sized photo. Older records with a local asset URL retain that URL. |
| `POST /api/messages` | JSON with `id` (UUID), `listingId`, `buyerEmail`, and `message`. Returns the saved message ID. |
| `GET /api/messages?listingId=…` | Admin-only. Accepts `Authorization: Bearer <MARKETPLACE_ADMIN_TOKEN>` and optional `page`. Returns `messages` and `nextPage`. |

Initial inserts and uploads return `201`. A matching retry of a completed operation uses the same ID and returns `200`. Conflicting listing or message content under a previously used ID returns `409`. Invalid input, unavailable listings, and upstream failures return an HTTP error and a JSON `error` string.

## Data and access

`listings` stores public listing details and has a generated `search_text` field. `messages.listing_id` references the listing UUID, which gives administrators the seller contact through the listing. Row Level Security permits public listing reads. Server-side requests to Supabase perform writes and sign image URLs. The admin API applies the bearer token before reading private messages.

The upload UUID becomes the listing UUID. The `image_url` column stores a stable app-relative URL. Visitor and demo photos stay in the private bucket as `<id>.webp` and `<id>.thumb.webp`. The photo route checks that a listing exists before signing a Storage URL. A retry uses the stored full-size photo to repair a partial upload. Older listings with a full-size photo can still supply the gallery image. Abandoned uploads stay private as staged objects. `supabase/seed.sql` defines the demo database rows. The setup guide covers copying the photo objects for a fresh project.

## Performance

- Sharp validates and converts photos to WebP with a 1,440-pixel maximum edge for detail pages and 480 pixels for browse cards.
- Catalog queries select compact browse fields and use the creation timestamp and UUID as a cursor. The category and creation indexes support ordering and filtering. A GIN trigram index supports case-insensitive substring searches on `search_text`.
- Successful public JSON reads advertise a weak `ETag` and revalidate on reuse, which keeps recent publishes visible. Signed photo redirects can be reused for five minutes and expire after ten minutes at Storage. Mutations, errors, and admin message reads use `no-store`.
- Browse and detail pages render similarly sized loading placeholders and defer database requests to the runtime. Tailwind CSS 4 compiles through Turbopack.

## Verification

Run `npm run lint`, `npm run build`, and `npm test`. `npm test` starts the existing production build and substitutes a local HTTP fixture for Supabase. It covers validation, photo variants and partial-upload recovery, publishing and retry behavior, photo privacy, search, pagination, conditional caching, message privacy, and an upstream failure.

For the hosted smoke test, configure the runtime settings in the [setup guide](SETUP.md). Publish a listing with a photo, verify it from a fresh session, and save a message. Check the corresponding rows and photo objects in Supabase. For browser regression testing, try an invalid file, an empty or invalid form, a missing listing, and a failed catalog request. Verify that the retry action restores results after access is available again.

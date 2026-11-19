# Setup and deployment

## Local development

Use Node.js 22 or later. The project was verified on Node.js 24. Run `npm ci` from the repository root and copy `.env.example` to `.env.local`. Use the URL and keys from the same Supabase project. [Supabase API Keys](https://supabase.com/dashboard/project/umzalpvsylvbtjkkkqyl/settings/api-keys)

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Project URL for the database and Storage APIs |
| `SUPABASE_PUBLISHABLE_KEY` | Public catalog reads through the app server |
| `SUPABASE_SECRET_KEY` | Server-side uploads, published photo links, listing creation, and message storage. Use the `sb_secret_…` key. |
| `MARKETPLACE_ADMIN_TOKEN` | Optional bearer token for reading messages through the admin API |

Keep `.env.local` out of Git and use server-only environment variables for the secret key and admin token. Generate the optional token with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`, then save it in `.env.local`.

Run `npm run dev` and open [localhost:3000](http://localhost:3000). Restart the server after changing environment variables. To run the production server locally, run `npm run build` followed by `npm start`.

## Database and Storage

The linked project already has the migrations in `supabase/migrations/`. They create the marketplace tables and grants, the private `listing-images` bucket, the keyword search index, and `listings.image_url`.

For a fresh project, initialize the repository with `npx supabase init` if the CLI needs a config, then sign in with `npx supabase login`. With Supabase CLI v3, use `npx supabase db push --remote=YOUR_PROJECT_REF --dry-run` to review the pending migrations. Run the same command with the dry-run flag removed to apply them. [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations) · [Supabase CLI v3](https://supabase.com/changelog/supabase-cli-v3)

The linked project contains eight demo listings, three sample messages, and their photos in private Supabase Storage. To reproduce the demo on another project, copy the eight `<listing-id>.webp` and eight `<listing-id>.thumb.webp` objects from the linked project's `listing-images` bucket. Keep their filenames, then run `supabase/seed.sql` after applying the migrations. Re-running the seed preserves existing rows with the demo IDs.

## View buyer messages

Open the [messages table in Supabase Table Editor](https://supabase.com/dashboard/project/umzalpvsylvbtjkkkqyl/editor/17675?schema=public) with your project account. Filter `listing_id` by the last segment of the item's URL to see its messages. Each row contains the buyer's email, message, and time sent. Sellers currently need the project operator to share the message with them.

## Vercel

1. Import the repository as a **Next.js** project and use a Node.js version that satisfies the local prerequisites.
2. Set the Supabase variables in the Vercel environment you intend to deploy. Use a separate Supabase project for Preview if preview testers will publish test data.
3. Deploy, then use the hosted app to publish a test listing with a photo, reopen it in a separate browser session, and submit a test message. Verify the listing and message in Supabase and remove the test records and their Storage objects afterward.

The app limits photos to 4 MiB so multipart uploads fit under Vercel's request size limit. [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs) · [Vercel environment variables](https://vercel.com/docs/environment-variables) · [Vercel Functions limits](https://vercel.com/docs/functions/limitations)

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Catalog shows a connection error | Verify `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and the migration history for that project. |
| Upload, publish, message, or photo request returns `503` | Set `SUPABASE_SECRET_KEY` for that environment and restart or redeploy. |
| The catalog is empty | Publish a listing to the connected project. Browser-only drafts from the earlier preview stay local. |
| Photo upload returns `413`, `415`, or `422` | Choose a readable JPEG, PNG, WebP, AVIF, or GIF up to 4 MiB. |
| Admin message read returns `401` | Check `MARKETPLACE_ADMIN_TOKEN` and the `Authorization: Bearer …` header. |

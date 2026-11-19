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

The linked project already has the migrations in `supabase/migrations/`. They create the marketplace tables, private listing images, keyword search, and the Stripe Connect seller and order tables.

For a fresh project, initialize the repository with `npx supabase init` if the CLI needs a config, then sign in with `npx supabase login`. With Supabase CLI v3, use `npx supabase db push --remote=YOUR_PROJECT_REF --dry-run` to review the pending migrations. Run the same command with the dry-run flag removed to apply them. [Supabase database migrations](https://supabase.com/docs/guides/deployment/database-migrations) · [Supabase CLI v3](https://supabase.com/changelog/supabase-cli-v3)

The linked project contains eight demo listings, three sample messages, and their photos in private Supabase Storage. To reproduce the demo on another project, copy the eight `<listing-id>.webp` and eight `<listing-id>.thumb.webp` objects from the linked project's `listing-images` bucket. Keep their filenames, then run `supabase/seed.sql` after applying the migrations. Re-running the seed preserves existing rows with the demo IDs.

## View buyer messages

Open the [messages table in Supabase Table Editor](https://supabase.com/dashboard/project/umzalpvsylvbtjkkkqyl/editor/17675?schema=public) with your project account. Filter `listing_id` by the last segment of the item's URL to see its messages. Each row contains the buyer's email, message, and time sent. Sellers currently need the project operator to share the message with them.

## Vercel

1. Push the updated source to GitHub. Confirm `.env.local` is ignored and the repository is public if required for submission.
2. Import the repository as a **Next.js** project in Vercel. For an existing project, select the branch that contains Test 4 as its production branch.
3. In **Settings → Environment Variables**, add `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `STRIPE_SECRET_KEY`, and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` to **Production**. Use the Supabase project with the Stripe migration and the sandbox keys already saved in `.env.local`. Mark the server secrets sensitive. Use separate sandbox infrastructure for previews that accept writes.
4. Deploy. Copy the public production domain from **Settings → Domains** and set `MARKETPLACE_URL` to that full HTTPS URL in the Production environment. Open the domain in a private browser to confirm it is publicly reachable.
5. From the repository root, register the Connect webhook once. Replace the example domain with the project's production domain.

   ```sh
   node --env-file=.env.local scripts/create-webhook.mjs https://your-app.vercel.app
   ```

   The script saves the production `STRIPE_WEBHOOK_SECRET` to the ignored `.env.vercel-webhook` file. Copy that value into Vercel as a sensitive **Production** variable, then redeploy. Keep the Stripe CLI signing secret in `.env.local` for local testing. The Connect endpoint receives account updates, completed checkouts, and expired checkouts.
6. In the deployed app, open **Seller payments**, enter a test seller email, and finish Stripe onboarding using Stripe's test data. Publish two $10 listings from that browser with the same email. In a separate browser, buy one with Stripe's `4242 4242 4242 4242` test card, a future expiration date, and any test CVC and ZIP. Verify **Payment confirmed**, the **Sold** label, and a paid row in Supabase **Table Editor → orders**. Leave the second listing available for the reviewer.
7. Capture the requested onboarding, checkout, confirmation, and Supabase order screenshots. Use the Vercel production URL and public GitHub repository when submitting.

The app limits photos to 4 MiB so multipart uploads fit under Vercel's request size limit. [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs) · [Vercel environment variables](https://vercel.com/docs/environment-variables) · [Vercel Functions limits](https://vercel.com/docs/functions/limitations)

## Stripe sandbox

Publish and onboard from the same browser using the same seller email. The server stores a hash of the browser's private seller cookie. Clearing cookies or switching browsers loses that proof. Listings created before the Stripe migration must be republished from the seller's browser to enable Checkout. Buyers can always browse and message without signing in.

Run the Stripe CLI in a separate terminal from the app. From the project folder in Git Bash, use `node.exe` directly so reading the key works even with a `winpty` alias for `node`:

```bash
stripe_sandbox_key="$(command node.exe --env-file=.env.local -p 'process.env.STRIPE_SECRET_KEY || ""')"
if [[ "$stripe_sandbox_key" == sk_test_* ]]; then
  STRIPE_API_KEY="$stripe_sandbox_key" npx --yes @stripe/cli listen --events=account.updated,checkout.session.completed,checkout.session.expired --forward-connect-to http://localhost:3000/api/stripe/webhook
else
  printf '%s\n' 'Check STRIPE_SECRET_KEY in .env.local. It must start with sk_test_.'
fi
unset stripe_sandbox_key
```

The sandbox key lets the CLI authenticate without the browser pairing flow. If the CLI opens a Stripe sign-in page, cancel the pairing attempt with `Ctrl+C` in the Stripe CLI terminal, then run the whole block above from the project folder. Use the port printed by Next.js if it differs from `3000`. When the listener displays `Ready`, add its `whsec_...` value to `.env.local` as `STRIPE_WEBHOOK_SECRET`. Leave the listener running and restart `npm run dev` so the app loads the signing secret. The Vercel production endpoint has its own signing secret. [Stripe CLI authentication](https://docs.stripe.com/cli/api_keys) · [Stripe Connect webhooks](https://docs.stripe.com/connect/webhooks) · [Stripe Connect test data](https://docs.stripe.com/connect/testing)

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Catalog shows a connection error | Verify `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and the migration history for that project. |
| Upload, publish, message, or photo request returns `503` | Set `SUPABASE_SECRET_KEY` for that environment and restart or redeploy. |
| The catalog is empty | Publish a listing to the connected project. Browser-only drafts from the earlier preview stay local. |
| Photo upload returns `413`, `415`, or `422` | Choose a readable JPEG, PNG, WebP, AVIF, or GIF up to 4 MiB. |
| Admin message read returns `401` | Check `MARKETPLACE_ADMIN_TOKEN` and the `Authorization: Bearer …` header. |
| Buy Now is missing | Verify the Stripe signing secret, that Stripe enabled both charges and payouts, and that the listing was published from the connected seller's browser with the same email. |
| Payment confirmation stays pending | Check Stripe's event delivery for the production Connect endpoint, confirm the matching signing secret is deployed, and retry failed deliveries. |

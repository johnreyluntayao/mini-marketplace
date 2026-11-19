# Mini Marketplace

Mini Marketplace is a local classifieds app. Visitors can browse, search, filter by category, publish a photo listing, and message a seller without signing in. The interface uses Next.js, Tailwind CSS, shadcn/ui, and Lucide. Supabase stores listings, messages, and photos.

## Local development

1. With Node.js 22 or later, run `npm ci`.
2. Copy `.env.example` to `.env.local` and fill in the Supabase URL and keys. See the [setup guide](SETUP.md) for the server settings.
3. Run `npm run dev` and open [localhost:3000](http://localhost:3000).

## Verification

```sh
npm run lint
npm run build
npm test
```

The integration tests start the production build with an isolated local backend. The build and tests run without hosted Supabase credentials.

## Project guides

- [Setup and deployment](SETUP.md)
- [Marketplace features](FEATURES.md)
- [Development and API guide](DEVELOPMENT_GUIDE.md)

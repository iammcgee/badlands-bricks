# Badlands Bricks

Self-hosted replacement for the Squarespace site at [badlandsbricks.com](https://www.badlandsbricks.com/).

MVP features:

- Home, BUILD catalog, product pages (same black / orange brand)
- Cart + Stripe Checkout for paid digital instruction downloads
- Free products skip Stripe and issue download tokens immediately
- Submit Your MOCs (file uploads)
- Contact form
- Minimal password-protected `/admin` for orders, submissions, and messages

## Quick start

```bash
npm install
npx prisma migrate dev
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Admin: [http://localhost:3000/admin](http://localhost:3000/admin)  
Default password comes from `ADMIN_PASSWORD` in `.env` (`changeme`).

## Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | SQLite path (`file:./dev.db`) |
| `NEXT_PUBLIC_SITE_URL` | Public site URL (needed for Stripe redirects) |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key (optional for this MVP) |
| `ADMIN_PASSWORD` | Password for `/admin` |
| `RESEND_API_KEY` | Optional — email notifications |
| `CONTACT_TO_EMAIL` | Inbox for contact/MOC notifications |

Paid checkout requires Stripe keys. Free products (e.g. Trophy Truck at $0) work without Stripe.

### Stripe webhook (local)

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Put the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.  
Success page also finalizes paid orders when returning with `session_id`, so local testing works even without the webhook.

## Adding products & files

1. Put product photos in `public/products/` (jpg/png/webp/svg).
2. Put instruction PDFs in `product-files/` (e.g. `product-files/max-flex-instructions.pdf`).
3. Upsert the product in the database (edit `prisma/seed.ts` and re-run `npm run db:seed`, or insert via Prisma Studio: `npx prisma studio`).

Seeded products:

- Max Flex — $10.00
- Bee Buggy — $12.00
- Trophy Truck — $0.00 (free download path)

Placeholder SVGs and sample PDFs are created by the seed so the shop works before you export assets from Squarespace.

## Deploy & DNS

Recommended host: **Vercel**.

1. Push this repo / connect the Dropbox project folder to GitHub.
2. Create a Vercel project from the repo.
3. Set env vars in the Vercel dashboard (use a hosted Postgres `DATABASE_URL` for production — SQLite on serverless is not durable).
4. Point `badlandsbricks.com` DNS:
   - Apex / `www` → Vercel (A / CNAME records Vercel provides)
5. Remove password protection / cancel Squarespace Commerce once the new site is live.

For production file uploads and PDFs, move `uploads/` and `product-files/` to object storage (S3, Cloudflare R2, or Vercel Blob) before heavy traffic.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Local development |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run db:migrate` | Apply Prisma migrations |
| `npm run db:seed` | Seed products + placeholder PDFs |
| `npm run lint` | ESLint |

## Out of scope (later)

Kid accounts, likes, community feed, kid marketplace/payouts, parts lists, and migrating historical Squarespace orders.

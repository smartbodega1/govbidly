# GovBidly

> Find and win government contracts faster. A modern, searchable interface for SAM.gov federal contracting opportunities.

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Payments:** Stripe (subscriptions, 5-day free trial)
- **Email:** Resend (alert notifications)
- **Data Source:** SAM.gov Opportunities API v2
- **Hosting:** Vercel (recommended)

## Features

- 🔍 **Smart Search** — Full-text search with filters (state, NAICS, set-aside, notice type, amount)
- 📧 **Email Alerts** — Save searches and get notified when new matching contracts appear
- 💳 **Subscription Tiers** — Starter ($29), Pro ($49), Agency ($99) with 5-day free trial
- 📊 **Dashboard** — Track saved searches, alerts, and subscription status
- 🔄 **Daily Sync** — Automated cron job pulls fresh data from SAM.gov
- 🎨 **Modern UI** — Dark theme, responsive, SEO-optimized
- 📝 **Blog/SEO** — Resource pages for organic traffic

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.local.example .env.local
# Fill in your Supabase, Stripe, SAM.gov, and Resend credentials
```

### 3. Set up Supabase
- Create a new project at [supabase.com](https://supabase.com)
- Run the migration: `supabase/migrations/001_initial_schema.sql` in the SQL editor
- Copy the URL and keys to `.env.local`

### 4. Set up Stripe
- Create products and prices in the Stripe Dashboard matching the 3 tiers
- Copy the price IDs to `.env.local`
- Set up a webhook endpoint pointing to `/api/stripe/webhook`
- Listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

### 5. Get a SAM.gov API key
- Register at [api.data.gov](https://api.data.gov/signup/) — it's free
- Add the key to `.env.local`

### 6. Run development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 7. Initial data sync
```bash
npx tsx scripts/sync-contracts.ts
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/
│   │   ├── contracts/      # Contract search API
│   │   ├── stripe/         # Checkout + webhook
│   │   ├── cron/           # Daily sync endpoint
│   │   ├── alerts/         # Email alert sender
│   │   └── auth/           # Waitlist endpoint
│   ├── search/             # Search page
│   ├── pricing/            # Pricing page
│   ├── dashboard/          # User dashboard
│   ├── blog/               # SEO content
│   ├── login/              # Auth pages
│   └── signup/
├── components/
│   ├── landing/            # Landing page sections
│   ├── search/             # Search UI components
│   ├── dashboard/          # Dashboard components
│   ├── layout/             # Header, Footer
│   └── ui/                 # Shared UI (AuthForm, etc.)
├── lib/                    # Utilities
│   ├── supabase/           # Supabase clients
│   ├── stripe.ts           # Stripe config
│   ├── sam-gov.ts          # SAM.gov API client
│   ├── constants.ts        # App constants, pricing tiers
│   └── utils.ts            # Helper functions
├── types/                  # TypeScript types
└── styles/                 # Global CSS

supabase/migrations/        # Database schema
scripts/                    # Standalone cron scripts
```

## Cron Jobs (Production)

The app expects two daily cron jobs (configured in `vercel.json`):

| Job | Schedule | Endpoint |
|-----|----------|----------|
| Contract Sync | 6:00 AM UTC daily | `POST /api/cron/sync` |
| Alert Emails | 7:00 AM UTC daily | `POST /api/alerts/send` |

Both require `Authorization: Bearer <CRON_SECRET>` header.

## Deployment

1. Push to GitHub
2. Import to Vercel
3. Add all env vars from `.env.local.example`
4. Set up Stripe webhook pointing to `https://your-domain.com/api/stripe/webhook`
5. Run initial data sync
6. Verify cron jobs are working

## Status

**MVP — Built, needs configuration and testing:**
- [x] Landing page (hero, features, pricing, FAQ, CTA)
- [x] Search/filter interface
- [x] Contract card display
- [x] Supabase database schema
- [x] Supabase auth (signup/login)
- [x] Stripe checkout + webhooks
- [x] SAM.gov API integration
- [x] Daily sync cron job
- [x] Email alert system (Resend)
- [x] Dashboard with saved searches
- [x] Blog/SEO pages
- [x] Pricing page with comparison table
- [ ] Actual SAM.gov API key (needs registration)
- [ ] Stripe products/prices (needs creation)
- [ ] Supabase project (needs creation)
- [ ] Resend account (needs setup)
- [ ] Domain name
- [ ] Testing & QA

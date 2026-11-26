# CINEVERSE — Premium Movie Ticket Booking Platform

CINEVERSE is a full-stack cinema ticket booking platform built with **React 19**, **Tailwind CSS v4**, **Node.js / Express**, **Drizzle ORM**, **PostgreSQL** (provisioned via Cloud SQL, with a compatible `supabase/schema.sql` for external Supabase PostgreSQL), and **Firebase Authentication**.

## Key Features

- **Home & Discovery**: Cinematic hero premiere, trending carousel, Now Showing & Coming Soon grids, search, city location filter, genre filter, and language filter.
- **Movie Details & Showtimes**: Synopsis, cast & crew, trailer preview modal, date selector, and interactive theatre/showtime cards with Silver, Gold, and Platinum tier pricing.
- **Interactive Auditorium Seat Map**: Curved cinema screen, tiered seating (Silver, Gold, Platinum), accessible seating indicators, occupied/blocked seats, and real-time itemized pricing.
- **Atomic Booking & Demo Checkout**: Transactional seat allocation protected by a PostgreSQL unique index on `(show_id, seat_id)`, demo payment gateway supporting both simulated approvals and declines, unique booking codes, scannable QR tickets, and downloadable HTML passes.
- **Patron Account & History**: Google Sign-In, editable profile preferences, booking history, QR ticket viewer, and cancellation with automatic seat release.
- **Admin Dashboard**: Box office analytics charts, movie CRUD, theatre & screen creation, interactive seat maintenance (block/unblock), showtime scheduling & pricing, bookings ledger, and user directory.

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables (`.env`) based on `.env.example` and database credentials (`SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD`, `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD`).
3. Push Drizzle schema to PostgreSQL:
   ```bash
   npx drizzle-kit push --config=src/db/drizzle.config.ts
   ```
4. Start the full-stack server on port `3000`:
   ```bash
   npm run dev
   ```

## External Supabase PostgreSQL Setup (Optional)

If deploying outside AI Studio with Supabase:
1. Create a Supabase project and execute `supabase/schema.sql` in the SQL Editor.
2. Point your PostgreSQL driver configuration (`src/db/index.ts`) to your Supabase Postgres host, user, password, and database credentials.

## GitHub & Vercel Deployment

1. Push the repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial CINEVERSE release"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```
2. Import the repository in **Vercel**:
   - Framework Preset: `Other` / `Vite`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - `vercel.json` automatically routes `/api/*` requests to `api/index.ts`.
   - Configure all required environment variables in Vercel Project Settings -> Environment Variables.

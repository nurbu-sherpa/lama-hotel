# Lama Hotel & Lodge — Website & Admin Dashboard

Website and owner dashboard for **Lama Hotel & Lodge**, Jiri Bazaar, Jiri, Nepal
(right side of Hotel Paras · +977 9818486480 · sherpanurbu15@gmail.com).

- **Public website** — homepage, rooms & prices, Jiri travel guide, gallery, location, contact, booking inquiry, FAQ.
- **Admin dashboard** (`/admin`) — the owner edits hotel details, rooms & prices, facilities, photos, homepage text,
  Jiri guide, FAQs, SEO and Google Maps, and manages booking inquiries and contact messages. No code changes needed.

Website bookings are **inquiries only** (no online payment). A submitted form never confirms a room — the owner reviews it and
converts it into a **reservation**. Walk-in, phone and WhatsApp guests are entered directly as reservations. Availability is
calculated from reservations in the database, per physical room (6 × Standard, 2 × Special).
Prices are **per room**, never multiplied by the number of guests.

**Architecture diagrams:** [docs/architecture/ARCHITECTURE.md](docs/architecture/ARCHITECTURE.md) (Mermaid source + rendered SVGs).

---

## Architecture

```
                 Next.js 16 application (single monolith)
          ┌──────────────────────┴──────────────────────┐
     Public website                               Admin dashboard
  (Server Components,                         (protected by Auth.js;
   cached DB reads)                            Server Actions for edits)
          └──────────────────────┬──────────────────────┘
                     Server Actions / Route Handlers
                                 │
                              Prisma
                                 │
                            PostgreSQL            Images: Cloudinary (prod) / local disk (dev)
```

**How edits reach the website:** public pages read data through cached functions (`src/lib/data/public.ts`)
tagged `site-content`. Every admin save calls `updateTag("site-content")`, so changes (e.g. a new price or
facility) appear on the website immediately. Pages render per request from that cache, so builds don't need a database.

### Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Server Components, Server Actions, `proxy.ts`), React 19, TypeScript |
| Styling | Tailwind CSS 4, Playfair Display + Karla via `next/font`, `lucide-react` icons |
| Database | PostgreSQL + Prisma 6 |
| Auth | Auth.js v5 (credentials + JWT session cookie), bcrypt password hashes |
| Validation | Zod (server) + HTML constraints (client) |
| Images | Cloudinary (production) · local `./uploads` folder (development / self-hosting) |
| Email (optional) | Gmail SMTP via Nodemailer |
| Spam protection | Cloudflare Turnstile (optional) + honeypot + rate limits |

### Project structure

```
prisma/              schema.prisma, migrations/, seed.ts (real hotel data only)
public/images/placeholders/   temporary Jiri photos (see CREDITS.md) — NOT hotel photos
src/
  app/
    (public)/        public pages: /, /rooms, /rooms/[slug], /jiri/*, /gallery, /location, /contact, /booking, /faq, /privacy, /terms
    admin/login/     login page
    admin/(panel)/   protected dashboard: dashboard, hotel, rooms, facilities, gallery, homepage, jiri, faqs, bookings, messages, maps, seo, settings
    api/auth/        Auth.js route handler
    uploads/[name]/  serves locally stored uploads (dev only)
    sitemap.ts, robots.ts, layout.tsx, not-found.tsx, error.tsx
  auth.ts            Auth.js config (login rate limiting, timing-safe checks)
  proxy.ts           optimistic redirect of /admin/* to login
  components/        public/, admin/, forms/, ui/, shared/
  lib/               db, auth guard, data (cached reads), seo (metadata + JSON-LD), storage, validation, markdown, email, security
  server/actions/    public.ts (booking/contact) and admin/* (all mutations, each guarded by requireAdmin())
  config/            site config & constants
```

---

## Local setup

**Requirements:** Node.js ≥ 20.9, npm, and a PostgreSQL database (local, Docker, Supabase or Neon).

```bash
npm install
cp .env.example .env          # then fill in the values (see below)
npm run db:migrate            # create tables (development)
npm run db:seed               # load hotel data + create the admin account
npm run dev                   # http://localhost:3000  ·  admin: http://localhost:3000/admin
```

Quick local PostgreSQL with Docker:

```bash
docker run -d --name lama-hotel-db -e POSTGRES_USER=lama -e POSTGRES_PASSWORD=change-me \
  -e POSTGRES_DB=lama_hotel -p 5433:5432 postgres:16-alpine
# DATABASE_URL="postgresql://lama:change-me@localhost:5433/lama_hotel?schema=public"  (DIRECT_URL = same)
```

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection (use the **pooled** URL on Supabase/Neon) |
| `DIRECT_URL` | yes | Direct (non-pooled) connection used by migrations. Locally: same as `DATABASE_URL` |
| `AUTH_SECRET` | yes | Session encryption secret — `npx auth secret` or `openssl rand -base64 32` |
| `AUTH_TRUST_HOST` | when not on Vercel | Set to `true` when self-hosting with `npm start` |
| `NEXT_PUBLIC_SITE_URL` | yes | Public URL, no trailing slash (canonical URLs, sitemap, Open Graph) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | seed only | Used **once** by `npm run db:seed` to create the owner account (password ≥ 12 chars). Remove afterwards |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | production | Image uploads. Without them, uploads go to `./uploads` (dev) and are **disabled on Vercel** |
| `SMTP_USER`, `SMTP_PASS` | optional | Gmail account that **sends** notification emails (an App Password, not the normal password). Alerts go to the hotel email or the address set in Admin → Settings |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | optional | Cloudflare Turnstile spam check on the booking and contact forms. Add every hostname (incl. `localhost`) to the widget in Cloudflare |

Never commit `.env` (it is in `.gitignore`).

### npm scripts

| Script | Does |
|---|---|
| `dev` | Development server |
| `build` | `prisma generate` + production build |
| `start` | Run the production build |
| `lint` / `typecheck` | ESLint / TypeScript checks |
| `test` | Unit tests for the availability / conflict logic (`tests/`) |
| `db:generate` | Generate Prisma client |
| `db:migrate` | Create/apply migrations in development (`prisma migrate dev`) |
| `db:deploy` | Apply migrations in production (`prisma migrate deploy`) |
| `db:seed` | Seed hotel data and the admin user (safe to re-run — never overwrites owner edits) |
| `db:studio` | Browse the database |

---

## Deployment (Vercel + Supabase/Neon + Cloudinary)

1. **Database** — create a PostgreSQL project on [Neon](https://neon.tech) or [Supabase](https://supabase.com).
   Copy the *pooled* connection string to `DATABASE_URL` and the *direct* one to `DIRECT_URL`
   (Supabase: "Transaction pooler" port 6543 with `?pgbouncer=true` for `DATABASE_URL`, port 5432 for `DIRECT_URL`).
2. **Images** — create a free [Cloudinary](https://cloudinary.com) account and copy cloud name, API key and API secret.
3. **Vercel** — import the Git repository. Add all environment variables above (Production + Preview).
   Set `NEXT_PUBLIC_SITE_URL` to the real domain, e.g. `https://lamahoteljiri.com`.
4. **Migrate & seed** (once, from your computer with the production env values):
   ```bash
   DATABASE_URL=... DIRECT_URL=... npm run db:deploy
   DATABASE_URL=... DIRECT_URL=... ADMIN_EMAIL=... ADMIN_PASSWORD=... npm run db:seed
   ```
   For later schema changes run `npm run db:deploy` before/after deploying. The migrations include a data step that creates one
   physical room per room in each room type (e.g. Standard 1–6, Special 1–2) on existing databases.
5. **Domain & Google** — add the domain in Vercel, then submit `https://your-domain/sitemap.xml` in Google Search Console
   (paste the verification code in Admin → SEO).

Self-hosting instead (VPS): `npm ci && npm run build && npm start` behind a reverse proxy with HTTPS, with `AUTH_TRUST_HOST=true`.
Local uploads then live in `./uploads` — back that folder up, or use Cloudinary.

---

## Admin guide (for the owner)

Log in at `/admin`. Everything is in the left menu:

- **Hotel Information** — name, phone, WhatsApp, email, address, check-in/out times, social links (icons appear only once added).
- **Reservations** — the **New Reservation** button is for walk-in, phone and WhatsApp guests. Pick dates and the room type;
  the form shows which rooms are free. Quick buttons: Confirm, Check in, Check out (early check-out frees the remaining
  nights), Cancel, No-show. Payment status and amount are records only — there is no online payment.
- **Availability** — choose a date or range (Today, Next 7 days…) to see all 8 rooms, who is in each, and how many rooms of each
  type are free. Click a free cell to book it. This page also has the switch to **show availability on the website**
  (counts only, off by default — turn it on once every booking is entered here).
- **Rooms** — prices (per room), beds, room photos, and the **physical rooms** (rename “Standard 1” to your door numbers, add a
  room, or mark one “out of service”). The number of rooms is counted from the physical rooms automatically.
- **Facilities** — add only facilities you really offer; hide or reorder them.
- **Gallery** — upload photos. Tick **"This is a photo of Lama Hotel & Lodge"** only for real hotel photos.
  Then delete the temporary Jiri photos if you like.
- **Homepage / Jiri Guide / FAQs** — edit text and images.
- **Booking Inquiries** — website requests. Contact the guest (call / WhatsApp / email buttons), then **Convert to reservation**
  (details are copied; the inquiry is kept and linked). Inquiries never hold a room on their own.
- **Google Maps** — directions link and optional embedded map.
- **SEO** — page titles and descriptions for Google.
- **Settings** — change password, notification email, see whether image uploads and email are set up.

---

## Notifications (dashboard & email)

When a guest sends a **booking inquiry** or a **contact message** from the website:

1. **Admin dashboard** — a pop-up appears and the bell count goes up within ~15 seconds, without refreshing
   (lists and badges update automatically). Optional sound and desktop alerts: click the bell → *Sound* / *Enable desktop alerts*.
   *Clear all* empties the bell on that device; it never changes an inquiry's status.
2. **Email** — sent to the address in **Admin → Settings → Notifications** (defaults to the hotel email).
3. **Guest confirmation** — booking guests get a "we received your inquiry" email (capped at 40 per day, so the
   hotel's Gmail can't be abused to send spam).

Notifications are sent *after* the inquiry is saved, so a failed email can never lose a booking. Every attempt appears
under **Settings → Recent deliveries**, and the **Send test email** button checks the setup.

**Sending credentials (server `.env`, see `.env.example`):**

| Channel | Variables |
|---|---|
| Gmail | `SMTP_USER` (your Gmail address) + `SMTP_PASS` (a Google **App Password** — Google Account → Security → 2-Step Verification → App passwords). Optional: `EMAIL_FROM`, `SMTP_HOST`, `SMTP_PORT` |

`SMTP_USER` is the account that **sends**; who **receives** the alerts is set in the admin. Recipients and on/off
switches live in the admin; credentials never do. Restart the server after changing `.env`.

## Reservations & availability (how it works)

- A stay occupies the nights **[check-in, check-out)**: 10 → 12 June uses the nights of 10 and 11 June; the room is free on 12 June.
- Rooms are held by **Pending, Confirmed, Checked-in, Checked-out** reservations; **Inquiry, Cancelled, No-show** never hold rooms.
- Availability per room type = active physical rooms − rooms booked on the busiest night of the range.
  Status: **Available**, **Limited** (≤ ⅓ left, minimum 1) or **Fully booked**.
- Every save runs a server-side conflict check inside a **serializable database transaction**: the same physical room can't be
  booked twice for overlapping nights, and a room type can't be booked beyond its number of rooms — even if two people save at once.
- Guest details exist only in authenticated admin pages. The public site only ever receives aggregated counts per room type.

Code: `src/lib/availability/core.ts` (pure logic, unit-tested), `src/server/services/reservations.ts` (transactional save),
`src/lib/data/availability.ts` (public, counts only).

## Security notes

- Passwords hashed with bcrypt (cost 12); login rate limited (5 failures per email / 10 per IP per 15 min).
- Admin protected three times: `proxy.ts` redirect (session-cookie check), admin layout `requireAdmin()` (verifies the session and
  that the account still exists), and `requireAdmin()` inside **every** admin Server Action — including all reservation actions.
- Guest/reservation data is never placed in page titles, metadata, the sitemap or public responses; `/admin` is `noindex` and
  disallowed in robots.txt. Only data needed for hotel operations is collected (no ID/passport fields).
- Session: HTTP-only, SameSite=Lax cookie (Secure on HTTPS), 8-hour lifetime.
- All input validated with Zod on the server; public forms have a honeypot, per-IP rate limits (stored as salted hashes, never raw IPs)
  and duplicate-submission protection. Inquiries are saved **before** any email is attempted.
- Uploads: JPG/PNG/WebP only, verified by file signature (magic bytes), max 5 MB.
- User content is rendered as text (React escaping); formatted text uses a tiny safe Markdown subset — no raw HTML.
- Prisma parameterised queries only; error pages never show stack traces.

## Content honesty

The seed contains only owner-supplied facts. No reviews, ratings, awards, history, invented facilities, coordinates
or social accounts. Temporary Jiri photos are labelled as destination photos with credits, and are never used as the
hotel's image in structured data. Jiri travel content avoids changing facts (bus times, fares, road conditions).

## Troubleshooting

| Problem | Fix |
|---|---|
| `Can't reach database server` | Check `DATABASE_URL`, that the DB is running, and (Supabase/Neon) that SSL/pooling params are correct |
| Login says "Incorrect email or password" | Run `npm run db:seed` with `ADMIN_EMAIL`/`ADMIN_PASSWORD` set; the seed doesn't change an existing password |
| "Too many failed attempts" | Wait 15 minutes |
| `UntrustedHost` error when self-hosting | Set `AUTH_TRUST_HOST=true` |
| Photo upload says storage not configured | Set the three `CLOUDINARY_*` variables (required on Vercel) |
| Website doesn't show my change | Hard-refresh. All admin saves invalidate the cache immediately; if editing the DB directly, changes appear within 1 hour |
| Windows: `EPERM ... query_engine-windows.dll.node` on build | Stop running `next dev` processes first |

## Items still requiring owner action

- Real photos of the hotel and rooms (Admin → Gallery / Rooms)
- Any additional confirmed facilities (Admin → Facilities)
- Facebook, Instagram and other social links (Admin → Hotel Information)
- Google Business Profile URL (Admin → Google Maps)
- Confirm or change check-in / check-out times (currently 2:00 PM / 12:00 PM)
- Rename physical rooms to match real door numbers if different (Rooms → room type → Physical rooms)
- Enter existing and upcoming bookings as reservations, then decide whether to show availability on the website (Admin → Availability)
- Production accounts: database, Cloudinary, Gmail App Password, (optional) Cloudflare Turnstile, domain

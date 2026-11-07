# FuelStation Intelligence

Functional Next.js MVP for Nigerian filling-station data ingestion and operational intelligence. PostgreSQL is the source of truth; dashboard figures are queried from stored transactions and meter snapshots. All supplied demonstration records are simulated. No manufacturer-specific hardware compatibility or physical connection is claimed.

## Run locally

Requirements: Node.js 22.6+ (24 recommended), npm, PostgreSQL 17+ or Docker. The included embedded PostgreSQL option works without Docker on supported platforms.

```bash
npm ci
cp .env.example .env
```

Set `ADMIN_PASSWORD`, `SESSION_SECRET` (at least 32 random characters), and `INGESTION_API_KEY` to random values in `.env`. Do not commit this file. `DATABASE_URL` in the example points to the included local setup.

Choose **one** database option:

```bash
# Option A: persistent local PostgreSQL, no Docker required; keep running
npm run db:local

# Option B: Docker
# docker compose up -d postgres
```

In another terminal:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

Open http://localhost:3000 and sign in with `ADMIN_PASSWORD`. The seed refuses to overwrite a populated database. It creates one organisation, one Lagos station, four dispensers, eight nozzles, PMS/AGO products, price history, and seven days of simulated transactions with cumulative snapshots. Previous-day closes are the following midnight's boundary snapshots. Today is provisional and uses the latest snapshot. All day boundaries use **Africa/Lagos (UTC+1)**.

For a production build locally:

```bash
npm run build
npm start
```

Local PostgreSQL files persist under `.pgdata`; Docker uses a named volume. Do not delete these to restart the application.

## Demonstrate the core flow

1. Open **Live simulator**, choose a pump/nozzle, price and litres.
2. Generate one transaction or a batch. Start/Pause emits an event every four seconds while the screen remains open.
3. Open **Data ingestion** to inspect the raw event and outcome.
4. Open **Transactions** and inspect its linked event ID. Reload the page: the record remains.
5. Open **Overview**, **Pump monitoring** and **Reports & analytics**. Figures derive from PostgreSQL.
6. Simulate an offline source, generate events, restore connectivity, then replay queued events. Replay is explicit and ordered by event creation in the UI; an event with an older simulated timestamp than an already stored reading is rejected for review.
7. Replay an accepted event. It is audited as a duplicate and contributes no additional sale.

## Ingestion API

### Transactions

```bash
curl -X POST http://localhost:3000/api/ingestion/transactions \
  -H "Authorization: Bearer $INGESTION_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "external_transaction_id":"TXN-000001",
    "station_id":"ST001",
    "pump_id":"P01",
    "nozzle_id":"N01",
    "fuel_type":"PMS",
    "litres":"25.000",
    "price_per_litre":"900.00",
    "sale_value":"22500.00",
    "completed_at":"2026-11-07T12:30:00Z",
    "source":"external-api"
  }'
```

Load the API key into your shell securely before running this command. Use a current/past timestamp and registered identifiers. The sample uses `external-api` so it does not manufacture a cumulative reading. `simulator` and `mock-forecourt` generate explicitly simulated meter snapshots; historical simulated transactions older than the current meter are rejected rather than retroactively rewriting the meter.

`started_at` and `sale_value` are optional. If `sale_value` is supplied, it must match rounded `litres × price_per_litre`. Amounts must be decimal **strings** (3 places for litres, 2 for naira). Fuel product must match the registered nozzle. Historical prices are copied into each immutable transaction.

Responses: `200 ACCEPTED` or `DUPLICATE`, `202 QUEUED` for offline transaction sources, `401` for invalid authentication, `422 REJECTED` for validation/identifier conflicts, `413` over the 64 KiB logical payload limit. All authenticated payloads within the size limit, including malformed JSON, are audited. Unauthenticated requests are rejected before storage. Raw payloads may contain sensitive operational information: apply a retention policy in production.

Idempotency is `(sourceId, external_transaction_id)`, and a source is scoped to a station. A unique database constraint and source-row lock protect concurrent replay. Conflicting reuse of an ID is rejected. The transaction, accepted event state, and simulated snapshot commit atomically. Replays create linked new audit attempts; accepted data is never overwritten.

### Independent cumulative meter snapshots

```bash
curl -X POST http://localhost:3000/api/ingestion/meter-snapshots \
  -H "Authorization: Bearer $INGESTION_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "external_snapshot_id":"METER-000001",
    "station_id":"ST001","pump_id":"P01","nozzle_id":"N01",
    "cumulative_litres":"113500.000",
    "recorded_at":"2026-11-07T18:00:00Z",
    "kind":"CURRENT","source":"external-api"
  }'
```

Use actual independently observed readings and timestamps when a supported integration exists. Types: `OPENING`, `CLOSING`, `BOUNDARY`, `CURRENT`, `RESET`, `REPLACEMENT`, `CORRECTION`. Last three require an `exception` reason. Decreasing readings without an explicit reason are rejected. Snapshot IDs are idempotent per source. Meter payloads are audited, and accepted snapshots link back to their event. Offline meter attempts are audited as rejected and can be replayed after restoring the source.

For historical daily reconciliation, send exact local-midnight boundary snapshots (`23:00:00Z` on the preceding UTC date). Meters are never reset at midnight. Daily volume is closing cumulative litres minus opening cumulative litres. Missing boundaries, decreases, recorded exceptions and nonzero differences are flagged. Current-day closing is provisional. A positive meter difference can indicate missing transactions; a negative difference can indicate missing readings or erroneous transactions. The app does not invent a cause or silently adjust values. Simulated readings are correlated with the simulator's transactions and cannot independently establish real-world accuracy.

### Internal administrative routes

Cookie-authenticated: `GET /api/data`, `GET /api/export`, `POST /api/simulator`, `POST /api/settings`, and `POST /api/events/:id/replay`. Export types: `transactions`, `daily`, `reconciliation`. Export uses the selected station/date; transaction CSV exports the full selected day, as labelled in the UI, rather than the current search/page. CSV values preserve decimal strings and escape spreadsheet formula prefixes.

## Architecture

- `prisma/schema.prisma`: all 13 requested models; decimal columns, foreign keys, timestamps, indexes and idempotency constraints.
- `prisma/migrations`: deployable PostgreSQL SQL migrations.
- `lib/ingestion.ts`: raw audit → Zod validation → identity checks → source availability → idempotency → atomic persistence.
- `lib/meters.ts`: independently audited meter ingestion and explicit exception handling.
- `lib/adapters.ts`: `DispenserAdapter`, simulated dispenser, generic external API adapter and mock forecourt-controller adapter.
- `lib/analytics.ts`: database-backed daily totals, pump/nozzle totals, hourly volumes, trailing 7/30-day aggregates and reconciliation.
- `components/console.tsx`: responsive operational workspace using Tailwind, a shadcn-style Radix/CVA Button and Recharts.
- `lib/auth.ts`: server-only ingestion API key and signed, expiring, HttpOnly admin session; same-origin mutation checks.

Multiple stations belong to one organisation. This MVP has a **single administrator workspace**; it is not an isolated multi-tenant public SaaS yet. `User` and `Organisation` models are in place, but production multi-tenant onboarding, per-user identity, RBAC and tenant-scoped credentials require further work.

## Hardware integration requirements

Gilbarco, Wayne, Tatsuno and Tokheim adapters are **not implemented**. A generic REST adapter does not imply support for their protocols. Before implementing any manufacturer connection obtain:

- Exact dispenser and controller model, firmware and installed interfaces.
- Vendor-authorised protocol documentation, licensing/SDK access and legal permission.
- Station network topology, serial/TCP details, safe read-only access and controller ownership.
- Transaction identifiers, sequence numbers, meter precision, rollover/reset rules and timestamps/timezone.
- Nozzle/product mapping, unit-price changes, cancelled sales and corrections semantics.
- Offline buffering and replay behaviour, polling/push limits and expected ordering.
- Vendor test environment or supervised hardware acceptance testing with independently reconciled readings.

An on-site connector should buffer to durable local storage during Nigerian network/power outages, preserve original IDs, and use authenticated outbound HTTPS to submit events. The web simulator queues in PostgreSQL after the server receives an event; it is **not** a power-loss-proof on-site edge agent. Never put dispenser control commands into this read-only ingestion path without a separate reviewed safety architecture.

## Tests

Use a local disposable development database with the migrations applied. Tests create a separate temporary organisation/station and remove their own records; they do not clear seed data.

```bash
npm test
npm run build
npm start
# Separate terminal; requires Chromium installed
npm run test:e2e
```

Set `CHROMIUM_PATH` if Chromium is not `/usr/bin/chromium`. The browser check signs in, visits seven screens, generates one real stored simulated transaction, reloads, verifies persistence, checks CSV and 390px mobile navigation, and rejects unauthenticated ingestion. It intentionally adds a labelled simulated transaction to the demo station. Screenshots are written to ignored `overview.png` and `mobile.png`.

Acceptance tests cover exact monetary calculation, concurrent idempotency, meter persistence across days, daily deltas, multi-nozzle/pump/station aggregation, immutable historical pricing, invalid/missing/reset readings, persistence on subsequent queries, CSV correspondence and escaping, offline replay and independently audited meter snapshots.

## Vercel deployment

A hosted PostgreSQL database is required. The local `.pgdata` server cannot be used from Vercel. Do not deploy a static-only dashboard or substitute browser storage.

1. Push this branch and import `olamilekanalaga/pump-NG` into Vercel as a Next.js project (Node 24).
2. Provision a PostgreSQL database such as Neon or Supabase. Set `DATABASE_URL` in Vercel to its TLS-enabled connection URL; use a provider-supported pooler for application traffic. Use the provider's direct connection for migrations when necessary.
3. Add `ADMIN_PASSWORD`, `SESSION_SECRET`, `INGESTION_API_KEY` as encrypted environment variables for the intended preview/production environment. Never use `.env.example` placeholder secrets.
4. In a secure CI/release environment using the target database URL run `npm ci`, then `npm run db:migrate`. Seed only a dedicated empty demo database (`npm run db:seed`, which reads `.env`; write the environment file securely there or invoke `node --import tsx prisma/seed.ts` with injected variables). Do not seed real operational databases.
5. Build command: `npm run build`. Install command: `npm ci`. Framework: Next.js. Deploy the branch.
6. Verify the resulting HTTPS deployment: login, generate one simulation event, inspect its raw audit event, refresh, reconcile, export CSV, and ensure unauthenticated ingestion returns 401. Test an authenticated external transaction and independent snapshot in a test station before enabling a real connector.
7. Rotate demonstration credentials before inviting users. Add per-user identity/RBAC, tenant-scoped API keys, durable ingress rate limiting, login brute-force protection, monitoring, database backups, retention and load testing before a public production launch.

No hosted deployment is claimed by this repository. A local production build and database-backed/browser acceptance checks can be run with the commands above.

## Password-free browser demo

Visit `/demo` for the isolated interactive demo. When `DATABASE_URL` is absent at build time, the homepage opens this demo automatically. No production authentication is bypassed: this mode uses IndexedDB in the visitor's own browser and never submits to production API routes. Each browser gets its own generated seven-day demonstration dataset. Simulator transactions, audit events, settings and meter snapshots persist across refreshes on that device. CSV exports are produced from those stored records. Offline/replay and idempotency run in the local demo adapter, not through the PostgreSQL REST ingestion service. The full PostgreSQL application and its authenticated endpoints are unchanged. Clear this site's browser storage to reset demo data; browser storage is not a hosted production database or a shared cross-device account.

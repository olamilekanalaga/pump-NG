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

## Owner-first automatic operations

The default screen is now **Owner overview**. Production access remains restricted to the administrator/owner session. There is no attendant account or sale-entry workflow, no payment-method labels, and no POS/payment reconciliation. Simulation controls are visible only in the isolated browser demo; the production navigation hides them. Owner configuration is separate from recorded sales, which cannot be edited in the interface.

- Custom inclusive date ranges, Last 3 days, calendar month/year presets, daily litres and calculated naira value.
- Starting, current and closing cumulative meter readings with missing-boundary and discrepancy checks.
- Read-only incoming purchases, source provenance, automatic litre-to-naira conversion and period totals.
- CSV exports for transactions, daily totals, meter reconciliation, pump totals, stock estimates, raw meter/tank readings, ingestion audits, products, price history and source metadata.
- Business questions use deterministic calculations over available records. Sales/litres/product/pump/date questions and stock/ingestion exceptions are supported. This is not an unrestricted AI accountant: profit, customer identities, cash collections and staff attendance are explicitly unavailable without their own data sources.

`GET /api/business?station=ST001&from=2026-11-01&to=2026-11-07` returns the owner report. Add `&export=transactions` (or `daily`, `meters`, `pumps`, `stock`, `readings`, `tankReadings`, `events`, `products`, `prices`, `sources`) for CSV. Transactions/daily/event records follow the date range; stock shows the latest current estimate. Raw readings and configuration exports contain all available station records.

### Automatic pricing

The authenticated transaction API accepts `price_per_litre` from the pump/provider when supplied. If omitted, it looks up the product price effective at `completed_at`. No configured historical price means the event is rejected; an attendant is never asked to supply it. The resolved price and calculated amount are stored on the transaction, so future price changes do not rewrite history. Supplied sale amounts must match decimal-safe litres × price, rounded half-up to kobo. This is calculated sales value, not evidence of collected money.

### Tank feed and 80% depletion alerts

A dispenser cumulative counter cannot determine the fuel left in a tank. The provider must supply tank capacity, an independently observed stock reading, and the nozzle mapping. The default reorder condition is **remaining stock ≤ 20% of tank capacity** (80% capacity depletion); it is not 80% of a dispenser's lifetime counter or a guaranteed calculation of the proportion of one particular delivery sold.

Authenticated endpoint: `POST /api/ingestion/tank-stock` using the ingestion Bearer key.

```json
{
  "external_event_id": "TANK-READING-000001",
  "station_id": "ST001",
  "tank_id": "ST001-PMS-TANK",
  "tank_name": "PMS tank",
  "fuel_type": "PMS",
  "capacity_litres": "30000.000",
  "stock_litres": "6000.000",
  "recorded_at": "2026-11-07T12:30:00Z",
  "source": "external-api",
  "nozzle_ids": ["registered-database-nozzle-id"],
  "reorder_percent": 20
}
```

Use a current real timestamp and registered nozzle IDs belonging to the station/product. Events are audited and idempotent by source/external event ID; conflicting replay is rejected. Tank mapping cannot be silently reassigned. Every subsequent transaction subtracts its litres from the latest stock baseline. A replenishment requires a new observed stock reading; a delivery quantity alone is not treated as an independently measured tank level. Threshold alerts are persisted transactionally with ingestion, deduplicated per tank, and resolved when a new valid reading places stock above the threshold. Alerts are in-app; SMS/email/WhatsApp notifications are not configured.

Current estimates flag missing readings/mappings, impossible balances, source outages and stale readings. They do not prove theft, account for unreported deliveries, or substitute for tank-gauge calibration and transaction completeness. Missing tank data is displayed as awaiting data rather than invented stock. Browser demo tanks are explicitly simulated, including a low-stock example and a simulated refill action.

Apply `202611070003_tank_stock_alerts` before running the updated PostgreSQL backend. Run `npm test` for reporting/ingestion/inventory tests and `node --import tsx scripts/owner-check.ts` for the owner-workspace browser check. Set `DEMO_BASE_URL` to test the deployed `/demo` route.

## Read-only fuels and notifications

Fuel names shown to owners are **Petroleum**, **Kerosene** and **Diesel**. Existing provider codes PMS/DPK/AGO remain valid; the ingestion API also normalises the human-readable names to those codes. New development seeds include three products and twelve nozzles. Previously saved browser workspaces gain Kerosene history without replacing existing sales.

The visible application has no sale, meter, price, refill or station data-entry forms. Settings now shows read-only station details, prices and registered nozzles. Only filters and business-question inputs remain. Operational writes arrive through authenticated ingestion APIs; administrative setup endpoints remain protected for deployment/integration setup.

The notification bell shows:

- A per-tank reorder message at the configured low-stock threshold (80% depletion / 20% remaining by default), with fuel name and remaining litres.
- A sales-growth message when today's calculated naira sales are at least twice yesterday's full-day total. The percentage is calculated from recorded values; no percentage is invented if yesterday has no recorded sales.
- Today's recorded litres and calculated naira sales, independently of the dashboard's date filter.

Notifications refresh every ten seconds and can be marked read; read state is stored per station on the device. Selecting a message opens the owner overview. `GET /api/notifications?station=ST001` requires the owner session in the PostgreSQL application. The browser preview uses the same notification calculations over its isolated records. Notification CSV export is available alongside the other datasets. These are in-app messages, not external email/SMS delivery.

## Fuel-first home

The first page has horizontal **Petrol**, **Diesel**, and **Kerosene** tabs with an active underline, and branch-scoped starting-stock cards. Each opens that fuel's complete captured history by default, with date presets, custom dates, transaction pagination, daily totals, cumulative meters, and fuel-scoped CSV files. No stock/delivery banners or business-question widgets appear on the first page.

**Ask** is a separate navigation item. Delivery/reorder messages remain in the notification drawer; selecting a stock message keeps it in that drawer. Daily-sale and sales-growth notifications open Transactions and Reports respectively. Global dataset exports remain on Reports.

`/api/business?from=all&to=YYYY-MM-DD` starts at the station's earliest captured transaction instead of silently defaulting to today. The same behaviour is implemented for the isolated browser dataset. Fuel names are displayed as Petrol/Diesel/Kerosene; Petroleum remains a compatible incoming alias for PMS.


### Branch starting stock and pump prices

“Total Meter” is the sum of the most recent **received delivery quantity per fuel** at the selected branch. Selecting a fuel shows only its latest received quantity. This is a starting-stock figure, not a lifetime cumulative dispenser reading. New receipts replace the starting quantity shown, preserve transaction history, and never reset physical meters. Expected selling value uses the latest observed branch pump price. Missing price observations remain unknown; national averages are not treated as live branch prices. The browser preview contains three branches with clearly documented sample prices, not verified live market prices.

Authenticated provider endpoints (same bearer token as transaction ingestion):

```http
POST /api/ingestion/deliveries
Authorization: Bearer <INGESTION_API_KEY>
Content-Type: application/json
```

```json
{"external_delivery_id":"DEL-001","station_id":"ST001","fuel_type":"Petrol","litres":"20000.000","received_at":"2026-11-07T09:00:00Z","status":"RECEIVED","selling_price_per_litre":"900.00","order_reference":"ORDER-001","source":"external-api"}
```

Only actual received deliveries qualify; planned orders do not change starting stock. Optional `tank_id` maps a receipt to physical stock reconciliation; optional `stock_after_delivery_litres` is a provider-measured post-delivery stock reading. A receipt quantity alone does not replace an observed tank level: remaining stock preserves carryover and adds mapped deliveries after the latest gauge reading. Unmapped receipts flag reconciliation review. Delivery-volume notifications trigger at 80% of the latest receipt volume dispensed and restart on the next receipt; this differs from a physical low-stock measurement.

```http
POST /api/ingestion/prices
Authorization: Bearer <INGESTION_API_KEY>
Content-Type: application/json
```

```json
{"external_price_id":"PRICE-001","station_id":"ST001","fuel_type":"Petrol","price_per_litre":"950.00","effective_at":"2026-11-07T10:00:00Z","source":"external-api"}
```

Explicit pump transaction prices are also retained as branch price observations. Price changes revalue starting stock without rewriting historical sales. Both feeds validate registered branch/fuel mappings, audit raw payloads, reject conflicting IDs, and support replay through the ingestion event endpoint. No attendant entry forms are needed. Delivery records and starting-stock summaries are CSV exportable.


### Profile, preferences and fixed navigation

The top-right initials open Profile. Name, contact email and phone save through authenticated `GET/POST /api/account`; contact email does not change sign-in credentials. This remains a single owner workspace using the existing shared administrator session, not a new multi-user authentication system. `WorkspaceProfile` stores company owner contact details and preferences in PostgreSQL; apply migrations before starting the database-backed app. In the public browser preview, the same account records persist in IndexedDB.

Settings separates Preferences from Branch & pumps. Motion, compact report rows and three in-app notification categories are functional saved preferences; they do not change pump data, price feeds, ingestion, or underlying operational alerts. Operating currency remains NGN and the business reporting timezone remains Africa/Lagos.

The page has a dedicated scroll region between the header and an opaque bottom navigation dock. Reports use explicit horizontal and vertical cell borders. `scripts/account-check.ts` verifies profile saves across reloads, preferences and notification effects, report grid lines and the non-overlapping navigation boundary. `scripts/account-api-check.ts` checks API authentication, persistence, validation and cross-site request rejection against a local database-backed server; it restores the original profile afterwards.

Reference patterns: [Linear profile](https://linear.app/docs/profile), [Linear preferences](https://linear.app/docs/account-preferences), and [Vercel account/workspace dashboard structure](https://vercel.com/academy/optimize-your-vercel-account/tour-the-dashboard). These inform information grouping, not copied screens or a claim of feature parity.

### Wallet-style owner interface

Home uses a wallet-style sales summary and fuel asset list. The prominent naira figure is calculated sales for the selected date range, not a bank balance or evidence of payment collection. Fuel rows show **estimated remaining litres**, valued at the latest observed branch pump price; absent or invalid tank readings remain unknown. The separate Starting stock disclosure retains Total Meter as latest received delivery quantities and their expected selling value.

Home includes a complete Activity ledger of sales and received deliveries, grouped by Nigerian calendar date. Owners can select any date range, filter by fuel and event type, search references/pumps, paginate, inspect original record/event details, and export precisely the filtered activity as CSV. A delivery's naira figure means expected selling value at receipt, not revenue. Reports keep their existing tables and grid lines. Profile, saved preferences, notifications and the non-overlapping bottom dock remain available. This is an interface pattern only: no blockchain wallet, crypto custody, payment processing or wallet connection is added.

Verification: `npm test` includes wallet value/quantity separation, unknown-reading handling, activity ordering and CSV safety. `scripts/wallet-check.ts` (also invoked by `scripts/owner-check.ts`) verifies the full browser owner journey. Set `DEMO_BASE_URL` to test a local or deployed preview.


### Home activity, sign-out and reading labels

All activity filters, pagination, individual sale details and CSV export now live directly on Home. Bottom navigation has five destinations: Home, Meters, Reports, Ask and Settings. There is no separate Activity destination. Sign out is the last action in Profile and clears the authenticated session; in the isolated browser preview it exits the workspace without deleting stored preview records.

Meters now use the same visible horizontal and vertical grid as Reports. Pump readings are cumulative **litres**, not delivery quantities or metres of distance. The owner-facing report “Pump readings vs recorded sales” compares closing minus opening cumulative litres with recorded transaction litres. Missing boundaries and resets remain explicit exceptions. “Sales by pump hose” groups totals by physical nozzle/hose identifier; individual purchases are listed in Home activity and do not imply identified customers.


### Home view tabs

Home defaults to Fuel balances, with Activity as a second underlined tab in the same page. The activity ledger is rendered only when selected; switching views preserves the chosen dates and activity filters. Both tabs support arrow-key navigation. Bottom navigation is Home, Meters, Ask, Reports, Settings.

### Compact controls, report tabs, charts and Ask

The branch selector and date picker share one row on Home. Manual refresh buttons and the owner/data-refresh footer text have been removed; background polling continues.

Reports now separates Sales, Pumps, Hoses and Readings into individual tabs. Sales contains one line chart of recorded naira sales, with compact 24H / 7D / 30D controls and All / P / D / K fuel filters (Petrol, Diesel, Kerosene). 24H is a rolling 24-hour window for today, or the selected whole historical day. 7D/30D are Nigerian calendar days ending on the selected day, with today partial to the latest refresh. Chart bucket totals use exact decimal arithmetic; numeric conversion is only for plotting. CSV exports match the selected chart buckets and fuel. Missing sale events cannot be inferred from a chart; reconciliation remains in Readings.

Notification-category switches have been removed from Settings. The notification bell always shows reorder, daily-sales and sales-growth alerts; old saved category flags do not suppress these messages. Motion and compact-table preferences remain available.

Ask supports everyday sales wording such as “How much did we make today?”, last 7 days, all-time sales and fuel-specific quantities. “Since we filled/full/refilled the tank” uses the latest recorded received delivery separately per fuel, with litres, historical calculated sale value and purchase count. A new received delivery restarts this cycle without erasing history. Missing delivery records are explicit; no refill is inferred from a cumulative pump counter. Ask answers are station-scoped and clear when switching branches. “Make” means calculated sales, not profit or settled payment collections.

Verification includes `scripts/reports-chart-check.ts`, `scripts/ask-check.ts`, exact range/fuel/bucket tests, and received-delivery question tests.

### Controller fuel prices and expected sales

Use **Settings → Fuel prices** to edit Petrol, Diesel or Kerosene for the selected branch. Each change appends a `StationFuelPrice` record with effective time, creation timestamp, origin and creator metadata. Shared-admin authentication currently provides controller permission; no individual User identity is available, so the audit records “Station controller” with a null user ID. `stationController` / `canManagePrices` isolate the permission resolver for future per-user roles. The public preview explicitly permits its demo controller and stores changes in its existing IndexedDB workspace.

Times in the editor are **Africa/Lagos (WAT)**. Changes may apply now or be scheduled. Past times older than two minutes are rejected; a near-current submitted timestamp is normalized to server time so a slow form submission cannot backdate a change. Future observed readings are rejected. Controller prices take precedence over later provider price observations for expected valuation; explicitly supplied transaction prices remain stored on their original transactions. Old global price-edit endpoints are disabled; the existing global price history remains a legacy baseline for old data.

**Meters** shows cumulative opening/closing litres, current price and effective time, meter-derived expected sales and the price periods used. **Reports → Shift** supports a custom period, actual observed opening/closing readings, separate cash/POS/transfer receipts, totals, signed variance, saved shifts and CSV export. Amounts are not inferred from litres or assigned payment methods automatically. Blank receipts are unknown; enter 0 explicitly when none was received. Closing a completed, fully valued shift stores an immutable calculation snapshot, including the source reading IDs, price IDs and segments. Receipt adjustments remain auditable while locked expected sales stay unchanged.

Expected litres are closing minus opening cumulative readings. Expected sales sums each segment’s litres multiplied by its applicable historical price, using integer decimal arithmetic and half-up monetary rounding. A price change within the period **requires an observed cumulative reading at that exact effective timestamp**. The price editor accepts optional current change-time readings; future changes require later provider readings. Missing readings, prices, resets, corrections or conflicting readings leave expected totals and variance unavailable rather than applying one price to the whole shift. No interpolation is performed. A saved shift must be reopened with its exact saved period (or chosen from Saved shift) to see its locked snapshot.

The app does not connect demo pumps, bank accounts, POS terminals or payments. Existing transaction reports retain captured historical prices; remaining-stock valuation uses the current configured selling price and remains separate from meter-derived sales and receipt reconciliation.

New endpoints: authenticated/controller-scoped `GET/POST /api/controller/pricing` and `GET/POST /api/controller/shift`. Apply `202611070006_controller_prices_shifts` with `npm run db:migrate` for the PostgreSQL app. Price history and shift records persist across reloads in both storage modes.

Ask now presents general sales questions as a column table: Petrol, Diesel, Kerosene and Total, with litres, calculated sales and purchase rows. Home/Meters headings and the top-right profile button are removed; Profile remains under Settings. Motion adds restrained card depth and press feedback, automatically respecting the device reduced-motion preference.

Validation: valuation unit tests, controller/permission/database integration tests, `scripts/controller-check.ts` and the existing ingestion suite. Run `DEMO_BASE_URL=<local-or-live-url> node --import tsx scripts/controller-check.ts` for the owner/controller browser journey.

### Reports wallets, delivery breakdown and themes

Reports starts with a wallet selector and date control. **Overall wallet** combines only the authorised company branches; individual wallets isolate their branch. Pump/hose identifiers remain scoped by branch in company tables and CSV. Overall Shift is read-only; choose a branch to enter or reconcile its shifts.

The first Reports card is **Latest received deliveries**: the latest received delivery of each fuel per branch, as of the selected report date. It is neither opening inventory nor cumulative dispenser volume. The visible fuel breakdown shows litres received × the branch selling price effective at that date. Lekki starts with Petrol 20,000 L × ₦900 = ₦18m, Diesel 30,000 L × ₦1,200 = ₦36m, Kerosene 50,000 L × ₦1,000 = ₦50m: 100,000 L and ₦104m. Overall sums branch valuations; mixed prices are labelled per branch rather than applying a single rate. This expected selling value is separate from historical sales and actual receipts.

**Settings → Preferences → Theme** saves Light or Dark in the existing account persistence layer. A local cache applies the chosen theme before the page paints. Motion is automatic; the old Motion switch is removed and OS reduced-motion remains supported. Price history has row and column grid lines. Browser checks: `scripts/wallet-reports-check.ts` and `scripts/theme-check.ts` (mobile journeys, saved theme, and rendered text contrast across the primary screens).

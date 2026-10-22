# Al Farooq Hardware POS (Pakistan POC)

Existing Next.js business screens with an online Neon database and shared Smart Entry. This is a demo/testing app; the existing PIN and view modes are unchanged.

## Setup

1. Install Node.js 20.9+ and run `npm ci`.
2. Copy `.env.example` to `.env.local`. Set only `DATABASE_URL` (Neon Postgres connection string) and `OPENAI_API_KEY`. Optional model overrides are documented there. Never commit credentials.
3. Run `npm run db:migrate`. This enables `pg_trgm` and creates the `hardware` schema. Older public mirror tables are preserved, and are no longer read or written.
4. Run `npm run db:seed` to replace the hardware workspace with deterministic demo records anchored on **2026-10-23**. To shift the demo dates, use `npm run db:seed -- 2026-11-01`. The same anchor produces the same records. This resets only the hardware workspace.
5. Run `npm run dev`, open http://localhost:3000 and use the existing demo PIN **12345**. For production build testing: `npm run build` then `npm start`.

Settings > Data & storage > **Reset & seed demo data** downloads a safety backup and reseeds relative to today's Pakistan date after explicit confirmation.

## What changed

Before: `lib/db.ts` loaded/saved localStorage; AI scan and voice changes were mirrored to Neon independently. Products and inventory share `InventoryView`, purchases use `PurchasesView`, sales use `PosView` and invoices; customers and suppliers have management screens. Scan Bill was above Purchases; Voice Sale was inside POS.

Now: all business reads and saves go through `/api/database`. Tables in the `hardware` schema store products, suppliers, customers, purchases/items, sales/items, expenses, stock movements and learned aliases. Generated SQL columns expose the existing form payload's name, variant, units, prices, stock and balances without a second independently maintained copy. `app_state` stores other existing modules and an optimistic revision. A row lock serializes saves and a revision conflict rejects stale clients rather than overwriting newer work. Every stock change and the corresponding business records commit in the same transaction; movement sums are checked before commit. Opening/adjustment movements retain the audit history. The browser holds only the loaded working snapshot in memory. Service worker registration is removed and legacy caches are retired.

The POC uses a full-workspace transactional save adapter to preserve the existing forms, rather than implementing dozens of separate CRUD interfaces. Stock is in base units. Unit factors are per product, such as coil = 90 foot, pipe length = 10 foot, screw box = 100 pieces. Changing an established base unit is rejected. Existing manual entry remains on the same screens below Smart Entry. The old manual POS/invoice forms sell in base units; the shared Smart Entry supports mixed units.

## Smart Entry

`components/smart-entry.tsx` supports `product_list`, `purchase_bill`, `sale_list`, `stock_count`. It appears at the top of Products, Purchases, POS, and their relevant create/adjust screens. Dashboard actions and the floating AI button open the relevant mode. Upload up to five images, use the camera, record up to 60 seconds of speech, paste text, or choose Manual entry. Images are resized to maximum 1600px JPEG in the browser. Input images/audio are processed in memory and never persisted by Smart Entry.

`POST /api/ai/extract` transcribes audio first, then uses the same structured parser as text; images use vision. OpenAI keys stay server-side. The response is validated with Zod; missing values remain null. English, Urdu and Roman Urdu are supported, with Urdu names transliterated. Matching uses aliases, normalized exact names, pg_trgm and token overlap; differing numeric variants are not treated as a confident match. Suggested IDs from the model are validated and remain suggestions. Millimetres and inches are not silently equated.

Review source thumbnails next to the editable table. Search/select an existing product or create a new one, edit values, configure unit conversions under Product details, add/delete rows, and check warnings/totals. **Extraction never saves.** Only Approve & Save calls `/api/ai/approve`. Approval revalidates IDs, units and values, updates stock/balances/aliases in one transaction, and uses an idempotency key to avoid duplicate saves on retry. A sale opens a printable receipt. Invalid units block saving; negative stock is allowed with a warning. Purchases are recorded unpaid; expense lines are included in supplier payable without changing stock.

## Six-step demo

1. Dashboard > **Scan Bill**. Upload `sample-bills/01-purchase-bill.jpg`. The bill includes catalog pipe/wire, two new products and delivery expense. Check the matched unit conversions and warnings.
2. Review every row, supplier and total, then **Approve & Save**. Verify new products, supplier payable, stock and learned aliases. Scanning again should match the learned names; cancel that second draft to avoid a second purchase.
3. Products > Smart Entry (or **Add Stock / Product** on dashboard). Upload `sample-bills/02-price-list.jpg`. Review existing PVC price plus new tap/clips, unit conversions and opening quantities, then approve.
4. POS > **Speak**. Say: "Ahmed Contractors, credit sale: Copper wire 2.5mm two coil, PVC pipe 1 inch thirty feet, Screw 1 inch one box." Stop, review the conversion `2 coil = 180 foot`, choose the customer and approve. Inspect/print the receipt. Microphone needs HTTPS or localhost and browser permission; paste the same sentence if a microphone is unavailable.
5. Products > Stock (or floating AI on stock page). Upload `sample-bills/03-stock-count.jpg`. Confirm these are absolute counts: cement 40 bags, wire six coils, pipe 18 lengths, screws seven boxes. Approve; movement quantity is the difference from current stock. For a customer image order, use `04-customer-list.jpg` in sale mode.
6. Return to dashboard. Check current sales, receivables, stock, low-stock alerts, recent transactions and AI Activity. Reload records (or use another browser session) to verify the same Neon state.

## Validation

- `npm run lint`: TypeScript check.
- `npm run test:smart`: deterministic seed, numeric normalization, movement sums, supplier/customer balances, mixed units, new products/parties, expenses, credit receipt, counts, aliases, invalid inputs and negative stock.
- `npm run test:db`: actual Neon integration, including pg_trgm, normalized purchase items, transactional stock balance, stale revisions and rollback. The entire test rolls back; it does not replace the workspace. Run migration first.
- `npm run build`: production compilation and TypeScript validation.
- `node tests/live-extraction.cjs`: with localhost:3000 running, performs real OpenAI calls for all four sample images; verifies extraction does not save. Uses API credits.
- `node tests/approval-smoke.cjs`: disposable POC workflow only; exercises approval/retry/conflict and then resets the hardware workspace to demo data. Do not run this against real business records.

Reports now use the loaded Neon records; the previous hardcoded sample-only report mode is disabled. The report helper and backup validation regression tests also pass.

## Limitations

POC only: the unchanged PIN is a browser privacy lock, not server authentication. Full-workspace saves suit a small demo and reject concurrent stale edits; reload and review again after a conflict. No queues, returns expansion, multi-store, role changes, stored scan images, or new discounts are implemented. Legacy manufacturing screens remain available for compatibility but the seed contains no food/manufacturing records. Legacy manual forms retain their base-unit workflow. Unknown units require an explicit product conversion; missing extracted amounts need review and are not guessed. Scans/voice depend on connectivity, an accessible OpenAI model, readable input and human review. Seed prices are illustrative Pakistani demo prices, not current market quotations. Catalog artwork uses a neutral hardware illustration. Browser microphone capture and physical printing depend on device support.

OpenAI integration follows the official [Structured Outputs guide](https://developers.openai.com/api/docs/guides/structured-outputs) and [speech transcription guide](https://developers.openai.com/api/docs/guides/speech-to-text).

## File map

- Shared entry/review: `components/smart-entry.tsx`, `app/smart-entry.css`, `lib/smart-schema.ts`, `lib/smart-apply.ts`.
- AI endpoints: `app/api/ai/extract/route.ts`, `app/api/ai/approve/route.ts`; shared server transport: `lib/ai-server.ts` and number normalization: `lib/ai-schema.ts`.
- Online storage: `lib/online-db.ts`, `lib/online-schema.ts`, `lib/db.ts`, `app/api/database/route.ts`, `app/api/[...resource]/route.ts`.
- Migration/seed/reset: `migrations/002_hardware.sql`, `lib/demo-seed.ts`, `scripts/migrate-ai.cjs`, `scripts/seed-demo.cjs`, `scripts/ts-loader.cjs`, `app/api/demo/reset/route.ts`.
- UI integration: BusinessApp, DashboardView, InventoryView, PurchasesView, PosView, InvoicesView, SettingsView and ReportsView; catalog imagery, PDF profile access, and visible branding across existing screens.
- Offline retirement: `app/layout.tsx`, `public/sw.js`; previous mirror/scan/transcription routes now return 410, directing callers to the shared pipeline. Old AI component entrypoints re-export Smart Entry.
- Branding: `app/manifest.ts`, `public/manifest.webmanifest`, `public/hardware-logo.svg`, `public/images/hardware-catalog.svg`.
- Demo inputs: four JPEGs in `sample-bills/`. Tests: `smart-entry.cjs`, `online-db.cjs`, `live-extraction.cjs`, `approval-smoke.cjs`, plus updated backup/report regressions.
- Package scripts/metadata: `package.json`, `package-lock.json`; build type errors are enforced in `next.config.mjs`. Required environment placeholders remain in `.env.example`.

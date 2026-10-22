# AL FAROOQ FOODS

Existing Next.js 16.3 / React 19 App Router application with Tailwind 4, custom/Base UI components, Lucide, and Recharts. Modules switch on the root page. Data lives in one localStorage document: products, raw materials, purchases/items, invoices/items, suppliers, customers, expenses, accounts and ledgers. Existing purchase forms optionally add stock; ordinary POS sales clamp remaining stock at zero. Voice sales allow negative stock with a warning.

## AI Features

The existing-app brief takes precedence over the separate hardware-store brief. No hardware seed, separate app, auth changes, or replacement dashboard is introduced.

1. Install Node.js 20.9+ and run `npm install` in this directory.
2. Copy `.env.example` to `.env.local`; set `OPENAI_API_KEY` and `DATABASE_URL` (Neon). An existing `.env` here also works. The Desktop parent `.env` is not automatically loaded by Next.js.
3. Optional server model settings: `OPENAI_VISION_MODEL`, `OPENAI_TEXT_MODEL`, `OPENAI_STT_MODEL`. Defaults are shown in `.env.example`.
4. Run `npm run db:migrate` once to create the mirror tables using plain SQL and the Neon WebSocket Pool driver.
5. Run `npm run dev`, open http://localhost:3000. Existing PIN behavior is unchanged.
6. Run `npm run lint` and `npm run build` for validation; `npm run test:ai` checks matching, numeric normalization, purchase approval, and stock audit invariants.
7. After building, `node tests/api-smoke.cjs` starts a temporary local server on port 3017 and checks invalid API inputs plus a real empty Neon transaction. It creates no business records.

### Test Scan Bill

Open Purchases & Expenses or use Dashboard → Scan Bill. Upload a handwritten/printed English or Urdu bill. The browser creates a JPEG at most 1600px across. Wait for editable rows. Check supplier match, date, quantity, unit, rates, amounts and kind. Choose an existing stock item or create new; correct amber amount mismatches. Missing quantities must be filled. Add/delete rows as needed. Cancel should leave all records unchanged. Approve & Save should increase stock, create missing items/supplier, record expense rows without stock, add an unpaid purchase and supplier payable/ledger. Check the summary, inventory, purchases, dashboard and expense module. Expense lines are pending, not cash disbursements.

### Test Voice Sale

Open POS Sales or Dashboard → Voice Sale. On HTTPS or localhost, press Speak, grant microphone access, speak “Haji Noor Muhammad ko 10 carton mineral water 500ml aur 5 carton mango juice, udhaar”, then Stop recording. Recording stops automatically at 60 seconds. Edit the transcript and parse again if needed. Select unmatched products and the customer; credit requires an existing customer. Check quantities and units (no conversion), then Use draft in POS. This replaces the current cart; it does not save. Edit rates/quantities in the existing POS. Review checkout payment status, then confirm using the existing checkout. Check the existing receipt/print option, reduced stock, customer receivable/ledger and AI Activity. An oversold voice item warns and may go negative.

### Data and limitations

Local-first path: approval saves the full local document, including stock movements, in a single localStorage write. The central save handler audits stock deltas for every module (purchase/sale/adjust). Approved scans and confirmed voice sales also send a minimal, image-free projection to `/api/mirror`; its purchase/sale, line-item, inventory and movement writes run in one Neon transaction. No images or audio are stored by this app; media is sent to OpenAI for processing. API requests use server-only keys, strict structured output and Zod validation. See [structured output documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat) and [transcription documentation](https://developers.openai.com/api/docs/guides/speech-to-text).

Neon failure never undoes local approval: a small status says “not synced”. There is no retry queue, historical backfill or cross-device synchronization. Only new AI approvals are mirrored; ordinary existing forms remain local. Supplier/customer ledgers stay local. The mirror is a single-store POC, not an authoritative inventory database; stock is mirrored as the browser snapshot. Concurrent browser tabs/devices are unsupported. Do not use production data in an unauthenticated public POC.

AI needs internet; existing manual/offline flows continue working when AI is unavailable. Bill totals are preserved even if they differ from line sums; users must review missing prices, totals, units and matches. New item prices default to zero until manually edited. New suppliers only receive their provided name; other required fields use empty/default values. AI Activity counts approved scans/confirmed voice sales, not failed/cancelled attempts. Dates use the existing app's UTC date convention. Scan images must be readable by the browser (convert HEIC to JPEG if needed).

## Changed files

- Added API routes: `app/api/scan-bill/route.ts`, `app/api/transcribe/route.ts`, `app/api/parse-sale/route.ts`, `app/api/mirror/route.ts`.
- Added UI: `components/ai-bill.tsx`, `components/ai-voice.tsx`.
- Added helpers: `lib/ai-schema.ts`, `lib/ai-server.ts`, `lib/ai-purchase.ts`, `lib/stock-audit.ts`, `lib/mirror-client.ts`, `lib/mirror-schema.ts`.
- Added database/setup/tests: `migrations/001_ai.sql`, `scripts/migrate-ai.cjs`, `tests/ai.cjs`, `tests/api-smoke.cjs`, `README.md`.
- Updated `components/business-app.tsx`, `components/pos-view.tsx`, `lib/db.ts`, `app/globals.css`, `.env.example`, `.gitignore`, `package.json`, `package-lock.json`. Next.js regenerated `next-env.d.ts` during the build.
- Normalized `DATABASE_URL` in ignored `.env`; credentials are absent from `.env.example`.

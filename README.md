# Land-title monitoring & verification-as-a-service

- **Concept:** A subscription that goes beyond a one-off ArdhiSasa land search — actively monitoring a specific title and alerting the owner if any transaction, caution, or change is filed against it, aimed at absentee and diaspora landowners worried about fraud.
- **Evidence of demand:** Kenyan sources describe land title fraud, forged documents, and double allocation as serious, ongoing problems, with guides warning buyers about a "Sh1 billion fraud trap" and detailing multi-step manual verification processes; diaspora owners are especially exposed since they can't easily check on their land in person.
- **Kenya landscape:** ArdhiSasa (the government's digital land platform) provides one-off, per-search verification for roughly KSh 500–1,000 a search; separately, some due-diligence firms offer manual, one-time verification services to property buyers. No ongoing monitoring/alert layer sitting on top of that data was found.
- **Opportunity:** A subscription product that turns a one-time search into continuous protection — a genuinely different product from what exists today, not a copy of it.
- **Target customers:** Diaspora landowners (the highest-anxiety, most underserved segment), absentee landlords, and banks/SACCOs doing ongoing collateral checks.
- **Revenue model:** Annual subscription per title monitored, tiered for owners with multiple properties.
- **Difficulty:** Medium–High — depends on reliable access to ArdhiSasa data (no public API is confirmed to exist, so this may require a formal data-access partnership rather than scraping); getting a fraud alert wrong or late carries real reputational and legal risk.
- **Scalability:** Low–Medium — land registry systems are highly country-specific, so this doesn't travel easily.
- **Risks:** Government data-access dependency is the central risk; needs to build genuine trust quickly in a category full of past scams.
- **MVP:** Start manual — offer a paid "title search + verification report" service via ArdhiSasa on behalf of diaspora clients, then automate re-checks and alerts once demand is proven.

---

Source: `PROJECTS.md` (Online Business Models: Proven Abroad, Underdeveloped in Kenya).


---

## Stack & dev

Scaffolded as a Next.js 16 + Drizzle (Postgres) app. The schema in `src/db/schema.ts` is the current source of truth for the data model; auth and payment integrations are not yet wired up.

Requires Node.js 20.19.0 or later, or Node.js 22.9.0 or later. Earlier versions do not support the `--env-file-if-exists` flag used by `db:migrate` and `db:seed`.

```
npm install
# point .env at a Postgres instance, see .env.example
npm run db:generate   # drizzle-kit: emit SQL migrations from the schema
npm run db:migrate    # apply migrations (scripts/migrate.ts)
npm run db:seed       # optional: seed demo data (scripts/seed.ts)
npm run dev           # Next.js dev server on :3000
```

What is here:
- `src/db/schema.ts` — Drizzle Postgres schema specific to this domain
- `src/db/index.ts` — pooled `pg` + Drizzle client
- `src/app/layout.tsx` + `src/app/page.tsx` — minimal Next.js App Router scaffold
- `scripts/migrate.ts`, `scripts/seed.ts` — database migration and seed scripts
- `drizzle.config.ts`, `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`
- `src/app/globals.css`, `.gitignore`, `.env.example`

What is still a stub:
- Auth (sessions, password reset, email verify).
- Payments (M-Pesa Daraja / Paystack / card).
- Product UI and monitoring/alerting flows beyond the initial schema and landing page.

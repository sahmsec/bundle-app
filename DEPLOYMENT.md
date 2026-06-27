# Deployment & Production Runbook

This app is a **stateless** React Router server backed by **PostgreSQL**, plus
two Shopify-deployed surfaces (the theme app extension and — for customized
bundles — a Cart Transform Function). Scaling is "run more app instances behind a
load balancer"; the real ceiling is Postgres and Shopify API limits.

```
Shopify Admin ──(embedded, App Bridge)──► App server (N stateless instances)
Storefront    ──(app proxy /apps/...)────►        │
Shopify       ──(webhooks)───────────────►        ├─► PostgreSQL (managed)
Scheduler     ──(POST /api/cron)─────────►        │
                                          Shopify hosts: theme extension (CDN),
                                          Cart Transform Function (Wasm sandbox)
```

---

## 1. Prerequisites
- A **managed PostgreSQL** (Neon, Supabase, RDS, Fly Postgres, Render Postgres…).
- A host that runs a Docker container with a **public HTTPS URL** (Fly.io,
  Render, Railway, a VPS, Kubernetes…).
- A **Shopify Partner account** and the app created via the CLI (`npm run config:link`).

## 2. Database
- Use a **connection pooler** (PgBouncer / the provider's pooled URL). Each app
  instance holds a Prisma pool; without pooling you'll exhaust Postgres
  connections as you scale. Point `DATABASE_URL` at the **pooled** endpoint and,
  if the provider requires it, add `?pgbouncer=true&connection_limit=1`.
- Keep a **direct** (unpooled) URL for migrations if your provider separates them.

## 3. Migrations (do this once before first deploy)
The repo ships the schema but **not** a committed migration yet. Create it:
```bash
docker compose up -d                                   # local Postgres
npm run prisma -- migrate dev --name init              # generates prisma/migrations/*
# Add the R1 partial unique index as its own migration:
npm run prisma -- migrate dev --name bundle_handle_partial_unique --create-only
#   → paste prisma/sql/0001_bundle_handle_partial_unique.sql into the new migration.sql
npm run prisma -- migrate dev                           # apply locally
git add prisma/migrations && git commit -m "Add initial migration"
```
**In production**, apply with `prisma migrate deploy`. The Docker image does this
on boot (`docker-start`). For **multiple instances**, prefer a one-off release
step instead (so N containers don't race):
```bash
# release command (Fly: [deploy] release_command; Render: preDeploy; k8s: initContainer/Job)
npx prisma migrate deploy
```
…and change the container `CMD` to start the server only.

> Commit your lockfile: the template `.gitignore` excludes `package-lock.json`.
> For reproducible `npm ci` builds, remove that line and commit the lockfile.

## 4. Environment variables
| Var | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Postgres connection string |
| `SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` | App credentials (from Partner dashboard / `shopify app env`) |
| `SHOPIFY_APP_URL` | Public HTTPS URL of this app |
| `SCOPES` | `read_products,write_products,read_orders` |
| `CRON_SECRET` | Long random string guarding `POST /api/cron` |
| `NODE_ENV` | `production` |

## 5. Build & run (Docker)
```bash
docker build -t bundle-app .
docker run -p 3000:3000 --env-file .env bundle-app
```
The image is multi-stage (build deps stay out of the runtime layer) and runs as
the non-root `node` user.

## 6. Point Shopify at production
```bash
npm run deploy        # shopify app deploy — pushes config, extensions, functions
```
- Ensure `application_url`, `auth.redirect_urls`, and **`app_proxy.url`** in
  `shopify.app.toml` point to your production host (`<APP_URL>/proxy`).
- Re-running `deploy` after scope changes triggers managed re-consent on install.

## 7. Scheduler for the daily rollup
Wire something to `POST <APP_URL>/api/cron` daily with
`Authorization: Bearer $CRON_SECRET`. A ready-made GitHub Actions workflow is at
[.github/workflows/cron.yml](.github/workflows/cron.yml) (set repo secrets
`APP_URL`, `CRON_SECRET`). Or use your host's native cron.

---

## 8. App Store submission checklist
- [x] **Mandatory GDPR webhooks** — `customers/data_request`, `customers/redact`,
      `shop/redact` are implemented and declared.
- [x] **App uninstall handling** — `app/uninstalled` soft-marks the tenant.
- [x] **Webhook HMAC verification** — every handler uses `authenticate.webhook`.
- [x] **Least-privilege scopes** — only what's used.
- [x] **Billing** — not applicable; this app is **free**, so no Billing API is needed.
- [ ] **Listing assets** — icon, screenshots, demo video, privacy policy URL.
- [ ] **Test on a fresh dev store** — install → create → publish → buy → see analytics.
- [ ] **Performance** — embedded pages load fast; storefront widget doesn't block.

## 9. Billing
**Not applicable — this app is free.** No Billing API, no charge approval flow,
and nothing to gate. (If that ever changes, `shopifyApp` accepts a managed
`billing` config and `billing.require(...)` gates loaders — but that's out of
scope for a free app.)

## 10. Scaling notes (you said 50k+ merchants)
- **App tier** scales horizontally — it's stateless. Just add instances.
- **Postgres is the bottleneck.** Use pooling now; add **read replicas** for
  analytics reads later; the repository layer is the single seam to route them.
- **Move work off the request path**: the publish-operation poll and the rollup
  belong in a queue/worker at scale, not inline.
- **Switch analytics reads to `BundleDailyStat`** (the rollup output) for long
  ranges instead of scanning `BundleSale`.
- **Retention**: `/api/cron` already prunes `ProcessedWebhook`; consider archiving
  old `BundleEvent` rows too.

---

## 11. "Run it live" — end-to-end (ties all 10 phases together)
```bash
# 1. Local infra + first migration (Phases 2–3)
docker compose up -d
npm install
npm run prisma -- migrate dev --name init          # + inject the R1 partial index (§3)

# 2. Connect to your Partner account & launch (Phase 3)
npm run config:link
npm run dev                                          # opens the embedded app, token-exchange auth

# In the app (Phases 4–8):
#   • Dashboard loads (tenant Shop row created on install)
#   • Bundles → Create bundle → add products (resource picker) → Publish
#     (productBundleCreate makes a real, discounted bundle product)

# 3. Storefront (Phase 7): theme editor → add the "Bundle widget" app block to a
#    product template → confirm /apps/bundle-data returns JSON and the widget shows.

# 4. Analytics (Phase 9): place a test order containing a published bundle →
#    orders/create webhook records a BundleSale → /app/analytics lights up.

# 5. Customized bundles (Phase 8b): generate + build the Cart Transform Function
#    per extensions/bundle-cart-transform/README.md, then `npm run deploy`.
```
If each of those works in a dev store, all ten phases are verified live.

-- R1: enforce handle uniqueness only among LIVE (non-soft-deleted) bundles.
--
-- Prisma's schema DSL can't express a partial index, so after `prisma migrate
-- dev` generates the base migration (Phase 3), paste this statement into that
-- migration's `migration.sql` BEFORE applying it in CI/prod. Locally it can be
-- run once by hand. It is idempotent (IF NOT EXISTS).
--
-- Why partial: a plain UNIQUE(shopId, handle) collides with soft-delete — a
-- merchant who deletes "summer-box" then creates a new "summer-box" would hit a
-- constraint error against the dead row. Scoping uniqueness to deletedAt IS NULL
-- frees deleted handles for reuse while still preventing two live duplicates.

CREATE UNIQUE INDEX IF NOT EXISTS "Bundle_shopId_handle_live_key"
  ON "Bundle" ("shopId", "handle")
  WHERE "deletedAt" IS NULL;

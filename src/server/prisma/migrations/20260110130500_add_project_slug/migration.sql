-- Add globally unique, stable project slug for user-facing URLs.

-- 1) Add the column as nullable so we can backfill.
ALTER TABLE "project" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- 2) Backfill in a deterministic way: base slug from name, then suffix with -2, -3, ...
-- We approximate slugify in SQL:
-- - lower
-- - replace non [a-z0-9]+ with '-'
-- - trim '-' from ends
-- - ensure non-empty fallback 'project'
WITH normalized AS (
  SELECT
    id,
    COALESCE(
      NULLIF(
        trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')),
        ''
      ),
      'project'
    ) AS base_slug
  FROM "project"
),
ranked AS (
  SELECT
    id,
    base_slug,
    row_number() OVER (PARTITION BY base_slug ORDER BY id) AS rn
  FROM normalized
)
UPDATE "project" p
SET "slug" = CASE
  WHEN r.rn = 1 THEN r.base_slug
  ELSE r.base_slug || '-' || r.rn
END
FROM ranked r
WHERE p.id = r.id
  AND (p."slug" IS NULL OR p."slug" = '');

-- 3) Enforce uniqueness and NOT NULL.
CREATE UNIQUE INDEX IF NOT EXISTS "project_slug_key" ON "project"("slug");
ALTER TABLE "project" ALTER COLUMN "slug" SET NOT NULL;


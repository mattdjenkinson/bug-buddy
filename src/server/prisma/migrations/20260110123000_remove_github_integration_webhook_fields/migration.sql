-- Remove legacy per-project webhook and token fields.
-- Webhook is now configured globally on the GitHub App.

ALTER TABLE "github_integration"
  DROP COLUMN IF EXISTS "webhookId",
  DROP COLUMN IF EXISTS "webhookSecret",
  DROP COLUMN IF EXISTS "personalAccessToken",
  DROP COLUMN IF EXISTS "privateKey";


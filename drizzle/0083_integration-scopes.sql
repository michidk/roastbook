CREATE TABLE "oauth_grant_scopes" (
	"user_id" text NOT NULL,
	"client_id" text NOT NULL,
	"scopes" text[] NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_grant_scopes_user_id_client_id_pk" PRIMARY KEY("user_id","client_id")
);
--> statement-breakpoint
ALTER TABLE "integration_tokens" ALTER COLUMN "expires_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "integration_tokens" ADD COLUMN "token_prefix" text;--> statement-breakpoint
ALTER TABLE "integration_tokens" ADD COLUMN "scopes" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "integration_tokens" ADD COLUMN "last_used_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "oauth_grant_scopes" ADD CONSTRAINT "oauth_grant_scopes_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_grant_scopes" ADD CONSTRAINT "oauth_grant_scopes_client_id_oauth_client_client_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."oauth_client"("client_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Existing MCP tokens keep read access. Write access now also covers editing and
-- deleting, so owners grant it again per token instead of it being widened.
UPDATE "integration_tokens" SET "scopes" = ARRAY['brews:read', 'beans:read', 'roasters:read', 'gear:read', 'recipes:read', 'places:read', 'visits:read', 'methods:read', 'tags:read', 'stats:read']::text[] WHERE "kind" = 'mcp';
--> statement-breakpoint
-- Shottimer device tokens become API keys limited to the shottimer scope.
UPDATE "integration_tokens" SET "kind" = 'api', "scopes" = ARRAY['shottimer:read', 'shottimer:write']::text[] WHERE "kind" = 'shottimer';
--> statement-breakpoint
-- Device tokens issued before integration_tokens existed lived only on the
-- shottimer row (same SHA-256 hex hash); carry them over before dropping it.
INSERT INTO "integration_tokens" ("id", "user_id", "kind", "name", "token_hash", "scopes", "expires_at")
SELECT gen_random_uuid()::text, s."owner_id", 'api', 'Shottimer', s."token_hash", ARRAY['shottimer:read', 'shottimer:write']::text[], now() + interval '1 year'
FROM "shottimer" s
WHERE s."token_hash" IS NOT NULL
  AND EXISTS (SELECT 1 FROM "auth_users" u WHERE u."id" = s."owner_id")
  AND NOT EXISTS (SELECT 1 FROM "integration_tokens" t WHERE t."token_hash" = s."token_hash");
--> statement-breakpoint
ALTER TABLE "shottimer" DROP COLUMN "token_hash";

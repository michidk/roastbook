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
-- Existing MCP tokens keep what they could do: read everything, log brews.
UPDATE "integration_tokens" SET "scopes" = ARRAY['brews:read', 'brews:write', 'beans:read', 'roasters:read', 'gear:read', 'recipes:read', 'places:read', 'visits:read', 'methods:read', 'tags:read', 'stats:read']::text[] WHERE "kind" = 'mcp';

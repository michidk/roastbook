CREATE TABLE "ai_provider_credentials" (
	"user_id" text PRIMARY KEY NOT NULL,
	"base_url" text NOT NULL,
	"api" text NOT NULL,
	"encrypted_api_key" text NOT NULL,
	"vision_model" text NOT NULL,
	"research_model" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ai_provider_api_check" CHECK ("ai_provider_credentials"."api" in ('responses','chat-completions'))
);
--> statement-breakpoint
ALTER TABLE "ai_provider_credentials" ADD CONSTRAINT "ai_provider_credentials_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;
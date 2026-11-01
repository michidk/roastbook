CREATE TABLE "account_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"storage_path" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"available_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_id" text,
	"target_id" text,
	"action" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_passkeys" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"public_key" text NOT NULL,
	"user_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"counter" integer NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean NOT NULL,
	"transports" text,
	"aaguid" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_passkeys_credential_id_unique" UNIQUE("credential_id")
);
--> statement-breakpoint
CREATE TABLE "auth_rate_limits" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "auth_rate_limits_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'user' NOT NULL,
	"journal_initialized_at" timestamp with time zone,
	"deleting_at" timestamp with time zone,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "auth_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "instance_identity" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"default_user_id" text DEFAULT 'local' NOT NULL,
	"bootstrap_completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "integration_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "integration_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "brewing_methods" DROP CONSTRAINT "brewing_methods_name_unique";--> statement-breakpoint
ALTER TABLE "drink_option_groups" DROP CONSTRAINT "drink_option_groups_name_unique";--> statement-breakpoint
ALTER TABLE "drink_types" DROP CONSTRAINT "drink_types_name_unique";--> statement-breakpoint
ALTER TABLE "media_cleanup_jobs" DROP CONSTRAINT "media_cleanup_jobs_storage_path_unique";--> statement-breakpoint
ALTER TABLE "taste_tags" DROP CONSTRAINT "taste_tags_name_unique";--> statement-breakpoint
DROP INDEX "bean_images_one_thumbnail_idx";--> statement-breakpoint
DROP INDEX "brewing_method_drink_types_method_type_idx";--> statement-breakpoint
DROP INDEX "cafe_visit_drink_options_visit_value_idx";--> statement-breakpoint
DROP INDEX "cafe_visit_taste_tags_visit_tag_idx";--> statement-breakpoint
DROP INDEX "drink_option_values_group_name_idx";--> statement-breakpoint
DROP INDEX "drink_type_option_groups_type_group_idx";--> statement-breakpoint
DROP INDEX "espresso_machine_setting_revisions_current_kind_idx";--> statement-breakpoint
DROP INDEX "gear_images_one_thumbnail_idx";--> statement-breakpoint
DROP INDEX "gear_set_accessory_gear_set_gear_idx";--> statement-breakpoint
DROP INDEX "recipe_accessory_gear_recipe_gear_idx";--> statement-breakpoint
DROP INDEX "recipe_drink_options_recipe_value_idx";--> statement-breakpoint
DROP INDEX "recipes_client_operation_id_unique";--> statement-breakpoint
DROP INDEX "recipes_sync_id_unique";--> statement-breakpoint
DROP INDEX "brew_accessory_gear_brew_gear_idx";--> statement-breakpoint
DROP INDEX "brew_drink_options_brew_value_idx";--> statement-breakpoint
DROP INDEX "brew_images_client_operation_id_unique";--> statement-breakpoint
DROP INDEX "brew_taste_tags_brew_tag_idx";--> statement-breakpoint
DROP INDEX "brews_client_operation_id_unique";--> statement-breakpoint
ALTER TABLE "client_operations" DROP CONSTRAINT "client_operations_pkey";--> statement-breakpoint
ALTER TABLE "mcp_settings" DROP CONSTRAINT "mcp_settings_pkey";--> statement-breakpoint
ALTER TABLE "settings" DROP CONSTRAINT "settings_pkey";--> statement-breakpoint
ALTER TABLE "shottimer" DROP CONSTRAINT "shottimer_pkey";--> statement-breakpoint
--> statement-breakpoint
--> statement-breakpoint
--> statement-breakpoint
--> statement-breakpoint
ALTER TABLE "ai_request_logs" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_usage" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "basket_details" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "bean_images" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "bean_purchases" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "brewer_details" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "brewing_method_drink_types" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "brewing_methods" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "cafe_visit_drink_options" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "cafe_visit_images" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "cafe_visit_taste_tags" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "cafe_visits" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "client_operations" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "coffee_shop_images" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "coffee_shops" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "drink_option_groups" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "drink_option_values" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "drink_type_option_groups" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "drink_types" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "espresso_machine_details" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "espresso_machine_setting_revisions" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "gear" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "gear_images" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "gear_property_evidence" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "gear_set_accessory_gear" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "gear_sets" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "grinder_details" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "kettle_details" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "mcp_audit_events" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "mcp_settings" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "media_cleanup_jobs" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_accessory_gear" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "recipe_drink_options" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "replication_changes" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "roasters" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "scale_details" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "brew_accessory_gear" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "brew_drink_options" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "brew_images" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "brew_taste_tags" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "brews" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "shottimer" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "tamper_details" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "taste_tags" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "wdt_details" ADD COLUMN "owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL;--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_passkeys" ADD CONSTRAINT "auth_passkeys_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_tokens" ADD CONSTRAINT "integration_tokens_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_jobs_claim_idx" ON "account_jobs" USING btree ("status","available_at");--> statement-breakpoint
CREATE INDEX "auth_accounts_user_id_idx" ON "auth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_passkeys_user_id_idx" ON "auth_passkeys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_verifications_identifier_idx" ON "auth_verifications" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "integration_tokens_user_id_idx" ON "integration_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_request_logs_owner_id_idx" ON "ai_request_logs" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "ai_usage_owner_id_idx" ON "ai_usage" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "basket_details_owner_id_idx" ON "basket_details" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "bean_images_owner_id_idx" ON "bean_images" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "bean_purchases_owner_id_idx" ON "bean_purchases" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "beans_owner_id_idx" ON "beans" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "brewer_details_owner_id_idx" ON "brewer_details" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "brewing_method_drink_types_owner_id_idx" ON "brewing_method_drink_types" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "brewing_methods_name_unique" ON "brewing_methods" USING btree ("owner_id","name");--> statement-breakpoint
CREATE INDEX "brewing_methods_owner_id_idx" ON "brewing_methods" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "cafe_visit_drink_options_owner_id_idx" ON "cafe_visit_drink_options" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "cafe_visit_images_owner_id_idx" ON "cafe_visit_images" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "cafe_visit_taste_tags_owner_id_idx" ON "cafe_visit_taste_tags" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "cafe_visits_owner_id_idx" ON "cafe_visits" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "client_operations_owner_id_idx" ON "client_operations" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "coffee_shop_images_owner_id_idx" ON "coffee_shop_images" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "coffee_shops_owner_id_idx" ON "coffee_shops" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "drink_option_groups_name_unique" ON "drink_option_groups" USING btree ("owner_id","name");--> statement-breakpoint
CREATE INDEX "drink_option_groups_owner_id_idx" ON "drink_option_groups" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "drink_option_values_owner_id_idx" ON "drink_option_values" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "drink_type_option_groups_owner_id_idx" ON "drink_type_option_groups" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "drink_types_name_unique" ON "drink_types" USING btree ("owner_id","name");--> statement-breakpoint
CREATE INDEX "drink_types_owner_id_idx" ON "drink_types" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "espresso_machine_details_owner_id_idx" ON "espresso_machine_details" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "espresso_machine_setting_revisions_owner_id_idx" ON "espresso_machine_setting_revisions" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "gear_owner_id_idx" ON "gear" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "gear_images_owner_id_idx" ON "gear_images" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "gear_property_evidence_owner_id_idx" ON "gear_property_evidence" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "gear_set_accessory_gear_owner_id_idx" ON "gear_set_accessory_gear" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "gear_sets_owner_id_idx" ON "gear_sets" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "grinder_details_owner_id_idx" ON "grinder_details" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "kettle_details_owner_id_idx" ON "kettle_details" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "mcp_audit_events_owner_id_idx" ON "mcp_audit_events" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "mcp_settings_owner_id_idx" ON "mcp_settings" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_cleanup_jobs_storage_path_unique" ON "media_cleanup_jobs" USING btree ("owner_id","storage_path");--> statement-breakpoint
CREATE INDEX "media_cleanup_jobs_owner_id_idx" ON "media_cleanup_jobs" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "recipe_accessory_gear_owner_id_idx" ON "recipe_accessory_gear" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "recipe_drink_options_owner_id_idx" ON "recipe_drink_options" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "recipes_owner_id_idx" ON "recipes" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "replication_changes_owner_id_idx" ON "replication_changes" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "roasters_owner_id_idx" ON "roasters" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "scale_details_owner_id_idx" ON "scale_details" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "settings_owner_id_idx" ON "settings" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "brew_accessory_gear_owner_id_idx" ON "brew_accessory_gear" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "brew_drink_options_owner_id_idx" ON "brew_drink_options" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "brew_images_owner_id_idx" ON "brew_images" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "brew_taste_tags_owner_id_idx" ON "brew_taste_tags" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "brews_owner_id_idx" ON "brews" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "shottimer_owner_id_idx" ON "shottimer" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "tamper_details_owner_id_idx" ON "tamper_details" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "taste_tags_name_unique" ON "taste_tags" USING btree ("owner_id","name");--> statement-breakpoint
CREATE INDEX "taste_tags_owner_id_idx" ON "taste_tags" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "wdt_details_owner_id_idx" ON "wdt_details" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bean_images_one_thumbnail_idx" ON "bean_images" USING btree ("owner_id","bean_purchase_id") WHERE "bean_images"."is_thumbnail" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "brewing_method_drink_types_method_type_idx" ON "brewing_method_drink_types" USING btree ("owner_id","brewing_method_id","drink_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cafe_visit_drink_options_visit_value_idx" ON "cafe_visit_drink_options" USING btree ("owner_id","cafe_visit_id","option_value_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cafe_visit_taste_tags_visit_tag_idx" ON "cafe_visit_taste_tags" USING btree ("owner_id","cafe_visit_id","taste_tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "drink_option_values_group_name_idx" ON "drink_option_values" USING btree ("owner_id","group_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "drink_type_option_groups_type_group_idx" ON "drink_type_option_groups" USING btree ("owner_id","drink_type_id","option_group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "espresso_machine_setting_revisions_current_kind_idx" ON "espresso_machine_setting_revisions" USING btree ("owner_id","gear_id","kind") WHERE "espresso_machine_setting_revisions"."superseded_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "gear_images_one_thumbnail_idx" ON "gear_images" USING btree ("owner_id","gear_id") WHERE "gear_images"."is_thumbnail" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "gear_set_accessory_gear_set_gear_idx" ON "gear_set_accessory_gear" USING btree ("owner_id","gear_set_id","gear_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_accessory_gear_recipe_gear_idx" ON "recipe_accessory_gear" USING btree ("owner_id","recipe_id","gear_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_drink_options_recipe_value_idx" ON "recipe_drink_options" USING btree ("owner_id","recipe_id","option_value_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipes_client_operation_id_unique" ON "recipes" USING btree ("owner_id","client_operation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipes_sync_id_unique" ON "recipes" USING btree ("owner_id","sync_id");--> statement-breakpoint
CREATE UNIQUE INDEX "brew_accessory_gear_brew_gear_idx" ON "brew_accessory_gear" USING btree ("owner_id","brew_id","gear_id");--> statement-breakpoint
CREATE UNIQUE INDEX "brew_drink_options_brew_value_idx" ON "brew_drink_options" USING btree ("owner_id","brew_id","option_value_id");--> statement-breakpoint
CREATE UNIQUE INDEX "brew_images_client_operation_id_unique" ON "brew_images" USING btree ("owner_id","client_operation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "brew_taste_tags_brew_tag_idx" ON "brew_taste_tags" USING btree ("owner_id","brew_id","taste_tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "brews_client_operation_id_unique" ON "brews" USING btree ("owner_id","client_operation_id");
--> statement-breakpoint
ALTER TABLE "client_operations" ADD CONSTRAINT "client_operations_owner_id_operation_id_pk" PRIMARY KEY("owner_id","operation_id");
--> statement-breakpoint
ALTER TABLE "mcp_settings" ADD CONSTRAINT "mcp_settings_owner_id_id_pk" PRIMARY KEY("owner_id","id");
--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_owner_id_id_pk" PRIMARY KEY("owner_id","id");
--> statement-breakpoint
ALTER TABLE "shottimer" ADD CONSTRAINT "shottimer_owner_id_id_pk" PRIMARY KEY("owner_id","id");

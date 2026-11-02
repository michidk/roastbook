CREATE TABLE `account_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`storage_path` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`available_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`expires_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "account_jobs_kind_enum" CHECK("account_jobs"."kind" in ('export', 'delete')),
	CONSTRAINT "account_jobs_status_enum" CHECK("account_jobs"."status" in ('pending', 'running', 'ready', 'failed'))
);
--> statement-breakpoint
CREATE INDEX `account_jobs_claim_idx` ON `account_jobs` (`status`,`available_at`);--> statement-breakpoint
CREATE TABLE `admin_audit_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_id` text,
	`target_id` text,
	`action` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ai_provider_credentials` (
	`user_id` text PRIMARY KEY NOT NULL,
	`base_url` text NOT NULL,
	`api` text NOT NULL,
	`encrypted_api_key` text NOT NULL,
	`vision_model` text NOT NULL,
	`research_model` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ai_provider_api_check" CHECK("ai_provider_credentials"."api" in ('responses','chat-completions'))
);
--> statement-breakpoint
CREATE TABLE `ai_request_logs` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`provider_mode` text DEFAULT 'byo' NOT NULL,
	`request_type` text NOT NULL,
	`model` text NOT NULL,
	`status` text DEFAULT 'in_progress' NOT NULL,
	`request_payload` text NOT NULL,
	`response_payload` text,
	`error_message` text,
	`prompt_tokens` integer DEFAULT 0 NOT NULL,
	`cached_prompt_tokens` integer DEFAULT 0 NOT NULL,
	`completion_tokens` integer DEFAULT 0 NOT NULL,
	`total_tokens` integer DEFAULT 0 NOT NULL,
	`estimated_cost_usd` text,
	`estimated_cost_source` text,
	`estimated_cost_version` text,
	`duration_ms` integer,
	`completed_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "ai_request_logs_providerMode_enum" CHECK("ai_request_logs"."provider_mode" in ('provided', 'byo')),
	CONSTRAINT "ai_request_logs_requestPayload_json" CHECK("ai_request_logs"."request_payload" is null or json_valid("ai_request_logs"."request_payload")),
	CONSTRAINT "ai_request_logs_responsePayload_json" CHECK("ai_request_logs"."response_payload" is null or json_valid("ai_request_logs"."response_payload")),
	CONSTRAINT "ai_request_logs_estimatedCostUsd_decimal" CHECK("ai_request_logs"."estimated_cost_usd" is null or (
      typeof("ai_request_logs"."estimated_cost_usd") = 'text'
      and case when substr("ai_request_logs"."estimated_cost_usd", 1, 1) = '-' then substr("ai_request_logs"."estimated_cost_usd", 2) else "ai_request_logs"."estimated_cost_usd" end not glob '*[^0-9.]*'
      and case when substr("ai_request_logs"."estimated_cost_usd", 1, 1) = '-' then substr("ai_request_logs"."estimated_cost_usd", 2) else "ai_request_logs"."estimated_cost_usd" end glob '[0-9]*'
      and length(replace(case when substr("ai_request_logs"."estimated_cost_usd", 1, 1) = '-' then substr("ai_request_logs"."estimated_cost_usd", 2) else "ai_request_logs"."estimated_cost_usd" end, '.', '')) between 1 and 18
      and length(case when substr("ai_request_logs"."estimated_cost_usd", 1, 1) = '-' then substr("ai_request_logs"."estimated_cost_usd", 2) else "ai_request_logs"."estimated_cost_usd" end) - length(replace(case when substr("ai_request_logs"."estimated_cost_usd", 1, 1) = '-' then substr("ai_request_logs"."estimated_cost_usd", 2) else "ai_request_logs"."estimated_cost_usd" end, '.', '')) = 1
      and (10 = 0 or (
        instr(case when substr("ai_request_logs"."estimated_cost_usd", 1, 1) = '-' then substr("ai_request_logs"."estimated_cost_usd", 2) else "ai_request_logs"."estimated_cost_usd" end, '.') > 1
        and length(substr(case when substr("ai_request_logs"."estimated_cost_usd", 1, 1) = '-' then substr("ai_request_logs"."estimated_cost_usd", 2) else "ai_request_logs"."estimated_cost_usd" end, instr(case when substr("ai_request_logs"."estimated_cost_usd", 1, 1) = '-' then substr("ai_request_logs"."estimated_cost_usd", 2) else "ai_request_logs"."estimated_cost_usd" end, '.') + 1)) = 10
      ))
    )),
	CONSTRAINT "ai_request_logs_provider_check" CHECK("ai_request_logs"."provider_mode" in ('provided', 'byo')),
	CONSTRAINT "ai_request_logs_status_check" CHECK("ai_request_logs"."status" in ('in_progress', 'succeeded', 'failed', 'aborted')),
	CONSTRAINT "ai_request_logs_usage_check" CHECK("ai_request_logs"."prompt_tokens" >= 0
        and "ai_request_logs"."cached_prompt_tokens" >= 0
        and "ai_request_logs"."cached_prompt_tokens" <= "ai_request_logs"."prompt_tokens"
        and "ai_request_logs"."completion_tokens" >= 0
        and "ai_request_logs"."total_tokens" >= 0
        and ("ai_request_logs"."estimated_cost_usd" is null or cast("ai_request_logs"."estimated_cost_usd" as real) >= 0))
);
--> statement-breakpoint
CREATE INDEX `ai_request_logs_owner_id_idx` ON `ai_request_logs` (`owner_id`);--> statement-breakpoint
CREATE INDEX `ai_request_logs_provider_created_idx` ON `ai_request_logs` (`provider_mode`,`created_at`);--> statement-breakpoint
CREATE INDEX `ai_request_logs_created_at_idx` ON `ai_request_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `ai_usage` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`request_id` text NOT NULL,
	`feature` text NOT NULL,
	`model` text NOT NULL,
	`prompt_tokens` integer NOT NULL,
	`cached_prompt_tokens` integer DEFAULT 0 NOT NULL,
	`completion_tokens` integer NOT NULL,
	`total_tokens` integer NOT NULL,
	`estimated_cost_usd` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "ai_usage_estimatedCostUsd_decimal" CHECK("ai_usage"."estimated_cost_usd" is null or (
      typeof("ai_usage"."estimated_cost_usd") = 'text'
      and case when substr("ai_usage"."estimated_cost_usd", 1, 1) = '-' then substr("ai_usage"."estimated_cost_usd", 2) else "ai_usage"."estimated_cost_usd" end not glob '*[^0-9.]*'
      and case when substr("ai_usage"."estimated_cost_usd", 1, 1) = '-' then substr("ai_usage"."estimated_cost_usd", 2) else "ai_usage"."estimated_cost_usd" end glob '[0-9]*'
      and length(replace(case when substr("ai_usage"."estimated_cost_usd", 1, 1) = '-' then substr("ai_usage"."estimated_cost_usd", 2) else "ai_usage"."estimated_cost_usd" end, '.', '')) between 1 and 18
      and length(case when substr("ai_usage"."estimated_cost_usd", 1, 1) = '-' then substr("ai_usage"."estimated_cost_usd", 2) else "ai_usage"."estimated_cost_usd" end) - length(replace(case when substr("ai_usage"."estimated_cost_usd", 1, 1) = '-' then substr("ai_usage"."estimated_cost_usd", 2) else "ai_usage"."estimated_cost_usd" end, '.', '')) = 1
      and (10 = 0 or (
        instr(case when substr("ai_usage"."estimated_cost_usd", 1, 1) = '-' then substr("ai_usage"."estimated_cost_usd", 2) else "ai_usage"."estimated_cost_usd" end, '.') > 1
        and length(substr(case when substr("ai_usage"."estimated_cost_usd", 1, 1) = '-' then substr("ai_usage"."estimated_cost_usd", 2) else "ai_usage"."estimated_cost_usd" end, instr(case when substr("ai_usage"."estimated_cost_usd", 1, 1) = '-' then substr("ai_usage"."estimated_cost_usd", 2) else "ai_usage"."estimated_cost_usd" end, '.') + 1)) = 10
      ))
    )),
	CONSTRAINT "ai_usage_tokens_nonnegative_check" CHECK("ai_usage"."prompt_tokens" >= 0
        and "ai_usage"."cached_prompt_tokens" >= 0
        and "ai_usage"."cached_prompt_tokens" <= "ai_usage"."prompt_tokens"
        and "ai_usage"."completion_tokens" >= 0
        and "ai_usage"."total_tokens" >= 0),
	CONSTRAINT "ai_usage_cost_nonnegative_check" CHECK("ai_usage"."estimated_cost_usd" is null or cast("ai_usage"."estimated_cost_usd" as real) >= 0)
);
--> statement-breakpoint
CREATE INDEX `ai_usage_owner_id_idx` ON `ai_usage` (`owner_id`);--> statement-breakpoint
CREATE INDEX `ai_usage_request_id_idx` ON `ai_usage` (`request_id`);--> statement-breakpoint
CREATE INDEX `ai_usage_created_at_idx` ON `ai_usage` (`created_at`);--> statement-breakpoint
CREATE TABLE `ai_weekly_usage` (
	`user_id` text NOT NULL,
	`week_start` integer NOT NULL,
	`requests` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `week_start`),
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "ai_weekly_usage_requests_check" CHECK("ai_weekly_usage"."requests" >= 0)
);
--> statement-breakpoint
CREATE TABLE `auth_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `auth_accounts_user_id_idx` ON `auth_accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `auth_passkeys` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`public_key` text NOT NULL,
	`user_id` text NOT NULL,
	`credential_id` text NOT NULL,
	`counter` integer NOT NULL,
	`device_type` text NOT NULL,
	`backed_up` integer NOT NULL,
	`transports` text,
	`aaguid` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "auth_passkeys_backedUp_boolean" CHECK("auth_passkeys"."backed_up" in (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_passkeys_credential_id_unique` ON `auth_passkeys` (`credential_id`);--> statement-breakpoint
CREATE INDEX `auth_passkeys_user_id_idx` ON `auth_passkeys` (`user_id`);--> statement-breakpoint
CREATE TABLE `auth_rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`count` integer NOT NULL,
	`last_request` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_rate_limits_key_unique` ON `auth_rate_limits` (`key`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_sessions_token_unique` ON `auth_sessions` (`token`);--> statement-breakpoint
CREATE INDEX `auth_sessions_user_id_idx` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `auth_users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`passkey_prompt_dismissed_at` integer,
	`last_login_at` integer,
	`ai_provider_mode` text DEFAULT 'provided' NOT NULL,
	`ai_weekly_limit` integer DEFAULT 10 NOT NULL,
	`image` text,
	`role` text DEFAULT 'user' NOT NULL,
	`journal_initialized_at` integer,
	`deleting_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "auth_users_emailVerified_boolean" CHECK("auth_users"."email_verified" in (0, 1)),
	CONSTRAINT "auth_users_aiProviderMode_enum" CHECK("auth_users"."ai_provider_mode" in ('provided', 'byo')),
	CONSTRAINT "auth_users_role_enum" CHECK("auth_users"."role" in ('user', 'admin')),
	CONSTRAINT "auth_users_ai_limit_check" CHECK("auth_users"."ai_weekly_limit" >= 0),
	CONSTRAINT "auth_users_ai_mode_check" CHECK("auth_users"."ai_provider_mode" in ('provided', 'byo'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_users_email_unique` ON `auth_users` (`email`);--> statement-breakpoint
CREATE TABLE `auth_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_verifications_identifier_idx` ON `auth_verifications` (`identifier`);--> statement-breakpoint
CREATE TABLE `basket_details` (
	`owner_id` text NOT NULL,
	`gear_id` integer PRIMARY KEY NOT NULL,
	`nominal_dose_grams` text,
	`diameter_mm` text,
	`is_pressurized` integer,
	`dose_minimum_grams` text,
	`dose_maximum_grams` text,
	`kind` text,
	FOREIGN KEY (`gear_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`gear_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "basket_details_nominalDoseGrams_decimal" CHECK("basket_details"."nominal_dose_grams" is null or (
      typeof("basket_details"."nominal_dose_grams") = 'text'
      and case when substr("basket_details"."nominal_dose_grams", 1, 1) = '-' then substr("basket_details"."nominal_dose_grams", 2) else "basket_details"."nominal_dose_grams" end not glob '*[^0-9.]*'
      and case when substr("basket_details"."nominal_dose_grams", 1, 1) = '-' then substr("basket_details"."nominal_dose_grams", 2) else "basket_details"."nominal_dose_grams" end glob '[0-9]*'
      and length(replace(case when substr("basket_details"."nominal_dose_grams", 1, 1) = '-' then substr("basket_details"."nominal_dose_grams", 2) else "basket_details"."nominal_dose_grams" end, '.', '')) between 1 and 5
      and length(case when substr("basket_details"."nominal_dose_grams", 1, 1) = '-' then substr("basket_details"."nominal_dose_grams", 2) else "basket_details"."nominal_dose_grams" end) - length(replace(case when substr("basket_details"."nominal_dose_grams", 1, 1) = '-' then substr("basket_details"."nominal_dose_grams", 2) else "basket_details"."nominal_dose_grams" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("basket_details"."nominal_dose_grams", 1, 1) = '-' then substr("basket_details"."nominal_dose_grams", 2) else "basket_details"."nominal_dose_grams" end, '.') > 1
        and length(substr(case when substr("basket_details"."nominal_dose_grams", 1, 1) = '-' then substr("basket_details"."nominal_dose_grams", 2) else "basket_details"."nominal_dose_grams" end, instr(case when substr("basket_details"."nominal_dose_grams", 1, 1) = '-' then substr("basket_details"."nominal_dose_grams", 2) else "basket_details"."nominal_dose_grams" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "basket_details_diameterMm_decimal" CHECK("basket_details"."diameter_mm" is null or (
      typeof("basket_details"."diameter_mm") = 'text'
      and case when substr("basket_details"."diameter_mm", 1, 1) = '-' then substr("basket_details"."diameter_mm", 2) else "basket_details"."diameter_mm" end not glob '*[^0-9.]*'
      and case when substr("basket_details"."diameter_mm", 1, 1) = '-' then substr("basket_details"."diameter_mm", 2) else "basket_details"."diameter_mm" end glob '[0-9]*'
      and length(replace(case when substr("basket_details"."diameter_mm", 1, 1) = '-' then substr("basket_details"."diameter_mm", 2) else "basket_details"."diameter_mm" end, '.', '')) between 1 and 5
      and length(case when substr("basket_details"."diameter_mm", 1, 1) = '-' then substr("basket_details"."diameter_mm", 2) else "basket_details"."diameter_mm" end) - length(replace(case when substr("basket_details"."diameter_mm", 1, 1) = '-' then substr("basket_details"."diameter_mm", 2) else "basket_details"."diameter_mm" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("basket_details"."diameter_mm", 1, 1) = '-' then substr("basket_details"."diameter_mm", 2) else "basket_details"."diameter_mm" end, '.') > 1
        and length(substr(case when substr("basket_details"."diameter_mm", 1, 1) = '-' then substr("basket_details"."diameter_mm", 2) else "basket_details"."diameter_mm" end, instr(case when substr("basket_details"."diameter_mm", 1, 1) = '-' then substr("basket_details"."diameter_mm", 2) else "basket_details"."diameter_mm" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "basket_details_isPressurized_boolean" CHECK("basket_details"."is_pressurized" in (0, 1)),
	CONSTRAINT "basket_details_doseMinimumGrams_decimal" CHECK("basket_details"."dose_minimum_grams" is null or (
      typeof("basket_details"."dose_minimum_grams") = 'text'
      and case when substr("basket_details"."dose_minimum_grams", 1, 1) = '-' then substr("basket_details"."dose_minimum_grams", 2) else "basket_details"."dose_minimum_grams" end not glob '*[^0-9.]*'
      and case when substr("basket_details"."dose_minimum_grams", 1, 1) = '-' then substr("basket_details"."dose_minimum_grams", 2) else "basket_details"."dose_minimum_grams" end glob '[0-9]*'
      and length(replace(case when substr("basket_details"."dose_minimum_grams", 1, 1) = '-' then substr("basket_details"."dose_minimum_grams", 2) else "basket_details"."dose_minimum_grams" end, '.', '')) between 1 and 5
      and length(case when substr("basket_details"."dose_minimum_grams", 1, 1) = '-' then substr("basket_details"."dose_minimum_grams", 2) else "basket_details"."dose_minimum_grams" end) - length(replace(case when substr("basket_details"."dose_minimum_grams", 1, 1) = '-' then substr("basket_details"."dose_minimum_grams", 2) else "basket_details"."dose_minimum_grams" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("basket_details"."dose_minimum_grams", 1, 1) = '-' then substr("basket_details"."dose_minimum_grams", 2) else "basket_details"."dose_minimum_grams" end, '.') > 1
        and length(substr(case when substr("basket_details"."dose_minimum_grams", 1, 1) = '-' then substr("basket_details"."dose_minimum_grams", 2) else "basket_details"."dose_minimum_grams" end, instr(case when substr("basket_details"."dose_minimum_grams", 1, 1) = '-' then substr("basket_details"."dose_minimum_grams", 2) else "basket_details"."dose_minimum_grams" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "basket_details_doseMaximumGrams_decimal" CHECK("basket_details"."dose_maximum_grams" is null or (
      typeof("basket_details"."dose_maximum_grams") = 'text'
      and case when substr("basket_details"."dose_maximum_grams", 1, 1) = '-' then substr("basket_details"."dose_maximum_grams", 2) else "basket_details"."dose_maximum_grams" end not glob '*[^0-9.]*'
      and case when substr("basket_details"."dose_maximum_grams", 1, 1) = '-' then substr("basket_details"."dose_maximum_grams", 2) else "basket_details"."dose_maximum_grams" end glob '[0-9]*'
      and length(replace(case when substr("basket_details"."dose_maximum_grams", 1, 1) = '-' then substr("basket_details"."dose_maximum_grams", 2) else "basket_details"."dose_maximum_grams" end, '.', '')) between 1 and 5
      and length(case when substr("basket_details"."dose_maximum_grams", 1, 1) = '-' then substr("basket_details"."dose_maximum_grams", 2) else "basket_details"."dose_maximum_grams" end) - length(replace(case when substr("basket_details"."dose_maximum_grams", 1, 1) = '-' then substr("basket_details"."dose_maximum_grams", 2) else "basket_details"."dose_maximum_grams" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("basket_details"."dose_maximum_grams", 1, 1) = '-' then substr("basket_details"."dose_maximum_grams", 2) else "basket_details"."dose_maximum_grams" end, '.') > 1
        and length(substr(case when substr("basket_details"."dose_maximum_grams", 1, 1) = '-' then substr("basket_details"."dose_maximum_grams", 2) else "basket_details"."dose_maximum_grams" end, instr(case when substr("basket_details"."dose_maximum_grams", 1, 1) = '-' then substr("basket_details"."dose_maximum_grams", 2) else "basket_details"."dose_maximum_grams" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "basket_details_kind_check" CHECK("basket_details"."kind" in ('single', 'double', 'triple', 'other')),
	CONSTRAINT "basket_details_measurements_check" CHECK(("basket_details"."nominal_dose_grams" is null or cast("basket_details"."nominal_dose_grams" as real) >= 0)
        and ("basket_details"."diameter_mm" is null or cast("basket_details"."diameter_mm" as real) > 0)
        and ("basket_details"."dose_minimum_grams" is null or cast("basket_details"."dose_minimum_grams" as real) > 0)
        and ("basket_details"."dose_maximum_grams" is null or cast("basket_details"."dose_maximum_grams" as real) > 0)
        and ("basket_details"."dose_minimum_grams" is null or "basket_details"."dose_maximum_grams" is null or cast("basket_details"."dose_minimum_grams" as real) <= cast("basket_details"."dose_maximum_grams" as real)))
);
--> statement-breakpoint
CREATE INDEX `basket_details_owner_id_idx` ON `basket_details` (`owner_id`);--> statement-breakpoint
CREATE TABLE `bean_images` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bean_id` integer NOT NULL,
	`bean_purchase_id` integer NOT NULL,
	`storage_path` text NOT NULL,
	`original_filename` text,
	`mime_type` text,
	`size_bytes` integer,
	`is_thumbnail` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`bean_id`) REFERENCES `beans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`bean_id`) REFERENCES `beans`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`bean_purchase_id`,`bean_id`) REFERENCES `bean_purchases`(`owner_id`,`id`,`bean_id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "bean_images_isThumbnail_boolean" CHECK("bean_images"."is_thumbnail" in (0, 1))
);
--> statement-breakpoint
CREATE INDEX `bean_images_owner_id_idx` ON `bean_images` (`owner_id`);--> statement-breakpoint
CREATE INDEX `bean_images_bean_id_idx` ON `bean_images` (`bean_id`);--> statement-breakpoint
CREATE INDEX `bean_images_bean_purchase_id_idx` ON `bean_images` (`bean_purchase_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `bean_images_one_thumbnail_idx` ON `bean_images` (`owner_id`,`bean_purchase_id`) WHERE "bean_images"."is_thumbnail" = true;--> statement-breakpoint
CREATE TABLE `bean_purchases` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bean_id` integer NOT NULL,
	`purchased_at` integer,
	`roast_date` integer,
	`initial_weight_grams` text,
	`price` text,
	`price_currency` text DEFAULT 'EUR',
	`shop_name` text,
	`shop_url` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`bean_id`) REFERENCES `beans`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`owner_id`,`bean_id`) REFERENCES `beans`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "bean_purchases_initialWeightGrams_decimal" CHECK("bean_purchases"."initial_weight_grams" is null or (
      typeof("bean_purchases"."initial_weight_grams") = 'text'
      and case when substr("bean_purchases"."initial_weight_grams", 1, 1) = '-' then substr("bean_purchases"."initial_weight_grams", 2) else "bean_purchases"."initial_weight_grams" end not glob '*[^0-9.]*'
      and case when substr("bean_purchases"."initial_weight_grams", 1, 1) = '-' then substr("bean_purchases"."initial_weight_grams", 2) else "bean_purchases"."initial_weight_grams" end glob '[0-9]*'
      and length(replace(case when substr("bean_purchases"."initial_weight_grams", 1, 1) = '-' then substr("bean_purchases"."initial_weight_grams", 2) else "bean_purchases"."initial_weight_grams" end, '.', '')) between 1 and 7
      and length(case when substr("bean_purchases"."initial_weight_grams", 1, 1) = '-' then substr("bean_purchases"."initial_weight_grams", 2) else "bean_purchases"."initial_weight_grams" end) - length(replace(case when substr("bean_purchases"."initial_weight_grams", 1, 1) = '-' then substr("bean_purchases"."initial_weight_grams", 2) else "bean_purchases"."initial_weight_grams" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("bean_purchases"."initial_weight_grams", 1, 1) = '-' then substr("bean_purchases"."initial_weight_grams", 2) else "bean_purchases"."initial_weight_grams" end, '.') > 1
        and length(substr(case when substr("bean_purchases"."initial_weight_grams", 1, 1) = '-' then substr("bean_purchases"."initial_weight_grams", 2) else "bean_purchases"."initial_weight_grams" end, instr(case when substr("bean_purchases"."initial_weight_grams", 1, 1) = '-' then substr("bean_purchases"."initial_weight_grams", 2) else "bean_purchases"."initial_weight_grams" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "bean_purchases_price_decimal" CHECK("bean_purchases"."price" is null or (
      typeof("bean_purchases"."price") = 'text'
      and case when substr("bean_purchases"."price", 1, 1) = '-' then substr("bean_purchases"."price", 2) else "bean_purchases"."price" end not glob '*[^0-9.]*'
      and case when substr("bean_purchases"."price", 1, 1) = '-' then substr("bean_purchases"."price", 2) else "bean_purchases"."price" end glob '[0-9]*'
      and length(replace(case when substr("bean_purchases"."price", 1, 1) = '-' then substr("bean_purchases"."price", 2) else "bean_purchases"."price" end, '.', '')) between 1 and 8
      and length(case when substr("bean_purchases"."price", 1, 1) = '-' then substr("bean_purchases"."price", 2) else "bean_purchases"."price" end) - length(replace(case when substr("bean_purchases"."price", 1, 1) = '-' then substr("bean_purchases"."price", 2) else "bean_purchases"."price" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("bean_purchases"."price", 1, 1) = '-' then substr("bean_purchases"."price", 2) else "bean_purchases"."price" end, '.') > 1
        and length(substr(case when substr("bean_purchases"."price", 1, 1) = '-' then substr("bean_purchases"."price", 2) else "bean_purchases"."price" end, instr(case when substr("bean_purchases"."price", 1, 1) = '-' then substr("bean_purchases"."price", 2) else "bean_purchases"."price" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "bean_purchases_isArchived_boolean" CHECK("bean_purchases"."is_archived" in (0, 1)),
	CONSTRAINT "bean_purchases_weight_nonnegative" CHECK(cast("bean_purchases"."initial_weight_grams" as real) >= 0),
	CONSTRAINT "bean_purchases_price_nonnegative" CHECK(cast("bean_purchases"."price" as real) >= 0),
	CONSTRAINT "bean_purchases_currency_check" CHECK("bean_purchases"."price_currency" in ('EUR', 'USD', 'GBP', 'CHF'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bean_purchases_id_beanId_owner_unique` ON `bean_purchases` (`owner_id`,`id`,`bean_id`);--> statement-breakpoint
CREATE INDEX `bean_purchases_owner_id_idx` ON `bean_purchases` (`owner_id`);--> statement-breakpoint
CREATE INDEX `bean_purchases_bean_id_idx` ON `bean_purchases` (`bean_id`);--> statement-breakpoint
CREATE INDEX `bean_purchases_archive_created_idx` ON `bean_purchases` (`is_archived`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `bean_purchases_id_bean_id_idx` ON `bean_purchases` (`id`,`bean_id`);--> statement-breakpoint
CREATE TABLE `beans` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text,
	`is_decaf` integer DEFAULT false NOT NULL,
	`roaster` text,
	`roaster_id` integer,
	`origin` text,
	`region` text,
	`farm` text,
	`variety` text,
	`altitude_min_meters` integer,
	`altitude_max_meters` integer,
	`process` text,
	`roast_level` text,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`roaster_id`) REFERENCES `roasters`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_id`,`roaster_id`) REFERENCES `roasters`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "beans_type_enum" CHECK("beans"."type" in ('espresso', 'filter', 'omni')),
	CONSTRAINT "beans_isDecaf_boolean" CHECK("beans"."is_decaf" in (0, 1)),
	CONSTRAINT "beans_roastLevel_enum" CHECK("beans"."roast_level" in ('light', 'medium_light', 'medium', 'medium_dark', 'dark')),
	CONSTRAINT "beans_altitude_range_check" CHECK(("beans"."altitude_min_meters" is null or "beans"."altitude_min_meters" between 0 and 9000)
        and ("beans"."altitude_max_meters" is null or "beans"."altitude_max_meters" between 0 and 9000)
        and ("beans"."altitude_min_meters" is null or "beans"."altitude_max_meters" is null or "beans"."altitude_min_meters" <= "beans"."altitude_max_meters"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `beans_id_owner_unique` ON `beans` (`owner_id`,`id`);--> statement-breakpoint
CREATE INDEX `beans_owner_id_idx` ON `beans` (`owner_id`);--> statement-breakpoint
CREATE INDEX `beans_created_at_idx` ON `beans` (`created_at`);--> statement-breakpoint
CREATE INDEX `beans_roaster_id_idx` ON `beans` (`roaster_id`);--> statement-breakpoint
CREATE TABLE `brewer_details` (
	`owner_id` text NOT NULL,
	`gear_id` integer PRIMARY KEY NOT NULL,
	`mechanism` text,
	`capacity_ml` text,
	`filter_format` text,
	`flow_control` text,
	FOREIGN KEY (`gear_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`gear_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "brewer_details_capacityMl_decimal" CHECK("brewer_details"."capacity_ml" is null or (
      typeof("brewer_details"."capacity_ml") = 'text'
      and case when substr("brewer_details"."capacity_ml", 1, 1) = '-' then substr("brewer_details"."capacity_ml", 2) else "brewer_details"."capacity_ml" end not glob '*[^0-9.]*'
      and case when substr("brewer_details"."capacity_ml", 1, 1) = '-' then substr("brewer_details"."capacity_ml", 2) else "brewer_details"."capacity_ml" end glob '[0-9]*'
      and length(replace(case when substr("brewer_details"."capacity_ml", 1, 1) = '-' then substr("brewer_details"."capacity_ml", 2) else "brewer_details"."capacity_ml" end, '.', '')) between 1 and 7
      and length(case when substr("brewer_details"."capacity_ml", 1, 1) = '-' then substr("brewer_details"."capacity_ml", 2) else "brewer_details"."capacity_ml" end) - length(replace(case when substr("brewer_details"."capacity_ml", 1, 1) = '-' then substr("brewer_details"."capacity_ml", 2) else "brewer_details"."capacity_ml" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("brewer_details"."capacity_ml", 1, 1) = '-' then substr("brewer_details"."capacity_ml", 2) else "brewer_details"."capacity_ml" end, '.') > 1
        and length(substr(case when substr("brewer_details"."capacity_ml", 1, 1) = '-' then substr("brewer_details"."capacity_ml", 2) else "brewer_details"."capacity_ml" end, instr(case when substr("brewer_details"."capacity_ml", 1, 1) = '-' then substr("brewer_details"."capacity_ml", 2) else "brewer_details"."capacity_ml" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "brewer_details_mechanism_check" CHECK("brewer_details"."mechanism" in ('percolation', 'immersion', 'hybrid', 'press', 'vacuum', 'other')),
	CONSTRAINT "brewer_details_flow_control_check" CHECK("brewer_details"."flow_control" in ('fixed', 'manual_valve', 'programmable')),
	CONSTRAINT "brewer_details_capacity_check" CHECK("brewer_details"."capacity_ml" is null or cast("brewer_details"."capacity_ml" as real) > 0)
);
--> statement-breakpoint
CREATE INDEX `brewer_details_owner_id_idx` ON `brewer_details` (`owner_id`);--> statement-breakpoint
CREATE TABLE `brewing_method_drink_types` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brewing_method_id` integer NOT NULL,
	`drink_type_id` integer NOT NULL,
	FOREIGN KEY (`brewing_method_id`) REFERENCES `brewing_methods`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`drink_type_id`) REFERENCES `drink_types`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`brewing_method_id`) REFERENCES `brewing_methods`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`drink_type_id`) REFERENCES `drink_types`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `brewing_method_drink_types_owner_id_idx` ON `brewing_method_drink_types` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `brewing_method_drink_types_method_type_idx` ON `brewing_method_drink_types` (`owner_id`,`brewing_method_id`,`drink_type_id`);--> statement-breakpoint
CREATE INDEX `brewing_method_drink_types_drink_type_id_idx` ON `brewing_method_drink_types` (`drink_type_id`);--> statement-breakpoint
CREATE TABLE `brewing_methods` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`enabled_parameters` text DEFAULT '[]' NOT NULL,
	`timer_enabled` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "brewing_methods_enabledParameters_json_array" CHECK("brewing_methods"."enabled_parameters" is null or (json_valid("brewing_methods"."enabled_parameters") and json_type("brewing_methods"."enabled_parameters") = 'array')),
	CONSTRAINT "brewing_methods_timerEnabled_boolean" CHECK("brewing_methods"."timer_enabled" in (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brewing_methods_id_owner_unique` ON `brewing_methods` (`owner_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `brewing_methods_name_unique` ON `brewing_methods` (`owner_id`,`name`);--> statement-breakpoint
CREATE INDEX `brewing_methods_owner_id_idx` ON `brewing_methods` (`owner_id`);--> statement-breakpoint
CREATE TABLE `cafe_visit_drink_options` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cafe_visit_id` integer NOT NULL,
	`option_value_id` integer NOT NULL,
	FOREIGN KEY (`cafe_visit_id`) REFERENCES `cafe_visits`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`option_value_id`) REFERENCES `drink_option_values`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`owner_id`,`cafe_visit_id`) REFERENCES `cafe_visits`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`option_value_id`) REFERENCES `drink_option_values`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cafe_visit_drink_options_owner_id_idx` ON `cafe_visit_drink_options` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `cafe_visit_drink_options_visit_value_idx` ON `cafe_visit_drink_options` (`owner_id`,`cafe_visit_id`,`option_value_id`);--> statement-breakpoint
CREATE INDEX `cafe_visit_drink_options_value_id_idx` ON `cafe_visit_drink_options` (`option_value_id`);--> statement-breakpoint
CREATE TABLE `cafe_visit_images` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cafe_visit_id` integer NOT NULL,
	`storage_path` text NOT NULL,
	`original_filename` text,
	`mime_type` text,
	`size_bytes` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`cafe_visit_id`) REFERENCES `cafe_visits`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`cafe_visit_id`) REFERENCES `cafe_visits`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cafe_visit_images_owner_id_idx` ON `cafe_visit_images` (`owner_id`);--> statement-breakpoint
CREATE INDEX `cafe_visit_images_visit_id_idx` ON `cafe_visit_images` (`cafe_visit_id`);--> statement-breakpoint
CREATE TABLE `cafe_visit_taste_tags` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cafe_visit_id` integer NOT NULL,
	`taste_tag_id` integer NOT NULL,
	FOREIGN KEY (`cafe_visit_id`) REFERENCES `cafe_visits`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`taste_tag_id`) REFERENCES `taste_tags`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`cafe_visit_id`) REFERENCES `cafe_visits`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`taste_tag_id`) REFERENCES `taste_tags`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `cafe_visit_taste_tags_owner_id_idx` ON `cafe_visit_taste_tags` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `cafe_visit_taste_tags_visit_tag_idx` ON `cafe_visit_taste_tags` (`owner_id`,`cafe_visit_id`,`taste_tag_id`);--> statement-breakpoint
CREATE INDEX `cafe_visit_taste_tags_taste_tag_id_idx` ON `cafe_visit_taste_tags` (`taste_tag_id`);--> statement-breakpoint
CREATE TABLE `cafe_visits` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`coffee_shop_id` integer,
	`bean_id` integer,
	`drink_type_id` integer,
	`price` text,
	`currency` text DEFAULT 'EUR',
	`rating` integer,
	`notes` text,
	`visited_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`coffee_shop_id`) REFERENCES `coffee_shops`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`bean_id`) REFERENCES `beans`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`drink_type_id`) REFERENCES `drink_types`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_id`,`coffee_shop_id`) REFERENCES `coffee_shops`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`bean_id`) REFERENCES `beans`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`drink_type_id`) REFERENCES `drink_types`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "cafe_visits_price_decimal" CHECK("cafe_visits"."price" is null or (
      typeof("cafe_visits"."price") = 'text'
      and case when substr("cafe_visits"."price", 1, 1) = '-' then substr("cafe_visits"."price", 2) else "cafe_visits"."price" end not glob '*[^0-9.]*'
      and case when substr("cafe_visits"."price", 1, 1) = '-' then substr("cafe_visits"."price", 2) else "cafe_visits"."price" end glob '[0-9]*'
      and length(replace(case when substr("cafe_visits"."price", 1, 1) = '-' then substr("cafe_visits"."price", 2) else "cafe_visits"."price" end, '.', '')) between 1 and 6
      and length(case when substr("cafe_visits"."price", 1, 1) = '-' then substr("cafe_visits"."price", 2) else "cafe_visits"."price" end) - length(replace(case when substr("cafe_visits"."price", 1, 1) = '-' then substr("cafe_visits"."price", 2) else "cafe_visits"."price" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("cafe_visits"."price", 1, 1) = '-' then substr("cafe_visits"."price", 2) else "cafe_visits"."price" end, '.') > 1
        and length(substr(case when substr("cafe_visits"."price", 1, 1) = '-' then substr("cafe_visits"."price", 2) else "cafe_visits"."price" end, instr(case when substr("cafe_visits"."price", 1, 1) = '-' then substr("cafe_visits"."price", 2) else "cafe_visits"."price" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "cafe_visits_price_nonnegative" CHECK(cast("cafe_visits"."price" as real) >= 0),
	CONSTRAINT "cafe_visits_rating_check" CHECK("cafe_visits"."rating" between 1 and 5),
	CONSTRAINT "cafe_visits_currency_check" CHECK("cafe_visits"."currency" in ('EUR', 'USD', 'GBP', 'CHF'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cafe_visits_id_owner_unique` ON `cafe_visits` (`owner_id`,`id`);--> statement-breakpoint
CREATE INDEX `cafe_visits_owner_id_idx` ON `cafe_visits` (`owner_id`);--> statement-breakpoint
CREATE INDEX `cafe_visits_visited_at_idx` ON `cafe_visits` (`visited_at`);--> statement-breakpoint
CREATE INDEX `cafe_visits_coffee_shop_id_idx` ON `cafe_visits` (`coffee_shop_id`);--> statement-breakpoint
CREATE INDEX `cafe_visits_bean_id_idx` ON `cafe_visits` (`bean_id`);--> statement-breakpoint
CREATE INDEX `cafe_visits_drink_type_id_idx` ON `cafe_visits` (`drink_type_id`);--> statement-breakpoint
CREATE TABLE `client_operations` (
	`owner_id` text NOT NULL,
	`operation_id` text NOT NULL,
	`brew_id` integer,
	`recipe_id` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`owner_id`, `operation_id`),
	FOREIGN KEY (`brew_id`) REFERENCES `brews`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_id`,`brew_id`) REFERENCES `brews`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`recipe_id`) REFERENCES `recipes`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `client_operations_owner_id_idx` ON `client_operations` (`owner_id`);--> statement-breakpoint
CREATE INDEX `client_operations_brew_id_idx` ON `client_operations` (`brew_id`);--> statement-breakpoint
CREATE INDEX `client_operations_recipe_id_idx` ON `client_operations` (`recipe_id`);--> statement-breakpoint
CREATE INDEX `client_operations_created_at_idx` ON `client_operations` (`created_at`);--> statement-breakpoint
CREATE TABLE `coffee_shop_images` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`coffee_shop_id` integer NOT NULL,
	`storage_path` text NOT NULL,
	`original_filename` text,
	`mime_type` text,
	`size_bytes` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`coffee_shop_id`) REFERENCES `coffee_shops`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`coffee_shop_id`) REFERENCES `coffee_shops`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `coffee_shop_images_owner_id_idx` ON `coffee_shop_images` (`owner_id`);--> statement-breakpoint
CREATE INDEX `coffee_shop_images_shop_id_idx` ON `coffee_shop_images` (`coffee_shop_id`);--> statement-breakpoint
CREATE TABLE `coffee_shops` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`city` text,
	`country` text,
	`latitude` text,
	`longitude` text,
	`website` text,
	`instagram_handle` text,
	`notes` text,
	`rating` integer,
	`is_favorite` integer DEFAULT false NOT NULL,
	`wants_to_visit` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "coffee_shops_latitude_decimal" CHECK("coffee_shops"."latitude" is null or (
      typeof("coffee_shops"."latitude") = 'text'
      and case when substr("coffee_shops"."latitude", 1, 1) = '-' then substr("coffee_shops"."latitude", 2) else "coffee_shops"."latitude" end not glob '*[^0-9.]*'
      and case when substr("coffee_shops"."latitude", 1, 1) = '-' then substr("coffee_shops"."latitude", 2) else "coffee_shops"."latitude" end glob '[0-9]*'
      and length(replace(case when substr("coffee_shops"."latitude", 1, 1) = '-' then substr("coffee_shops"."latitude", 2) else "coffee_shops"."latitude" end, '.', '')) between 1 and 10
      and length(case when substr("coffee_shops"."latitude", 1, 1) = '-' then substr("coffee_shops"."latitude", 2) else "coffee_shops"."latitude" end) - length(replace(case when substr("coffee_shops"."latitude", 1, 1) = '-' then substr("coffee_shops"."latitude", 2) else "coffee_shops"."latitude" end, '.', '')) = 1
      and (7 = 0 or (
        instr(case when substr("coffee_shops"."latitude", 1, 1) = '-' then substr("coffee_shops"."latitude", 2) else "coffee_shops"."latitude" end, '.') > 1
        and length(substr(case when substr("coffee_shops"."latitude", 1, 1) = '-' then substr("coffee_shops"."latitude", 2) else "coffee_shops"."latitude" end, instr(case when substr("coffee_shops"."latitude", 1, 1) = '-' then substr("coffee_shops"."latitude", 2) else "coffee_shops"."latitude" end, '.') + 1)) = 7
      ))
    )),
	CONSTRAINT "coffee_shops_longitude_decimal" CHECK("coffee_shops"."longitude" is null or (
      typeof("coffee_shops"."longitude") = 'text'
      and case when substr("coffee_shops"."longitude", 1, 1) = '-' then substr("coffee_shops"."longitude", 2) else "coffee_shops"."longitude" end not glob '*[^0-9.]*'
      and case when substr("coffee_shops"."longitude", 1, 1) = '-' then substr("coffee_shops"."longitude", 2) else "coffee_shops"."longitude" end glob '[0-9]*'
      and length(replace(case when substr("coffee_shops"."longitude", 1, 1) = '-' then substr("coffee_shops"."longitude", 2) else "coffee_shops"."longitude" end, '.', '')) between 1 and 10
      and length(case when substr("coffee_shops"."longitude", 1, 1) = '-' then substr("coffee_shops"."longitude", 2) else "coffee_shops"."longitude" end) - length(replace(case when substr("coffee_shops"."longitude", 1, 1) = '-' then substr("coffee_shops"."longitude", 2) else "coffee_shops"."longitude" end, '.', '')) = 1
      and (7 = 0 or (
        instr(case when substr("coffee_shops"."longitude", 1, 1) = '-' then substr("coffee_shops"."longitude", 2) else "coffee_shops"."longitude" end, '.') > 1
        and length(substr(case when substr("coffee_shops"."longitude", 1, 1) = '-' then substr("coffee_shops"."longitude", 2) else "coffee_shops"."longitude" end, instr(case when substr("coffee_shops"."longitude", 1, 1) = '-' then substr("coffee_shops"."longitude", 2) else "coffee_shops"."longitude" end, '.') + 1)) = 7
      ))
    )),
	CONSTRAINT "coffee_shops_isFavorite_boolean" CHECK("coffee_shops"."is_favorite" in (0, 1)),
	CONSTRAINT "coffee_shops_wantsToVisit_boolean" CHECK("coffee_shops"."wants_to_visit" in (0, 1)),
	CONSTRAINT "coffee_shops_rating_check" CHECK("coffee_shops"."rating" between 1 and 5),
	CONSTRAINT "coffee_shops_latitude_check" CHECK(cast("coffee_shops"."latitude" as real) between -90 and 90),
	CONSTRAINT "coffee_shops_longitude_check" CHECK(cast("coffee_shops"."longitude" as real) between -180 and 180)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `coffee_shops_id_owner_unique` ON `coffee_shops` (`owner_id`,`id`);--> statement-breakpoint
CREATE INDEX `coffee_shops_owner_id_idx` ON `coffee_shops` (`owner_id`);--> statement-breakpoint
CREATE INDEX `coffee_shops_created_at_idx` ON `coffee_shops` (`created_at`);--> statement-breakpoint
CREATE INDEX `coffee_shops_city_idx` ON `coffee_shops` (`city`);--> statement-breakpoint
CREATE TABLE `drink_option_groups` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "drink_option_groups_isArchived_boolean" CHECK("drink_option_groups"."is_archived" in (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `drink_option_groups_id_owner_unique` ON `drink_option_groups` (`owner_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `drink_option_groups_name_unique` ON `drink_option_groups` (`owner_id`,`name`);--> statement-breakpoint
CREATE INDEX `drink_option_groups_owner_id_idx` ON `drink_option_groups` (`owner_id`);--> statement-breakpoint
CREATE TABLE `drink_option_values` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`group_id` integer NOT NULL,
	`name` text NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`group_id`) REFERENCES `drink_option_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`group_id`) REFERENCES `drink_option_groups`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "drink_option_values_isArchived_boolean" CHECK("drink_option_values"."is_archived" in (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `drink_option_values_id_owner_unique` ON `drink_option_values` (`owner_id`,`id`);--> statement-breakpoint
CREATE INDEX `drink_option_values_owner_id_idx` ON `drink_option_values` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `drink_option_values_group_name_idx` ON `drink_option_values` (`owner_id`,`group_id`,`name`);--> statement-breakpoint
CREATE INDEX `drink_option_values_group_id_idx` ON `drink_option_values` (`group_id`);--> statement-breakpoint
CREATE TABLE `drink_type_option_groups` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`drink_type_id` integer NOT NULL,
	`option_group_id` integer NOT NULL,
	FOREIGN KEY (`drink_type_id`) REFERENCES `drink_types`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`option_group_id`) REFERENCES `drink_option_groups`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`drink_type_id`) REFERENCES `drink_types`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`option_group_id`) REFERENCES `drink_option_groups`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `drink_type_option_groups_owner_id_idx` ON `drink_type_option_groups` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `drink_type_option_groups_type_group_idx` ON `drink_type_option_groups` (`owner_id`,`drink_type_id`,`option_group_id`);--> statement-breakpoint
CREATE INDEX `drink_type_option_groups_group_id_idx` ON `drink_type_option_groups` (`option_group_id`);--> statement-breakpoint
CREATE TABLE `drink_types` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "drink_types_isArchived_boolean" CHECK("drink_types"."is_archived" in (0, 1))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `drink_types_id_owner_unique` ON `drink_types` (`owner_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `drink_types_name_unique` ON `drink_types` (`owner_id`,`name`);--> statement-breakpoint
CREATE INDEX `drink_types_owner_id_idx` ON `drink_types` (`owner_id`);--> statement-breakpoint
CREATE TABLE `espresso_machine_details` (
	`owner_id` text NOT NULL,
	`gear_id` integer PRIMARY KEY NOT NULL,
	`portafilter_diameter_mm` text,
	`heating_architecture` text,
	`temperature_control` text,
	`pressure_control` text,
	`flow_control` text,
	`preinfusion_control` text,
	`shot_stop_modes` text,
	`steam_system` text,
	`simultaneous_brew_and_steam` integer,
	`group_count` integer,
	`pump_type` text,
	`water_source_modes` text,
	`brew_pressure_minimum_bar` text,
	`brew_pressure_maximum_bar` text,
	`brew_temperature_minimum_celsius` text,
	`brew_temperature_maximum_celsius` text,
	FOREIGN KEY (`gear_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`gear_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "espresso_machine_details_portafilterDiameterMm_decimal" CHECK("espresso_machine_details"."portafilter_diameter_mm" is null or (
      typeof("espresso_machine_details"."portafilter_diameter_mm") = 'text'
      and case when substr("espresso_machine_details"."portafilter_diameter_mm", 1, 1) = '-' then substr("espresso_machine_details"."portafilter_diameter_mm", 2) else "espresso_machine_details"."portafilter_diameter_mm" end not glob '*[^0-9.]*'
      and case when substr("espresso_machine_details"."portafilter_diameter_mm", 1, 1) = '-' then substr("espresso_machine_details"."portafilter_diameter_mm", 2) else "espresso_machine_details"."portafilter_diameter_mm" end glob '[0-9]*'
      and length(replace(case when substr("espresso_machine_details"."portafilter_diameter_mm", 1, 1) = '-' then substr("espresso_machine_details"."portafilter_diameter_mm", 2) else "espresso_machine_details"."portafilter_diameter_mm" end, '.', '')) between 1 and 5
      and length(case when substr("espresso_machine_details"."portafilter_diameter_mm", 1, 1) = '-' then substr("espresso_machine_details"."portafilter_diameter_mm", 2) else "espresso_machine_details"."portafilter_diameter_mm" end) - length(replace(case when substr("espresso_machine_details"."portafilter_diameter_mm", 1, 1) = '-' then substr("espresso_machine_details"."portafilter_diameter_mm", 2) else "espresso_machine_details"."portafilter_diameter_mm" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("espresso_machine_details"."portafilter_diameter_mm", 1, 1) = '-' then substr("espresso_machine_details"."portafilter_diameter_mm", 2) else "espresso_machine_details"."portafilter_diameter_mm" end, '.') > 1
        and length(substr(case when substr("espresso_machine_details"."portafilter_diameter_mm", 1, 1) = '-' then substr("espresso_machine_details"."portafilter_diameter_mm", 2) else "espresso_machine_details"."portafilter_diameter_mm" end, instr(case when substr("espresso_machine_details"."portafilter_diameter_mm", 1, 1) = '-' then substr("espresso_machine_details"."portafilter_diameter_mm", 2) else "espresso_machine_details"."portafilter_diameter_mm" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "espresso_machine_details_shotStopModes_json_array" CHECK("espresso_machine_details"."shot_stop_modes" is null or (json_valid("espresso_machine_details"."shot_stop_modes") and json_type("espresso_machine_details"."shot_stop_modes") = 'array')),
	CONSTRAINT "espresso_machine_details_simultaneousBrewAndSteam_boolean" CHECK("espresso_machine_details"."simultaneous_brew_and_steam" in (0, 1)),
	CONSTRAINT "espresso_machine_details_waterSourceModes_json_array" CHECK("espresso_machine_details"."water_source_modes" is null or (json_valid("espresso_machine_details"."water_source_modes") and json_type("espresso_machine_details"."water_source_modes") = 'array')),
	CONSTRAINT "espresso_machine_details_brewPressureMinimumBar_decimal" CHECK("espresso_machine_details"."brew_pressure_minimum_bar" is null or (
      typeof("espresso_machine_details"."brew_pressure_minimum_bar") = 'text'
      and case when substr("espresso_machine_details"."brew_pressure_minimum_bar", 1, 1) = '-' then substr("espresso_machine_details"."brew_pressure_minimum_bar", 2) else "espresso_machine_details"."brew_pressure_minimum_bar" end not glob '*[^0-9.]*'
      and case when substr("espresso_machine_details"."brew_pressure_minimum_bar", 1, 1) = '-' then substr("espresso_machine_details"."brew_pressure_minimum_bar", 2) else "espresso_machine_details"."brew_pressure_minimum_bar" end glob '[0-9]*'
      and length(replace(case when substr("espresso_machine_details"."brew_pressure_minimum_bar", 1, 1) = '-' then substr("espresso_machine_details"."brew_pressure_minimum_bar", 2) else "espresso_machine_details"."brew_pressure_minimum_bar" end, '.', '')) between 1 and 4
      and length(case when substr("espresso_machine_details"."brew_pressure_minimum_bar", 1, 1) = '-' then substr("espresso_machine_details"."brew_pressure_minimum_bar", 2) else "espresso_machine_details"."brew_pressure_minimum_bar" end) - length(replace(case when substr("espresso_machine_details"."brew_pressure_minimum_bar", 1, 1) = '-' then substr("espresso_machine_details"."brew_pressure_minimum_bar", 2) else "espresso_machine_details"."brew_pressure_minimum_bar" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("espresso_machine_details"."brew_pressure_minimum_bar", 1, 1) = '-' then substr("espresso_machine_details"."brew_pressure_minimum_bar", 2) else "espresso_machine_details"."brew_pressure_minimum_bar" end, '.') > 1
        and length(substr(case when substr("espresso_machine_details"."brew_pressure_minimum_bar", 1, 1) = '-' then substr("espresso_machine_details"."brew_pressure_minimum_bar", 2) else "espresso_machine_details"."brew_pressure_minimum_bar" end, instr(case when substr("espresso_machine_details"."brew_pressure_minimum_bar", 1, 1) = '-' then substr("espresso_machine_details"."brew_pressure_minimum_bar", 2) else "espresso_machine_details"."brew_pressure_minimum_bar" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "espresso_machine_details_brewPressureMaximumBar_decimal" CHECK("espresso_machine_details"."brew_pressure_maximum_bar" is null or (
      typeof("espresso_machine_details"."brew_pressure_maximum_bar") = 'text'
      and case when substr("espresso_machine_details"."brew_pressure_maximum_bar", 1, 1) = '-' then substr("espresso_machine_details"."brew_pressure_maximum_bar", 2) else "espresso_machine_details"."brew_pressure_maximum_bar" end not glob '*[^0-9.]*'
      and case when substr("espresso_machine_details"."brew_pressure_maximum_bar", 1, 1) = '-' then substr("espresso_machine_details"."brew_pressure_maximum_bar", 2) else "espresso_machine_details"."brew_pressure_maximum_bar" end glob '[0-9]*'
      and length(replace(case when substr("espresso_machine_details"."brew_pressure_maximum_bar", 1, 1) = '-' then substr("espresso_machine_details"."brew_pressure_maximum_bar", 2) else "espresso_machine_details"."brew_pressure_maximum_bar" end, '.', '')) between 1 and 4
      and length(case when substr("espresso_machine_details"."brew_pressure_maximum_bar", 1, 1) = '-' then substr("espresso_machine_details"."brew_pressure_maximum_bar", 2) else "espresso_machine_details"."brew_pressure_maximum_bar" end) - length(replace(case when substr("espresso_machine_details"."brew_pressure_maximum_bar", 1, 1) = '-' then substr("espresso_machine_details"."brew_pressure_maximum_bar", 2) else "espresso_machine_details"."brew_pressure_maximum_bar" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("espresso_machine_details"."brew_pressure_maximum_bar", 1, 1) = '-' then substr("espresso_machine_details"."brew_pressure_maximum_bar", 2) else "espresso_machine_details"."brew_pressure_maximum_bar" end, '.') > 1
        and length(substr(case when substr("espresso_machine_details"."brew_pressure_maximum_bar", 1, 1) = '-' then substr("espresso_machine_details"."brew_pressure_maximum_bar", 2) else "espresso_machine_details"."brew_pressure_maximum_bar" end, instr(case when substr("espresso_machine_details"."brew_pressure_maximum_bar", 1, 1) = '-' then substr("espresso_machine_details"."brew_pressure_maximum_bar", 2) else "espresso_machine_details"."brew_pressure_maximum_bar" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "espresso_machine_details_brewTemperatureMinimumCelsius_decimal" CHECK("espresso_machine_details"."brew_temperature_minimum_celsius" is null or (
      typeof("espresso_machine_details"."brew_temperature_minimum_celsius") = 'text'
      and case when substr("espresso_machine_details"."brew_temperature_minimum_celsius", 1, 1) = '-' then substr("espresso_machine_details"."brew_temperature_minimum_celsius", 2) else "espresso_machine_details"."brew_temperature_minimum_celsius" end not glob '*[^0-9.]*'
      and case when substr("espresso_machine_details"."brew_temperature_minimum_celsius", 1, 1) = '-' then substr("espresso_machine_details"."brew_temperature_minimum_celsius", 2) else "espresso_machine_details"."brew_temperature_minimum_celsius" end glob '[0-9]*'
      and length(replace(case when substr("espresso_machine_details"."brew_temperature_minimum_celsius", 1, 1) = '-' then substr("espresso_machine_details"."brew_temperature_minimum_celsius", 2) else "espresso_machine_details"."brew_temperature_minimum_celsius" end, '.', '')) between 1 and 4
      and length(case when substr("espresso_machine_details"."brew_temperature_minimum_celsius", 1, 1) = '-' then substr("espresso_machine_details"."brew_temperature_minimum_celsius", 2) else "espresso_machine_details"."brew_temperature_minimum_celsius" end) - length(replace(case when substr("espresso_machine_details"."brew_temperature_minimum_celsius", 1, 1) = '-' then substr("espresso_machine_details"."brew_temperature_minimum_celsius", 2) else "espresso_machine_details"."brew_temperature_minimum_celsius" end, '.', '')) = 1
      and (1 = 0 or (
        instr(case when substr("espresso_machine_details"."brew_temperature_minimum_celsius", 1, 1) = '-' then substr("espresso_machine_details"."brew_temperature_minimum_celsius", 2) else "espresso_machine_details"."brew_temperature_minimum_celsius" end, '.') > 1
        and length(substr(case when substr("espresso_machine_details"."brew_temperature_minimum_celsius", 1, 1) = '-' then substr("espresso_machine_details"."brew_temperature_minimum_celsius", 2) else "espresso_machine_details"."brew_temperature_minimum_celsius" end, instr(case when substr("espresso_machine_details"."brew_temperature_minimum_celsius", 1, 1) = '-' then substr("espresso_machine_details"."brew_temperature_minimum_celsius", 2) else "espresso_machine_details"."brew_temperature_minimum_celsius" end, '.') + 1)) = 1
      ))
    )),
	CONSTRAINT "espresso_machine_details_brewTemperatureMaximumCelsius_decimal" CHECK("espresso_machine_details"."brew_temperature_maximum_celsius" is null or (
      typeof("espresso_machine_details"."brew_temperature_maximum_celsius") = 'text'
      and case when substr("espresso_machine_details"."brew_temperature_maximum_celsius", 1, 1) = '-' then substr("espresso_machine_details"."brew_temperature_maximum_celsius", 2) else "espresso_machine_details"."brew_temperature_maximum_celsius" end not glob '*[^0-9.]*'
      and case when substr("espresso_machine_details"."brew_temperature_maximum_celsius", 1, 1) = '-' then substr("espresso_machine_details"."brew_temperature_maximum_celsius", 2) else "espresso_machine_details"."brew_temperature_maximum_celsius" end glob '[0-9]*'
      and length(replace(case when substr("espresso_machine_details"."brew_temperature_maximum_celsius", 1, 1) = '-' then substr("espresso_machine_details"."brew_temperature_maximum_celsius", 2) else "espresso_machine_details"."brew_temperature_maximum_celsius" end, '.', '')) between 1 and 4
      and length(case when substr("espresso_machine_details"."brew_temperature_maximum_celsius", 1, 1) = '-' then substr("espresso_machine_details"."brew_temperature_maximum_celsius", 2) else "espresso_machine_details"."brew_temperature_maximum_celsius" end) - length(replace(case when substr("espresso_machine_details"."brew_temperature_maximum_celsius", 1, 1) = '-' then substr("espresso_machine_details"."brew_temperature_maximum_celsius", 2) else "espresso_machine_details"."brew_temperature_maximum_celsius" end, '.', '')) = 1
      and (1 = 0 or (
        instr(case when substr("espresso_machine_details"."brew_temperature_maximum_celsius", 1, 1) = '-' then substr("espresso_machine_details"."brew_temperature_maximum_celsius", 2) else "espresso_machine_details"."brew_temperature_maximum_celsius" end, '.') > 1
        and length(substr(case when substr("espresso_machine_details"."brew_temperature_maximum_celsius", 1, 1) = '-' then substr("espresso_machine_details"."brew_temperature_maximum_celsius", 2) else "espresso_machine_details"."brew_temperature_maximum_celsius" end, instr(case when substr("espresso_machine_details"."brew_temperature_maximum_celsius", 1, 1) = '-' then substr("espresso_machine_details"."brew_temperature_maximum_celsius", 2) else "espresso_machine_details"."brew_temperature_maximum_celsius" end, '.') + 1)) = 1
      ))
    )),
	CONSTRAINT "espresso_machine_details_heating_architecture_check" CHECK("espresso_machine_details"."heating_architecture" in ('single_boiler', 'heat_exchanger', 'dual_boiler', 'multi_boiler', 'single_thermoblock', 'dual_thermoblock', 'hybrid', 'manual', 'other')),
	CONSTRAINT "espresso_machine_details_temperature_control_check" CHECK("espresso_machine_details"."temperature_control" in ('none', 'fixed', 'adjustable', 'programmable')),
	CONSTRAINT "espresso_machine_details_pressure_control_check" CHECK("espresso_machine_details"."pressure_control" in ('fixed', 'adjustable_opv', 'manual', 'programmable')),
	CONSTRAINT "espresso_machine_details_flow_control_check" CHECK("espresso_machine_details"."flow_control" in ('none', 'manual', 'programmable')),
	CONSTRAINT "espresso_machine_details_preinfusion_control_check" CHECK("espresso_machine_details"."preinfusion_control" in ('none', 'supported', 'fixed', 'adjustable', 'programmable')),
	CONSTRAINT "espresso_machine_details_shot_stop_modes_check" CHECK("espresso_machine_details"."shot_stop_modes" is null or (
      json_valid("espresso_machine_details"."shot_stop_modes") and json_type("espresso_machine_details"."shot_stop_modes") = 'array'
      and replace(replace(replace(replace(replace(json("espresso_machine_details"."shot_stop_modes"), '"manual"', ''), '"weight"', ''), '"time"', ''), '"volume"', ''), ',', '') = '[]'
    )),
	CONSTRAINT "espresso_machine_details_steam_system_check" CHECK("espresso_machine_details"."steam_system" in ('none', 'shared_heater', 'dedicated_heater')),
	CONSTRAINT "espresso_machine_details_pump_type_check" CHECK("espresso_machine_details"."pump_type" in ('vibration', 'rotary', 'gear', 'peristaltic', 'manual', 'other')),
	CONSTRAINT "espresso_machine_details_water_source_modes_check" CHECK("espresso_machine_details"."water_source_modes" is null or (
      json_valid("espresso_machine_details"."water_source_modes") and json_type("espresso_machine_details"."water_source_modes") = 'array'
      and replace(replace(replace(json("espresso_machine_details"."water_source_modes"), '"reservoir"', ''), '"plumbed"', ''), ',', '') = '[]'
    )),
	CONSTRAINT "espresso_machine_details_measurements_check" CHECK(("espresso_machine_details"."portafilter_diameter_mm" is null or cast("espresso_machine_details"."portafilter_diameter_mm" as real) > 0)
        and ("espresso_machine_details"."group_count" is null or "espresso_machine_details"."group_count" > 0)
        and ("espresso_machine_details"."brew_pressure_minimum_bar" is null or cast("espresso_machine_details"."brew_pressure_minimum_bar" as real) >= 0)
        and ("espresso_machine_details"."brew_pressure_maximum_bar" is null or cast("espresso_machine_details"."brew_pressure_maximum_bar" as real) >= 0)
        and ("espresso_machine_details"."brew_pressure_minimum_bar" is null or "espresso_machine_details"."brew_pressure_maximum_bar" is null or cast("espresso_machine_details"."brew_pressure_minimum_bar" as real) <= cast("espresso_machine_details"."brew_pressure_maximum_bar" as real))
        and ("espresso_machine_details"."brew_temperature_minimum_celsius" is null or "espresso_machine_details"."brew_temperature_maximum_celsius" is null or cast("espresso_machine_details"."brew_temperature_minimum_celsius" as real) <= cast("espresso_machine_details"."brew_temperature_maximum_celsius" as real)))
);
--> statement-breakpoint
CREATE INDEX `espresso_machine_details_owner_id_idx` ON `espresso_machine_details` (`owner_id`);--> statement-breakpoint
CREATE TABLE `espresso_machine_setting_revisions` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gear_id` integer NOT NULL,
	`kind` text NOT NULL,
	`brew_pressure_bar` text,
	`preinfusion_enabled` integer,
	`preinfusion_time_seconds` text,
	`preinfusion_pressure_bar` text,
	`flow_limit_ml_per_second` text,
	`brew_temperature_offset_celsius` text,
	`programmed_volume_ml` text,
	`default_stop_mode` text,
	`steam_temperature_celsius` text,
	`steam_pressure_bar` text,
	`effective_from` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`superseded_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`gear_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`gear_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "espresso_machine_setting_revisions_brewPressureBar_decimal" CHECK("espresso_machine_setting_revisions"."brew_pressure_bar" is null or (
      typeof("espresso_machine_setting_revisions"."brew_pressure_bar") = 'text'
      and case when substr("espresso_machine_setting_revisions"."brew_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."brew_pressure_bar", 2) else "espresso_machine_setting_revisions"."brew_pressure_bar" end not glob '*[^0-9.]*'
      and case when substr("espresso_machine_setting_revisions"."brew_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."brew_pressure_bar", 2) else "espresso_machine_setting_revisions"."brew_pressure_bar" end glob '[0-9]*'
      and length(replace(case when substr("espresso_machine_setting_revisions"."brew_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."brew_pressure_bar", 2) else "espresso_machine_setting_revisions"."brew_pressure_bar" end, '.', '')) between 1 and 4
      and length(case when substr("espresso_machine_setting_revisions"."brew_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."brew_pressure_bar", 2) else "espresso_machine_setting_revisions"."brew_pressure_bar" end) - length(replace(case when substr("espresso_machine_setting_revisions"."brew_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."brew_pressure_bar", 2) else "espresso_machine_setting_revisions"."brew_pressure_bar" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("espresso_machine_setting_revisions"."brew_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."brew_pressure_bar", 2) else "espresso_machine_setting_revisions"."brew_pressure_bar" end, '.') > 1
        and length(substr(case when substr("espresso_machine_setting_revisions"."brew_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."brew_pressure_bar", 2) else "espresso_machine_setting_revisions"."brew_pressure_bar" end, instr(case when substr("espresso_machine_setting_revisions"."brew_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."brew_pressure_bar", 2) else "espresso_machine_setting_revisions"."brew_pressure_bar" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "espresso_machine_setting_revisions_preinfusionEnabled_boolean" CHECK("espresso_machine_setting_revisions"."preinfusion_enabled" in (0, 1)),
	CONSTRAINT "espresso_machine_setting_revisions_preinfusionTimeSeconds_decimal" CHECK("espresso_machine_setting_revisions"."preinfusion_time_seconds" is null or (
      typeof("espresso_machine_setting_revisions"."preinfusion_time_seconds") = 'text'
      and case when substr("espresso_machine_setting_revisions"."preinfusion_time_seconds", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."preinfusion_time_seconds", 2) else "espresso_machine_setting_revisions"."preinfusion_time_seconds" end not glob '*[^0-9.]*'
      and case when substr("espresso_machine_setting_revisions"."preinfusion_time_seconds", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."preinfusion_time_seconds", 2) else "espresso_machine_setting_revisions"."preinfusion_time_seconds" end glob '[0-9]*'
      and length(replace(case when substr("espresso_machine_setting_revisions"."preinfusion_time_seconds", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."preinfusion_time_seconds", 2) else "espresso_machine_setting_revisions"."preinfusion_time_seconds" end, '.', '')) between 1 and 5
      and length(case when substr("espresso_machine_setting_revisions"."preinfusion_time_seconds", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."preinfusion_time_seconds", 2) else "espresso_machine_setting_revisions"."preinfusion_time_seconds" end) - length(replace(case when substr("espresso_machine_setting_revisions"."preinfusion_time_seconds", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."preinfusion_time_seconds", 2) else "espresso_machine_setting_revisions"."preinfusion_time_seconds" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("espresso_machine_setting_revisions"."preinfusion_time_seconds", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."preinfusion_time_seconds", 2) else "espresso_machine_setting_revisions"."preinfusion_time_seconds" end, '.') > 1
        and length(substr(case when substr("espresso_machine_setting_revisions"."preinfusion_time_seconds", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."preinfusion_time_seconds", 2) else "espresso_machine_setting_revisions"."preinfusion_time_seconds" end, instr(case when substr("espresso_machine_setting_revisions"."preinfusion_time_seconds", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."preinfusion_time_seconds", 2) else "espresso_machine_setting_revisions"."preinfusion_time_seconds" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "espresso_machine_setting_revisions_preinfusionPressureBar_decimal" CHECK("espresso_machine_setting_revisions"."preinfusion_pressure_bar" is null or (
      typeof("espresso_machine_setting_revisions"."preinfusion_pressure_bar") = 'text'
      and case when substr("espresso_machine_setting_revisions"."preinfusion_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."preinfusion_pressure_bar", 2) else "espresso_machine_setting_revisions"."preinfusion_pressure_bar" end not glob '*[^0-9.]*'
      and case when substr("espresso_machine_setting_revisions"."preinfusion_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."preinfusion_pressure_bar", 2) else "espresso_machine_setting_revisions"."preinfusion_pressure_bar" end glob '[0-9]*'
      and length(replace(case when substr("espresso_machine_setting_revisions"."preinfusion_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."preinfusion_pressure_bar", 2) else "espresso_machine_setting_revisions"."preinfusion_pressure_bar" end, '.', '')) between 1 and 4
      and length(case when substr("espresso_machine_setting_revisions"."preinfusion_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."preinfusion_pressure_bar", 2) else "espresso_machine_setting_revisions"."preinfusion_pressure_bar" end) - length(replace(case when substr("espresso_machine_setting_revisions"."preinfusion_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."preinfusion_pressure_bar", 2) else "espresso_machine_setting_revisions"."preinfusion_pressure_bar" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("espresso_machine_setting_revisions"."preinfusion_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."preinfusion_pressure_bar", 2) else "espresso_machine_setting_revisions"."preinfusion_pressure_bar" end, '.') > 1
        and length(substr(case when substr("espresso_machine_setting_revisions"."preinfusion_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."preinfusion_pressure_bar", 2) else "espresso_machine_setting_revisions"."preinfusion_pressure_bar" end, instr(case when substr("espresso_machine_setting_revisions"."preinfusion_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."preinfusion_pressure_bar", 2) else "espresso_machine_setting_revisions"."preinfusion_pressure_bar" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "espresso_machine_setting_revisions_flowLimitMlPerSecond_decimal" CHECK("espresso_machine_setting_revisions"."flow_limit_ml_per_second" is null or (
      typeof("espresso_machine_setting_revisions"."flow_limit_ml_per_second") = 'text'
      and case when substr("espresso_machine_setting_revisions"."flow_limit_ml_per_second", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."flow_limit_ml_per_second", 2) else "espresso_machine_setting_revisions"."flow_limit_ml_per_second" end not glob '*[^0-9.]*'
      and case when substr("espresso_machine_setting_revisions"."flow_limit_ml_per_second", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."flow_limit_ml_per_second", 2) else "espresso_machine_setting_revisions"."flow_limit_ml_per_second" end glob '[0-9]*'
      and length(replace(case when substr("espresso_machine_setting_revisions"."flow_limit_ml_per_second", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."flow_limit_ml_per_second", 2) else "espresso_machine_setting_revisions"."flow_limit_ml_per_second" end, '.', '')) between 1 and 4
      and length(case when substr("espresso_machine_setting_revisions"."flow_limit_ml_per_second", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."flow_limit_ml_per_second", 2) else "espresso_machine_setting_revisions"."flow_limit_ml_per_second" end) - length(replace(case when substr("espresso_machine_setting_revisions"."flow_limit_ml_per_second", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."flow_limit_ml_per_second", 2) else "espresso_machine_setting_revisions"."flow_limit_ml_per_second" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("espresso_machine_setting_revisions"."flow_limit_ml_per_second", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."flow_limit_ml_per_second", 2) else "espresso_machine_setting_revisions"."flow_limit_ml_per_second" end, '.') > 1
        and length(substr(case when substr("espresso_machine_setting_revisions"."flow_limit_ml_per_second", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."flow_limit_ml_per_second", 2) else "espresso_machine_setting_revisions"."flow_limit_ml_per_second" end, instr(case when substr("espresso_machine_setting_revisions"."flow_limit_ml_per_second", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."flow_limit_ml_per_second", 2) else "espresso_machine_setting_revisions"."flow_limit_ml_per_second" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "espresso_machine_setting_revisions_brewTemperatureOffsetCelsius_decimal" CHECK("espresso_machine_setting_revisions"."brew_temperature_offset_celsius" is null or (
      typeof("espresso_machine_setting_revisions"."brew_temperature_offset_celsius") = 'text'
      and case when substr("espresso_machine_setting_revisions"."brew_temperature_offset_celsius", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."brew_temperature_offset_celsius", 2) else "espresso_machine_setting_revisions"."brew_temperature_offset_celsius" end not glob '*[^0-9.]*'
      and case when substr("espresso_machine_setting_revisions"."brew_temperature_offset_celsius", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."brew_temperature_offset_celsius", 2) else "espresso_machine_setting_revisions"."brew_temperature_offset_celsius" end glob '[0-9]*'
      and length(replace(case when substr("espresso_machine_setting_revisions"."brew_temperature_offset_celsius", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."brew_temperature_offset_celsius", 2) else "espresso_machine_setting_revisions"."brew_temperature_offset_celsius" end, '.', '')) between 1 and 4
      and length(case when substr("espresso_machine_setting_revisions"."brew_temperature_offset_celsius", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."brew_temperature_offset_celsius", 2) else "espresso_machine_setting_revisions"."brew_temperature_offset_celsius" end) - length(replace(case when substr("espresso_machine_setting_revisions"."brew_temperature_offset_celsius", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."brew_temperature_offset_celsius", 2) else "espresso_machine_setting_revisions"."brew_temperature_offset_celsius" end, '.', '')) = 1
      and (1 = 0 or (
        instr(case when substr("espresso_machine_setting_revisions"."brew_temperature_offset_celsius", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."brew_temperature_offset_celsius", 2) else "espresso_machine_setting_revisions"."brew_temperature_offset_celsius" end, '.') > 1
        and length(substr(case when substr("espresso_machine_setting_revisions"."brew_temperature_offset_celsius", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."brew_temperature_offset_celsius", 2) else "espresso_machine_setting_revisions"."brew_temperature_offset_celsius" end, instr(case when substr("espresso_machine_setting_revisions"."brew_temperature_offset_celsius", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."brew_temperature_offset_celsius", 2) else "espresso_machine_setting_revisions"."brew_temperature_offset_celsius" end, '.') + 1)) = 1
      ))
    )),
	CONSTRAINT "espresso_machine_setting_revisions_programmedVolumeMl_decimal" CHECK("espresso_machine_setting_revisions"."programmed_volume_ml" is null or (
      typeof("espresso_machine_setting_revisions"."programmed_volume_ml") = 'text'
      and case when substr("espresso_machine_setting_revisions"."programmed_volume_ml", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."programmed_volume_ml", 2) else "espresso_machine_setting_revisions"."programmed_volume_ml" end not glob '*[^0-9.]*'
      and case when substr("espresso_machine_setting_revisions"."programmed_volume_ml", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."programmed_volume_ml", 2) else "espresso_machine_setting_revisions"."programmed_volume_ml" end glob '[0-9]*'
      and length(replace(case when substr("espresso_machine_setting_revisions"."programmed_volume_ml", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."programmed_volume_ml", 2) else "espresso_machine_setting_revisions"."programmed_volume_ml" end, '.', '')) between 1 and 6
      and length(case when substr("espresso_machine_setting_revisions"."programmed_volume_ml", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."programmed_volume_ml", 2) else "espresso_machine_setting_revisions"."programmed_volume_ml" end) - length(replace(case when substr("espresso_machine_setting_revisions"."programmed_volume_ml", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."programmed_volume_ml", 2) else "espresso_machine_setting_revisions"."programmed_volume_ml" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("espresso_machine_setting_revisions"."programmed_volume_ml", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."programmed_volume_ml", 2) else "espresso_machine_setting_revisions"."programmed_volume_ml" end, '.') > 1
        and length(substr(case when substr("espresso_machine_setting_revisions"."programmed_volume_ml", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."programmed_volume_ml", 2) else "espresso_machine_setting_revisions"."programmed_volume_ml" end, instr(case when substr("espresso_machine_setting_revisions"."programmed_volume_ml", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."programmed_volume_ml", 2) else "espresso_machine_setting_revisions"."programmed_volume_ml" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "espresso_machine_setting_revisions_steamTemperatureCelsius_decimal" CHECK("espresso_machine_setting_revisions"."steam_temperature_celsius" is null or (
      typeof("espresso_machine_setting_revisions"."steam_temperature_celsius") = 'text'
      and case when substr("espresso_machine_setting_revisions"."steam_temperature_celsius", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."steam_temperature_celsius", 2) else "espresso_machine_setting_revisions"."steam_temperature_celsius" end not glob '*[^0-9.]*'
      and case when substr("espresso_machine_setting_revisions"."steam_temperature_celsius", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."steam_temperature_celsius", 2) else "espresso_machine_setting_revisions"."steam_temperature_celsius" end glob '[0-9]*'
      and length(replace(case when substr("espresso_machine_setting_revisions"."steam_temperature_celsius", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."steam_temperature_celsius", 2) else "espresso_machine_setting_revisions"."steam_temperature_celsius" end, '.', '')) between 1 and 4
      and length(case when substr("espresso_machine_setting_revisions"."steam_temperature_celsius", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."steam_temperature_celsius", 2) else "espresso_machine_setting_revisions"."steam_temperature_celsius" end) - length(replace(case when substr("espresso_machine_setting_revisions"."steam_temperature_celsius", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."steam_temperature_celsius", 2) else "espresso_machine_setting_revisions"."steam_temperature_celsius" end, '.', '')) = 1
      and (1 = 0 or (
        instr(case when substr("espresso_machine_setting_revisions"."steam_temperature_celsius", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."steam_temperature_celsius", 2) else "espresso_machine_setting_revisions"."steam_temperature_celsius" end, '.') > 1
        and length(substr(case when substr("espresso_machine_setting_revisions"."steam_temperature_celsius", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."steam_temperature_celsius", 2) else "espresso_machine_setting_revisions"."steam_temperature_celsius" end, instr(case when substr("espresso_machine_setting_revisions"."steam_temperature_celsius", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."steam_temperature_celsius", 2) else "espresso_machine_setting_revisions"."steam_temperature_celsius" end, '.') + 1)) = 1
      ))
    )),
	CONSTRAINT "espresso_machine_setting_revisions_steamPressureBar_decimal" CHECK("espresso_machine_setting_revisions"."steam_pressure_bar" is null or (
      typeof("espresso_machine_setting_revisions"."steam_pressure_bar") = 'text'
      and case when substr("espresso_machine_setting_revisions"."steam_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."steam_pressure_bar", 2) else "espresso_machine_setting_revisions"."steam_pressure_bar" end not glob '*[^0-9.]*'
      and case when substr("espresso_machine_setting_revisions"."steam_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."steam_pressure_bar", 2) else "espresso_machine_setting_revisions"."steam_pressure_bar" end glob '[0-9]*'
      and length(replace(case when substr("espresso_machine_setting_revisions"."steam_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."steam_pressure_bar", 2) else "espresso_machine_setting_revisions"."steam_pressure_bar" end, '.', '')) between 1 and 4
      and length(case when substr("espresso_machine_setting_revisions"."steam_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."steam_pressure_bar", 2) else "espresso_machine_setting_revisions"."steam_pressure_bar" end) - length(replace(case when substr("espresso_machine_setting_revisions"."steam_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."steam_pressure_bar", 2) else "espresso_machine_setting_revisions"."steam_pressure_bar" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("espresso_machine_setting_revisions"."steam_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."steam_pressure_bar", 2) else "espresso_machine_setting_revisions"."steam_pressure_bar" end, '.') > 1
        and length(substr(case when substr("espresso_machine_setting_revisions"."steam_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."steam_pressure_bar", 2) else "espresso_machine_setting_revisions"."steam_pressure_bar" end, instr(case when substr("espresso_machine_setting_revisions"."steam_pressure_bar", 1, 1) = '-' then substr("espresso_machine_setting_revisions"."steam_pressure_bar", 2) else "espresso_machine_setting_revisions"."steam_pressure_bar" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "espresso_machine_setting_revisions_kind_check" CHECK("espresso_machine_setting_revisions"."kind" in ('factory', 'owner')),
	CONSTRAINT "espresso_machine_setting_revisions_stop_mode_check" CHECK("espresso_machine_setting_revisions"."default_stop_mode" in ('manual', 'weight', 'time', 'volume')),
	CONSTRAINT "espresso_machine_setting_revisions_measurements_check" CHECK(("espresso_machine_setting_revisions"."brew_pressure_bar" is null or cast("espresso_machine_setting_revisions"."brew_pressure_bar" as real) >= 0)
        and ("espresso_machine_setting_revisions"."preinfusion_time_seconds" is null or cast("espresso_machine_setting_revisions"."preinfusion_time_seconds" as real) >= 0)
        and ("espresso_machine_setting_revisions"."preinfusion_pressure_bar" is null or cast("espresso_machine_setting_revisions"."preinfusion_pressure_bar" as real) >= 0)
        and ("espresso_machine_setting_revisions"."flow_limit_ml_per_second" is null or cast("espresso_machine_setting_revisions"."flow_limit_ml_per_second" as real) >= 0)
        and ("espresso_machine_setting_revisions"."programmed_volume_ml" is null or cast("espresso_machine_setting_revisions"."programmed_volume_ml" as real) >= 0)
        and ("espresso_machine_setting_revisions"."steam_temperature_celsius" is null or cast("espresso_machine_setting_revisions"."steam_temperature_celsius" as real) >= 0)
        and ("espresso_machine_setting_revisions"."steam_pressure_bar" is null or cast("espresso_machine_setting_revisions"."steam_pressure_bar" as real) >= 0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `espresso_machine_setting_revisions_id_owner_unique` ON `espresso_machine_setting_revisions` (`owner_id`,`id`);--> statement-breakpoint
CREATE INDEX `espresso_machine_setting_revisions_owner_id_idx` ON `espresso_machine_setting_revisions` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `espresso_machine_setting_revisions_current_kind_idx` ON `espresso_machine_setting_revisions` (`owner_id`,`gear_id`,`kind`) WHERE "espresso_machine_setting_revisions"."superseded_at" is null;--> statement-breakpoint
CREATE INDEX `espresso_machine_setting_revisions_gear_id_idx` ON `espresso_machine_setting_revisions` (`gear_id`,`effective_from`);--> statement-breakpoint
CREATE TABLE `gear` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`brand` text,
	`model` text,
	`type` text NOT NULL,
	`purchase_date` integer,
	`purchase_price` text,
	`price_currency` text DEFAULT 'EUR',
	`manual_url` text,
	`product_url` text,
	`notes` text,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "gear_type_enum" CHECK("gear"."type" in ('espresso_machine', 'espresso_machine_with_grinder', 'brewer', 'grinder', 'kettle', 'scale', 'tamper', 'wdt', 'basket', 'other')),
	CONSTRAINT "gear_purchasePrice_decimal" CHECK("gear"."purchase_price" is null or (
      typeof("gear"."purchase_price") = 'text'
      and case when substr("gear"."purchase_price", 1, 1) = '-' then substr("gear"."purchase_price", 2) else "gear"."purchase_price" end not glob '*[^0-9.]*'
      and case when substr("gear"."purchase_price", 1, 1) = '-' then substr("gear"."purchase_price", 2) else "gear"."purchase_price" end glob '[0-9]*'
      and length(replace(case when substr("gear"."purchase_price", 1, 1) = '-' then substr("gear"."purchase_price", 2) else "gear"."purchase_price" end, '.', '')) between 1 and 8
      and length(case when substr("gear"."purchase_price", 1, 1) = '-' then substr("gear"."purchase_price", 2) else "gear"."purchase_price" end) - length(replace(case when substr("gear"."purchase_price", 1, 1) = '-' then substr("gear"."purchase_price", 2) else "gear"."purchase_price" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("gear"."purchase_price", 1, 1) = '-' then substr("gear"."purchase_price", 2) else "gear"."purchase_price" end, '.') > 1
        and length(substr(case when substr("gear"."purchase_price", 1, 1) = '-' then substr("gear"."purchase_price", 2) else "gear"."purchase_price" end, instr(case when substr("gear"."purchase_price", 1, 1) = '-' then substr("gear"."purchase_price", 2) else "gear"."purchase_price" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "gear_isArchived_boolean" CHECK("gear"."is_archived" in (0, 1)),
	CONSTRAINT "gear_purchase_price_nonnegative" CHECK(cast("gear"."purchase_price" as real) >= 0),
	CONSTRAINT "gear_currency_check" CHECK("gear"."price_currency" in ('EUR', 'USD', 'GBP', 'CHF'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gear_id_owner_unique` ON `gear` (`owner_id`,`id`);--> statement-breakpoint
CREATE INDEX `gear_owner_id_idx` ON `gear` (`owner_id`);--> statement-breakpoint
CREATE INDEX `gear_created_at_idx` ON `gear` (`created_at`);--> statement-breakpoint
CREATE TABLE `gear_images` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gear_id` integer NOT NULL,
	`storage_path` text NOT NULL,
	`original_filename` text,
	`mime_type` text,
	`size_bytes` integer,
	`is_thumbnail` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`gear_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`gear_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "gear_images_isThumbnail_boolean" CHECK("gear_images"."is_thumbnail" in (0, 1))
);
--> statement-breakpoint
CREATE INDEX `gear_images_owner_id_idx` ON `gear_images` (`owner_id`);--> statement-breakpoint
CREATE INDEX `gear_images_gear_id_idx` ON `gear_images` (`gear_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `gear_images_one_thumbnail_idx` ON `gear_images` (`owner_id`,`gear_id`) WHERE "gear_images"."is_thumbnail" = true;--> statement-breakpoint
CREATE TABLE `gear_property_evidence` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gear_id` integer NOT NULL,
	`property_key` text NOT NULL,
	`value_json` text NOT NULL,
	`source_url` text NOT NULL,
	`source_title` text,
	`source_kind` text NOT NULL,
	`raw_value` text,
	`raw_unit` text,
	`retrieved_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`accepted_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`gear_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`gear_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "gear_property_evidence_valueJson_json" CHECK("gear_property_evidence"."value_json" is null or json_valid("gear_property_evidence"."value_json")),
	CONSTRAINT "gear_property_evidence_source_kind_check" CHECK("gear_property_evidence"."source_kind" in ('manual', 'manufacturer', 'specialist', 'retailer', 'community'))
);
--> statement-breakpoint
CREATE INDEX `gear_property_evidence_owner_id_idx` ON `gear_property_evidence` (`owner_id`);--> statement-breakpoint
CREATE INDEX `gear_property_evidence_gear_property_idx` ON `gear_property_evidence` (`gear_id`,`property_key`);--> statement-breakpoint
CREATE TABLE `gear_set_accessory_gear` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`gear_set_id` integer NOT NULL,
	`gear_id` integer NOT NULL,
	FOREIGN KEY (`gear_set_id`) REFERENCES `gear_sets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`gear_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`gear_set_id`) REFERENCES `gear_sets`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`gear_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `gear_set_accessory_gear_owner_id_idx` ON `gear_set_accessory_gear` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `gear_set_accessory_gear_set_gear_idx` ON `gear_set_accessory_gear` (`owner_id`,`gear_set_id`,`gear_id`);--> statement-breakpoint
CREATE INDEX `gear_set_accessory_gear_gear_id_idx` ON `gear_set_accessory_gear` (`gear_id`);--> statement-breakpoint
CREATE TABLE `gear_sets` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`machine_id` integer,
	`grinder_id` integer,
	`basket_id` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`machine_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`grinder_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`basket_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_id`,`machine_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`grinder_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`basket_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gear_sets_id_owner_unique` ON `gear_sets` (`owner_id`,`id`);--> statement-breakpoint
CREATE INDEX `gear_sets_owner_id_idx` ON `gear_sets` (`owner_id`);--> statement-breakpoint
CREATE INDEX `gear_sets_created_at_idx` ON `gear_sets` (`created_at`);--> statement-breakpoint
CREATE TABLE `grinder_details` (
	`owner_id` text NOT NULL,
	`gear_id` integer PRIMARY KEY NOT NULL,
	`burr_mechanism` text,
	`burr_diameter_mm` text,
	`adjustment_type` text,
	`grind_setting_format` text DEFAULT 'string' NOT NULL,
	`grind_setting_minimum` text,
	`grind_setting_maximum` text,
	`brew_range` text,
	`bean_feed` text,
	`dose_control_modes` text,
	`burr_material` text,
	FOREIGN KEY (`gear_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`gear_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "grinder_details_burrDiameterMm_decimal" CHECK("grinder_details"."burr_diameter_mm" is null or (
      typeof("grinder_details"."burr_diameter_mm") = 'text'
      and case when substr("grinder_details"."burr_diameter_mm", 1, 1) = '-' then substr("grinder_details"."burr_diameter_mm", 2) else "grinder_details"."burr_diameter_mm" end not glob '*[^0-9.]*'
      and case when substr("grinder_details"."burr_diameter_mm", 1, 1) = '-' then substr("grinder_details"."burr_diameter_mm", 2) else "grinder_details"."burr_diameter_mm" end glob '[0-9]*'
      and length(replace(case when substr("grinder_details"."burr_diameter_mm", 1, 1) = '-' then substr("grinder_details"."burr_diameter_mm", 2) else "grinder_details"."burr_diameter_mm" end, '.', '')) between 1 and 5
      and length(case when substr("grinder_details"."burr_diameter_mm", 1, 1) = '-' then substr("grinder_details"."burr_diameter_mm", 2) else "grinder_details"."burr_diameter_mm" end) - length(replace(case when substr("grinder_details"."burr_diameter_mm", 1, 1) = '-' then substr("grinder_details"."burr_diameter_mm", 2) else "grinder_details"."burr_diameter_mm" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("grinder_details"."burr_diameter_mm", 1, 1) = '-' then substr("grinder_details"."burr_diameter_mm", 2) else "grinder_details"."burr_diameter_mm" end, '.') > 1
        and length(substr(case when substr("grinder_details"."burr_diameter_mm", 1, 1) = '-' then substr("grinder_details"."burr_diameter_mm", 2) else "grinder_details"."burr_diameter_mm" end, instr(case when substr("grinder_details"."burr_diameter_mm", 1, 1) = '-' then substr("grinder_details"."burr_diameter_mm", 2) else "grinder_details"."burr_diameter_mm" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "grinder_details_grindSettingMinimum_decimal" CHECK("grinder_details"."grind_setting_minimum" is null or (
      typeof("grinder_details"."grind_setting_minimum") = 'text'
      and case when substr("grinder_details"."grind_setting_minimum", 1, 1) = '-' then substr("grinder_details"."grind_setting_minimum", 2) else "grinder_details"."grind_setting_minimum" end not glob '*[^0-9.]*'
      and case when substr("grinder_details"."grind_setting_minimum", 1, 1) = '-' then substr("grinder_details"."grind_setting_minimum", 2) else "grinder_details"."grind_setting_minimum" end glob '[0-9]*'
      and length(replace(case when substr("grinder_details"."grind_setting_minimum", 1, 1) = '-' then substr("grinder_details"."grind_setting_minimum", 2) else "grinder_details"."grind_setting_minimum" end, '.', '')) between 1 and 7
      and length(case when substr("grinder_details"."grind_setting_minimum", 1, 1) = '-' then substr("grinder_details"."grind_setting_minimum", 2) else "grinder_details"."grind_setting_minimum" end) - length(replace(case when substr("grinder_details"."grind_setting_minimum", 1, 1) = '-' then substr("grinder_details"."grind_setting_minimum", 2) else "grinder_details"."grind_setting_minimum" end, '.', '')) = 1
      and (3 = 0 or (
        instr(case when substr("grinder_details"."grind_setting_minimum", 1, 1) = '-' then substr("grinder_details"."grind_setting_minimum", 2) else "grinder_details"."grind_setting_minimum" end, '.') > 1
        and length(substr(case when substr("grinder_details"."grind_setting_minimum", 1, 1) = '-' then substr("grinder_details"."grind_setting_minimum", 2) else "grinder_details"."grind_setting_minimum" end, instr(case when substr("grinder_details"."grind_setting_minimum", 1, 1) = '-' then substr("grinder_details"."grind_setting_minimum", 2) else "grinder_details"."grind_setting_minimum" end, '.') + 1)) = 3
      ))
    )),
	CONSTRAINT "grinder_details_grindSettingMaximum_decimal" CHECK("grinder_details"."grind_setting_maximum" is null or (
      typeof("grinder_details"."grind_setting_maximum") = 'text'
      and case when substr("grinder_details"."grind_setting_maximum", 1, 1) = '-' then substr("grinder_details"."grind_setting_maximum", 2) else "grinder_details"."grind_setting_maximum" end not glob '*[^0-9.]*'
      and case when substr("grinder_details"."grind_setting_maximum", 1, 1) = '-' then substr("grinder_details"."grind_setting_maximum", 2) else "grinder_details"."grind_setting_maximum" end glob '[0-9]*'
      and length(replace(case when substr("grinder_details"."grind_setting_maximum", 1, 1) = '-' then substr("grinder_details"."grind_setting_maximum", 2) else "grinder_details"."grind_setting_maximum" end, '.', '')) between 1 and 7
      and length(case when substr("grinder_details"."grind_setting_maximum", 1, 1) = '-' then substr("grinder_details"."grind_setting_maximum", 2) else "grinder_details"."grind_setting_maximum" end) - length(replace(case when substr("grinder_details"."grind_setting_maximum", 1, 1) = '-' then substr("grinder_details"."grind_setting_maximum", 2) else "grinder_details"."grind_setting_maximum" end, '.', '')) = 1
      and (3 = 0 or (
        instr(case when substr("grinder_details"."grind_setting_maximum", 1, 1) = '-' then substr("grinder_details"."grind_setting_maximum", 2) else "grinder_details"."grind_setting_maximum" end, '.') > 1
        and length(substr(case when substr("grinder_details"."grind_setting_maximum", 1, 1) = '-' then substr("grinder_details"."grind_setting_maximum", 2) else "grinder_details"."grind_setting_maximum" end, instr(case when substr("grinder_details"."grind_setting_maximum", 1, 1) = '-' then substr("grinder_details"."grind_setting_maximum", 2) else "grinder_details"."grind_setting_maximum" end, '.') + 1)) = 3
      ))
    )),
	CONSTRAINT "grinder_details_brewRange_json_array" CHECK("grinder_details"."brew_range" is null or (json_valid("grinder_details"."brew_range") and json_type("grinder_details"."brew_range") = 'array')),
	CONSTRAINT "grinder_details_doseControlModes_json_array" CHECK("grinder_details"."dose_control_modes" is null or (json_valid("grinder_details"."dose_control_modes") and json_type("grinder_details"."dose_control_modes") = 'array')),
	CONSTRAINT "grinder_details_burr_mechanism_check" CHECK("grinder_details"."burr_mechanism" in ('conical', 'flat', 'ghost', 'roller', 'blade', 'other')),
	CONSTRAINT "grinder_details_adjustment_type_check" CHECK("grinder_details"."adjustment_type" in ('fixed', 'stepped', 'stepless')),
	CONSTRAINT "grinder_details_grind_setting_format_check" CHECK("grinder_details"."grind_setting_format" in ('whole_number', 'decimal', 'string')),
	CONSTRAINT "grinder_details_brew_range_check" CHECK("grinder_details"."brew_range" is null or (
      json_valid("grinder_details"."brew_range") and json_type("grinder_details"."brew_range") = 'array'
      and replace(replace(replace(json("grinder_details"."brew_range"), '"espresso"', ''), '"filter"', ''), ',', '') = '[]'
    )),
	CONSTRAINT "grinder_details_bean_feed_check" CHECK("grinder_details"."bean_feed" in ('single_dose', 'hopper', 'both')),
	CONSTRAINT "grinder_details_dose_control_modes_check" CHECK("grinder_details"."dose_control_modes" is null or (
      json_valid("grinder_details"."dose_control_modes") and json_type("grinder_details"."dose_control_modes") = 'array'
      and replace(replace(replace(replace(json("grinder_details"."dose_control_modes"), '"manual"', ''), '"time"', ''), '"weight"', ''), ',', '') = '[]'
    )),
	CONSTRAINT "grinder_details_burr_material_check" CHECK("grinder_details"."burr_material" in ('steel', 'ceramic', 'other')),
	CONSTRAINT "grinder_details_burr_diameter_check" CHECK("grinder_details"."burr_diameter_mm" is null or cast("grinder_details"."burr_diameter_mm" as real) > 0),
	CONSTRAINT "grinder_details_grind_setting_range_check" CHECK(("grinder_details"."grind_setting_minimum" is null or cast("grinder_details"."grind_setting_minimum" as real) >= 0)
        and ("grinder_details"."grind_setting_maximum" is null or cast("grinder_details"."grind_setting_maximum" as real) >= 0)
        and ("grinder_details"."grind_setting_minimum" is null or "grinder_details"."grind_setting_maximum" is null or cast("grinder_details"."grind_setting_minimum" as real) <= cast("grinder_details"."grind_setting_maximum" as real))
        and ("grinder_details"."grind_setting_format" <> 'string' or ("grinder_details"."grind_setting_minimum" is null and "grinder_details"."grind_setting_maximum" is null))
        and ("grinder_details"."grind_setting_format" <> 'whole_number' or "grinder_details"."grind_setting_minimum" is null or trunc(cast("grinder_details"."grind_setting_minimum" as real)) = cast("grinder_details"."grind_setting_minimum" as real))
        and ("grinder_details"."grind_setting_format" <> 'whole_number' or "grinder_details"."grind_setting_maximum" is null or trunc(cast("grinder_details"."grind_setting_maximum" as real)) = cast("grinder_details"."grind_setting_maximum" as real)))
);
--> statement-breakpoint
CREATE INDEX `grinder_details_owner_id_idx` ON `grinder_details` (`owner_id`);--> statement-breakpoint
CREATE TABLE `instance_identity` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`default_user_id` text DEFAULT 'local' NOT NULL,
	`bootstrap_completed_at` integer
);
--> statement-breakpoint
CREATE TABLE `integration_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`token_hash` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "integration_tokens_kind_enum" CHECK("integration_tokens"."kind" in ('mcp', 'shottimer'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `integration_tokens_token_hash_unique` ON `integration_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `integration_tokens_user_id_idx` ON `integration_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `journal_id_counters` (
	`table_name` text PRIMARY KEY NOT NULL,
	`value` integer NOT NULL,
	CONSTRAINT "journal_id_counters_nonnegative" CHECK("journal_id_counters"."value" >= 0)
);
--> statement-breakpoint
CREATE TABLE `journal_mutation_assertions` (
	`id` text PRIMARY KEY NOT NULL,
	`expected_changes` integer NOT NULL,
	`actual_changes` integer NOT NULL,
	CONSTRAINT "journal_mutation_assertions_match" CHECK("journal_mutation_assertions"."actual_changes" = "journal_mutation_assertions"."expected_changes")
);
--> statement-breakpoint
CREATE TABLE `jwks` (
	`id` text PRIMARY KEY NOT NULL,
	`public_key` text NOT NULL,
	`private_key` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer,
	`alg` text,
	`crv` text
);
--> statement-breakpoint
CREATE TABLE `kettle_details` (
	`owner_id` text NOT NULL,
	`gear_id` integer PRIMARY KEY NOT NULL,
	`capacity_ml` text,
	`spout_type` text,
	`temperature_control` text,
	`minimum_temperature_celsius` text,
	`maximum_temperature_celsius` text,
	`supports_temperature_hold` integer,
	FOREIGN KEY (`gear_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`gear_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "kettle_details_capacityMl_decimal" CHECK("kettle_details"."capacity_ml" is null or (
      typeof("kettle_details"."capacity_ml") = 'text'
      and case when substr("kettle_details"."capacity_ml", 1, 1) = '-' then substr("kettle_details"."capacity_ml", 2) else "kettle_details"."capacity_ml" end not glob '*[^0-9.]*'
      and case when substr("kettle_details"."capacity_ml", 1, 1) = '-' then substr("kettle_details"."capacity_ml", 2) else "kettle_details"."capacity_ml" end glob '[0-9]*'
      and length(replace(case when substr("kettle_details"."capacity_ml", 1, 1) = '-' then substr("kettle_details"."capacity_ml", 2) else "kettle_details"."capacity_ml" end, '.', '')) between 1 and 7
      and length(case when substr("kettle_details"."capacity_ml", 1, 1) = '-' then substr("kettle_details"."capacity_ml", 2) else "kettle_details"."capacity_ml" end) - length(replace(case when substr("kettle_details"."capacity_ml", 1, 1) = '-' then substr("kettle_details"."capacity_ml", 2) else "kettle_details"."capacity_ml" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("kettle_details"."capacity_ml", 1, 1) = '-' then substr("kettle_details"."capacity_ml", 2) else "kettle_details"."capacity_ml" end, '.') > 1
        and length(substr(case when substr("kettle_details"."capacity_ml", 1, 1) = '-' then substr("kettle_details"."capacity_ml", 2) else "kettle_details"."capacity_ml" end, instr(case when substr("kettle_details"."capacity_ml", 1, 1) = '-' then substr("kettle_details"."capacity_ml", 2) else "kettle_details"."capacity_ml" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "kettle_details_minimumTemperatureCelsius_decimal" CHECK("kettle_details"."minimum_temperature_celsius" is null or (
      typeof("kettle_details"."minimum_temperature_celsius") = 'text'
      and case when substr("kettle_details"."minimum_temperature_celsius", 1, 1) = '-' then substr("kettle_details"."minimum_temperature_celsius", 2) else "kettle_details"."minimum_temperature_celsius" end not glob '*[^0-9.]*'
      and case when substr("kettle_details"."minimum_temperature_celsius", 1, 1) = '-' then substr("kettle_details"."minimum_temperature_celsius", 2) else "kettle_details"."minimum_temperature_celsius" end glob '[0-9]*'
      and length(replace(case when substr("kettle_details"."minimum_temperature_celsius", 1, 1) = '-' then substr("kettle_details"."minimum_temperature_celsius", 2) else "kettle_details"."minimum_temperature_celsius" end, '.', '')) between 1 and 4
      and length(case when substr("kettle_details"."minimum_temperature_celsius", 1, 1) = '-' then substr("kettle_details"."minimum_temperature_celsius", 2) else "kettle_details"."minimum_temperature_celsius" end) - length(replace(case when substr("kettle_details"."minimum_temperature_celsius", 1, 1) = '-' then substr("kettle_details"."minimum_temperature_celsius", 2) else "kettle_details"."minimum_temperature_celsius" end, '.', '')) = 1
      and (1 = 0 or (
        instr(case when substr("kettle_details"."minimum_temperature_celsius", 1, 1) = '-' then substr("kettle_details"."minimum_temperature_celsius", 2) else "kettle_details"."minimum_temperature_celsius" end, '.') > 1
        and length(substr(case when substr("kettle_details"."minimum_temperature_celsius", 1, 1) = '-' then substr("kettle_details"."minimum_temperature_celsius", 2) else "kettle_details"."minimum_temperature_celsius" end, instr(case when substr("kettle_details"."minimum_temperature_celsius", 1, 1) = '-' then substr("kettle_details"."minimum_temperature_celsius", 2) else "kettle_details"."minimum_temperature_celsius" end, '.') + 1)) = 1
      ))
    )),
	CONSTRAINT "kettle_details_maximumTemperatureCelsius_decimal" CHECK("kettle_details"."maximum_temperature_celsius" is null or (
      typeof("kettle_details"."maximum_temperature_celsius") = 'text'
      and case when substr("kettle_details"."maximum_temperature_celsius", 1, 1) = '-' then substr("kettle_details"."maximum_temperature_celsius", 2) else "kettle_details"."maximum_temperature_celsius" end not glob '*[^0-9.]*'
      and case when substr("kettle_details"."maximum_temperature_celsius", 1, 1) = '-' then substr("kettle_details"."maximum_temperature_celsius", 2) else "kettle_details"."maximum_temperature_celsius" end glob '[0-9]*'
      and length(replace(case when substr("kettle_details"."maximum_temperature_celsius", 1, 1) = '-' then substr("kettle_details"."maximum_temperature_celsius", 2) else "kettle_details"."maximum_temperature_celsius" end, '.', '')) between 1 and 4
      and length(case when substr("kettle_details"."maximum_temperature_celsius", 1, 1) = '-' then substr("kettle_details"."maximum_temperature_celsius", 2) else "kettle_details"."maximum_temperature_celsius" end) - length(replace(case when substr("kettle_details"."maximum_temperature_celsius", 1, 1) = '-' then substr("kettle_details"."maximum_temperature_celsius", 2) else "kettle_details"."maximum_temperature_celsius" end, '.', '')) = 1
      and (1 = 0 or (
        instr(case when substr("kettle_details"."maximum_temperature_celsius", 1, 1) = '-' then substr("kettle_details"."maximum_temperature_celsius", 2) else "kettle_details"."maximum_temperature_celsius" end, '.') > 1
        and length(substr(case when substr("kettle_details"."maximum_temperature_celsius", 1, 1) = '-' then substr("kettle_details"."maximum_temperature_celsius", 2) else "kettle_details"."maximum_temperature_celsius" end, instr(case when substr("kettle_details"."maximum_temperature_celsius", 1, 1) = '-' then substr("kettle_details"."maximum_temperature_celsius", 2) else "kettle_details"."maximum_temperature_celsius" end, '.') + 1)) = 1
      ))
    )),
	CONSTRAINT "kettle_details_supportsTemperatureHold_boolean" CHECK("kettle_details"."supports_temperature_hold" in (0, 1)),
	CONSTRAINT "kettle_details_spout_type_check" CHECK("kettle_details"."spout_type" in ('gooseneck', 'standard', 'other')),
	CONSTRAINT "kettle_details_temperature_control_check" CHECK("kettle_details"."temperature_control" in ('none', 'fixed', 'adjustable')),
	CONSTRAINT "kettle_details_measurements_check" CHECK(("kettle_details"."capacity_ml" is null or cast("kettle_details"."capacity_ml" as real) > 0)
        and ("kettle_details"."minimum_temperature_celsius" is null or cast("kettle_details"."minimum_temperature_celsius" as real) >= 0)
        and ("kettle_details"."maximum_temperature_celsius" is null or cast("kettle_details"."maximum_temperature_celsius" as real) >= 0)
        and ("kettle_details"."minimum_temperature_celsius" is null or "kettle_details"."maximum_temperature_celsius" is null or cast("kettle_details"."minimum_temperature_celsius" as real) <= cast("kettle_details"."maximum_temperature_celsius" as real)))
);
--> statement-breakpoint
CREATE INDEX `kettle_details_owner_id_idx` ON `kettle_details` (`owner_id`);--> statement-breakpoint
CREATE TABLE `mcp_audit_events` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event` text NOT NULL,
	`outcome` text NOT NULL,
	`tool_name` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `mcp_audit_events_owner_id_idx` ON `mcp_audit_events` (`owner_id`);--> statement-breakpoint
CREATE INDEX `mcp_audit_events_created_at_idx` ON `mcp_audit_events` (`created_at`);--> statement-breakpoint
CREATE TABLE `mcp_settings` (
	`owner_id` text NOT NULL,
	`id` text DEFAULT 'instance' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`disabled_tools` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`owner_id`, `id`),
	CONSTRAINT "mcp_settings_enabled_boolean" CHECK("mcp_settings"."enabled" in (0, 1)),
	CONSTRAINT "mcp_settings_disabledTools_json" CHECK("mcp_settings"."disabled_tools" is null or json_valid("mcp_settings"."disabled_tools"))
);
--> statement-breakpoint
CREATE INDEX `mcp_settings_owner_id_idx` ON `mcp_settings` (`owner_id`);--> statement-breakpoint
CREATE TABLE `media_cleanup_jobs` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`storage_path` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`next_attempt_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `media_cleanup_jobs_storage_path_unique` ON `media_cleanup_jobs` (`owner_id`,`storage_path`);--> statement-breakpoint
CREATE INDEX `media_cleanup_jobs_owner_id_idx` ON `media_cleanup_jobs` (`owner_id`);--> statement-breakpoint
CREATE INDEX `media_cleanup_jobs_next_attempt_at_idx` ON `media_cleanup_jobs` (`next_attempt_at`);--> statement-breakpoint
CREATE TABLE `oauth_access_token` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text,
	`client_id` text NOT NULL,
	`session_id` text,
	`user_id` text,
	`reference_id` text,
	`authorization_code_id` text,
	`resources` text,
	`requested_user_info_claims` text,
	`refresh_id` text,
	`expires_at` integer,
	`created_at` integer,
	`revoked` integer,
	`confirmation` text,
	`scopes` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `oauth_client`(`client_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `auth_sessions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`refresh_id`) REFERENCES `oauth_refresh_token`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "oauth_access_token_resources_json_array" CHECK("oauth_access_token"."resources" is null or (json_valid("oauth_access_token"."resources") and json_type("oauth_access_token"."resources") = 'array')),
	CONSTRAINT "oauth_access_token_requestedUserInfoClaims_json_array" CHECK("oauth_access_token"."requested_user_info_claims" is null or (json_valid("oauth_access_token"."requested_user_info_claims") and json_type("oauth_access_token"."requested_user_info_claims") = 'array')),
	CONSTRAINT "oauth_access_token_confirmation_json" CHECK("oauth_access_token"."confirmation" is null or json_valid("oauth_access_token"."confirmation")),
	CONSTRAINT "oauth_access_token_scopes_json_array" CHECK("oauth_access_token"."scopes" is null or (json_valid("oauth_access_token"."scopes") and json_type("oauth_access_token"."scopes") = 'array'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_access_token_token_unique` ON `oauth_access_token` (`token`);--> statement-breakpoint
CREATE INDEX `oauth_access_token_user_client_idx` ON `oauth_access_token` (`user_id`,`client_id`);--> statement-breakpoint
CREATE INDEX `oauth_access_token_client_idx` ON `oauth_access_token` (`client_id`);--> statement-breakpoint
CREATE INDEX `oauth_access_token_session_idx` ON `oauth_access_token` (`session_id`);--> statement-breakpoint
CREATE INDEX `oauth_access_token_refresh_idx` ON `oauth_access_token` (`refresh_id`);--> statement-breakpoint
CREATE TABLE `oauth_client` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`client_secret` text,
	`client_discovery_id` text,
	`disabled` integer DEFAULT false,
	`skip_consent` integer,
	`enable_end_session` integer,
	`subject_type` text,
	`scopes` text,
	`client_credentials_scopes` text DEFAULT '[]',
	`user_id` text,
	`created_at` integer,
	`updated_at` integer,
	`name` text,
	`uri` text,
	`icon` text,
	`contacts` text,
	`tos` text,
	`policy` text,
	`software_id` text,
	`software_version` text,
	`software_statement` text,
	`redirect_uris` text NOT NULL,
	`post_logout_redirect_uris` text,
	`backchannel_logout_uri` text,
	`backchannel_logout_session_required` integer,
	`token_endpoint_auth_method` text,
	`application_type` text,
	`jwks` text,
	`jwks_uri` text,
	`grant_types` text,
	`response_types` text,
	`require_p_k_c_e` integer,
	`dpop_bound_access_tokens` integer DEFAULT false,
	`reference_id` text,
	`metadata` text,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "oauth_client_disabled_boolean" CHECK("oauth_client"."disabled" in (0, 1)),
	CONSTRAINT "oauth_client_skipConsent_boolean" CHECK("oauth_client"."skip_consent" in (0, 1)),
	CONSTRAINT "oauth_client_enableEndSession_boolean" CHECK("oauth_client"."enable_end_session" in (0, 1)),
	CONSTRAINT "oauth_client_scopes_json_array" CHECK("oauth_client"."scopes" is null or (json_valid("oauth_client"."scopes") and json_type("oauth_client"."scopes") = 'array')),
	CONSTRAINT "oauth_client_clientCredentialsScopes_json_array" CHECK("oauth_client"."client_credentials_scopes" is null or (json_valid("oauth_client"."client_credentials_scopes") and json_type("oauth_client"."client_credentials_scopes") = 'array')),
	CONSTRAINT "oauth_client_contacts_json_array" CHECK("oauth_client"."contacts" is null or (json_valid("oauth_client"."contacts") and json_type("oauth_client"."contacts") = 'array')),
	CONSTRAINT "oauth_client_redirectUris_json_array" CHECK("oauth_client"."redirect_uris" is null or (json_valid("oauth_client"."redirect_uris") and json_type("oauth_client"."redirect_uris") = 'array')),
	CONSTRAINT "oauth_client_postLogoutRedirectUris_json_array" CHECK("oauth_client"."post_logout_redirect_uris" is null or (json_valid("oauth_client"."post_logout_redirect_uris") and json_type("oauth_client"."post_logout_redirect_uris") = 'array')),
	CONSTRAINT "oauth_client_backchannelLogoutSessionRequired_boolean" CHECK("oauth_client"."backchannel_logout_session_required" in (0, 1)),
	CONSTRAINT "oauth_client_grantTypes_json_array" CHECK("oauth_client"."grant_types" is null or (json_valid("oauth_client"."grant_types") and json_type("oauth_client"."grant_types") = 'array')),
	CONSTRAINT "oauth_client_responseTypes_json_array" CHECK("oauth_client"."response_types" is null or (json_valid("oauth_client"."response_types") and json_type("oauth_client"."response_types") = 'array')),
	CONSTRAINT "oauth_client_requirePKCE_boolean" CHECK("oauth_client"."require_p_k_c_e" in (0, 1)),
	CONSTRAINT "oauth_client_dpopBoundAccessTokens_boolean" CHECK("oauth_client"."dpop_bound_access_tokens" in (0, 1)),
	CONSTRAINT "oauth_client_metadata_json" CHECK("oauth_client"."metadata" is null or json_valid("oauth_client"."metadata"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_client_client_id_unique` ON `oauth_client` (`client_id`);--> statement-breakpoint
CREATE INDEX `oauth_client_user_idx` ON `oauth_client` (`user_id`);--> statement-breakpoint
CREATE TABLE `oauth_client_assertion` (
	`id` text PRIMARY KEY NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `oauth_client_resource` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`resource_id` text NOT NULL,
	`metadata` text,
	`created_at` integer,
	FOREIGN KEY (`client_id`) REFERENCES `oauth_client`(`client_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resource_id`) REFERENCES `oauth_resource`(`identifier`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "oauth_client_resource_metadata_json" CHECK("oauth_client_resource"."metadata" is null or json_valid("oauth_client_resource"."metadata"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_client_resource_pair_idx` ON `oauth_client_resource` (`client_id`,`resource_id`);--> statement-breakpoint
CREATE INDEX `oauth_client_resource_resource_idx` ON `oauth_client_resource` (`resource_id`);--> statement-breakpoint
CREATE TABLE `oauth_consent` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`user_id` text,
	`reference_id` text,
	`resources` text,
	`requested_user_info_claims` text,
	`scopes` text NOT NULL,
	`created_at` integer,
	`updated_at` integer,
	FOREIGN KEY (`client_id`) REFERENCES `oauth_client`(`client_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "oauth_consent_resources_json_array" CHECK("oauth_consent"."resources" is null or (json_valid("oauth_consent"."resources") and json_type("oauth_consent"."resources") = 'array')),
	CONSTRAINT "oauth_consent_requestedUserInfoClaims_json_array" CHECK("oauth_consent"."requested_user_info_claims" is null or (json_valid("oauth_consent"."requested_user_info_claims") and json_type("oauth_consent"."requested_user_info_claims") = 'array')),
	CONSTRAINT "oauth_consent_scopes_json_array" CHECK("oauth_consent"."scopes" is null or (json_valid("oauth_consent"."scopes") and json_type("oauth_consent"."scopes") = 'array'))
);
--> statement-breakpoint
CREATE INDEX `oauth_consent_user_client_idx` ON `oauth_consent` (`user_id`,`client_id`);--> statement-breakpoint
CREATE INDEX `oauth_consent_client_idx` ON `oauth_consent` (`client_id`);--> statement-breakpoint
CREATE TABLE `oauth_refresh_token` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`client_id` text NOT NULL,
	`session_id` text,
	`user_id` text NOT NULL,
	`reference_id` text,
	`authorization_code_id` text,
	`resources` text,
	`requested_user_info_claims` text,
	`expires_at` integer,
	`created_at` integer,
	`revoked` integer,
	`rotated_at` integer,
	`rotation_replay_response` text,
	`rotation_replay_expires_at` integer,
	`auth_time` integer,
	`confirmation` text,
	`scopes` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `oauth_client`(`client_id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `auth_sessions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "oauth_refresh_token_resources_json_array" CHECK("oauth_refresh_token"."resources" is null or (json_valid("oauth_refresh_token"."resources") and json_type("oauth_refresh_token"."resources") = 'array')),
	CONSTRAINT "oauth_refresh_token_requestedUserInfoClaims_json_array" CHECK("oauth_refresh_token"."requested_user_info_claims" is null or (json_valid("oauth_refresh_token"."requested_user_info_claims") and json_type("oauth_refresh_token"."requested_user_info_claims") = 'array')),
	CONSTRAINT "oauth_refresh_token_confirmation_json" CHECK("oauth_refresh_token"."confirmation" is null or json_valid("oauth_refresh_token"."confirmation")),
	CONSTRAINT "oauth_refresh_token_scopes_json_array" CHECK("oauth_refresh_token"."scopes" is null or (json_valid("oauth_refresh_token"."scopes") and json_type("oauth_refresh_token"."scopes") = 'array'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_refresh_token_token_unique` ON `oauth_refresh_token` (`token`);--> statement-breakpoint
CREATE INDEX `oauth_refresh_token_user_client_idx` ON `oauth_refresh_token` (`user_id`,`client_id`);--> statement-breakpoint
CREATE INDEX `oauth_refresh_token_client_idx` ON `oauth_refresh_token` (`client_id`);--> statement-breakpoint
CREATE INDEX `oauth_refresh_token_session_idx` ON `oauth_refresh_token` (`session_id`);--> statement-breakpoint
CREATE TABLE `oauth_resource` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`name` text NOT NULL,
	`access_token_ttl` integer,
	`refresh_token_ttl` integer,
	`signing_algorithm` text,
	`signing_key_id` text,
	`allowed_scopes` text,
	`custom_claims` text,
	`dpop_bound_access_tokens_required` integer DEFAULT false,
	`disabled` integer DEFAULT false,
	`created_at` integer,
	`updated_at` integer,
	`policy_version` integer DEFAULT 1,
	`metadata` text,
	CONSTRAINT "oauth_resource_allowedScopes_json_array" CHECK("oauth_resource"."allowed_scopes" is null or (json_valid("oauth_resource"."allowed_scopes") and json_type("oauth_resource"."allowed_scopes") = 'array')),
	CONSTRAINT "oauth_resource_customClaims_json" CHECK("oauth_resource"."custom_claims" is null or json_valid("oauth_resource"."custom_claims")),
	CONSTRAINT "oauth_resource_dpopBoundAccessTokensRequired_boolean" CHECK("oauth_resource"."dpop_bound_access_tokens_required" in (0, 1)),
	CONSTRAINT "oauth_resource_disabled_boolean" CHECK("oauth_resource"."disabled" in (0, 1)),
	CONSTRAINT "oauth_resource_metadata_json" CHECK("oauth_resource"."metadata" is null or json_valid("oauth_resource"."metadata"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_resource_identifier_unique` ON `oauth_resource` (`identifier`);--> statement-breakpoint
CREATE TABLE `recipe_accessory_gear` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`gear_id` integer NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`gear_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`recipe_id`) REFERENCES `recipes`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`gear_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `recipe_accessory_gear_owner_id_idx` ON `recipe_accessory_gear` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_accessory_gear_recipe_gear_idx` ON `recipe_accessory_gear` (`owner_id`,`recipe_id`,`gear_id`);--> statement-breakpoint
CREATE INDEX `recipe_accessory_gear_gear_id_idx` ON `recipe_accessory_gear` (`gear_id`);--> statement-breakpoint
CREATE TABLE `recipe_drink_options` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`option_value_id` integer NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`option_value_id`) REFERENCES `drink_option_values`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`owner_id`,`recipe_id`) REFERENCES `recipes`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`option_value_id`) REFERENCES `drink_option_values`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `recipe_drink_options_owner_id_idx` ON `recipe_drink_options` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `recipe_drink_options_recipe_value_idx` ON `recipe_drink_options` (`owner_id`,`recipe_id`,`option_value_id`);--> statement-breakpoint
CREATE INDEX `recipe_drink_options_value_id_idx` ON `recipe_drink_options` (`option_value_id`);--> statement-breakpoint
CREATE TABLE `recipes` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`client_operation_id` text,
	`sync_id` text DEFAULT (lower(hex(randomblob(16)))) NOT NULL,
	`drink_type_id` integer,
	`revision` integer DEFAULT 0 NOT NULL,
	`brewing_method_id` integer NOT NULL,
	`bean_id` integer,
	`machine_id` integer,
	`dose_grams` text,
	`brew_water_grams` text,
	`ratio_basis` text,
	`grinder_id` integer,
	`grind_setting` text,
	`yield_grams` text,
	`shot_time_seconds` text,
	`target_time_seconds` text,
	`brew_temperature_celsius` text,
	`preinfusion_time_seconds` text,
	`preinfusion_pressure_bar` text,
	`bloom_time_seconds` text,
	`brew_pressure_bar` text,
	`flow_rate_ml_per_second` text,
	`basket_id` integer,
	`uses_puck_screen` integer,
	`paper_filter_position` text,
	`distribution_method` text,
	`tamp_force_kg` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`drink_type_id`) REFERENCES `drink_types`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`brewing_method_id`) REFERENCES `brewing_methods`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`bean_id`) REFERENCES `beans`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`machine_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`grinder_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`basket_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_id`,`drink_type_id`) REFERENCES `drink_types`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`brewing_method_id`) REFERENCES `brewing_methods`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`bean_id`) REFERENCES `beans`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`machine_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`grinder_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`basket_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "recipes_doseGrams_decimal" CHECK("recipes"."dose_grams" is null or (
      typeof("recipes"."dose_grams") = 'text'
      and case when substr("recipes"."dose_grams", 1, 1) = '-' then substr("recipes"."dose_grams", 2) else "recipes"."dose_grams" end not glob '*[^0-9.]*'
      and case when substr("recipes"."dose_grams", 1, 1) = '-' then substr("recipes"."dose_grams", 2) else "recipes"."dose_grams" end glob '[0-9]*'
      and length(replace(case when substr("recipes"."dose_grams", 1, 1) = '-' then substr("recipes"."dose_grams", 2) else "recipes"."dose_grams" end, '.', '')) between 1 and 5
      and length(case when substr("recipes"."dose_grams", 1, 1) = '-' then substr("recipes"."dose_grams", 2) else "recipes"."dose_grams" end) - length(replace(case when substr("recipes"."dose_grams", 1, 1) = '-' then substr("recipes"."dose_grams", 2) else "recipes"."dose_grams" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("recipes"."dose_grams", 1, 1) = '-' then substr("recipes"."dose_grams", 2) else "recipes"."dose_grams" end, '.') > 1
        and length(substr(case when substr("recipes"."dose_grams", 1, 1) = '-' then substr("recipes"."dose_grams", 2) else "recipes"."dose_grams" end, instr(case when substr("recipes"."dose_grams", 1, 1) = '-' then substr("recipes"."dose_grams", 2) else "recipes"."dose_grams" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "recipes_brewWaterGrams_decimal" CHECK("recipes"."brew_water_grams" is null or (
      typeof("recipes"."brew_water_grams") = 'text'
      and case when substr("recipes"."brew_water_grams", 1, 1) = '-' then substr("recipes"."brew_water_grams", 2) else "recipes"."brew_water_grams" end not glob '*[^0-9.]*'
      and case when substr("recipes"."brew_water_grams", 1, 1) = '-' then substr("recipes"."brew_water_grams", 2) else "recipes"."brew_water_grams" end glob '[0-9]*'
      and length(replace(case when substr("recipes"."brew_water_grams", 1, 1) = '-' then substr("recipes"."brew_water_grams", 2) else "recipes"."brew_water_grams" end, '.', '')) between 1 and 7
      and length(case when substr("recipes"."brew_water_grams", 1, 1) = '-' then substr("recipes"."brew_water_grams", 2) else "recipes"."brew_water_grams" end) - length(replace(case when substr("recipes"."brew_water_grams", 1, 1) = '-' then substr("recipes"."brew_water_grams", 2) else "recipes"."brew_water_grams" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("recipes"."brew_water_grams", 1, 1) = '-' then substr("recipes"."brew_water_grams", 2) else "recipes"."brew_water_grams" end, '.') > 1
        and length(substr(case when substr("recipes"."brew_water_grams", 1, 1) = '-' then substr("recipes"."brew_water_grams", 2) else "recipes"."brew_water_grams" end, instr(case when substr("recipes"."brew_water_grams", 1, 1) = '-' then substr("recipes"."brew_water_grams", 2) else "recipes"."brew_water_grams" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "recipes_yieldGrams_decimal" CHECK("recipes"."yield_grams" is null or (
      typeof("recipes"."yield_grams") = 'text'
      and case when substr("recipes"."yield_grams", 1, 1) = '-' then substr("recipes"."yield_grams", 2) else "recipes"."yield_grams" end not glob '*[^0-9.]*'
      and case when substr("recipes"."yield_grams", 1, 1) = '-' then substr("recipes"."yield_grams", 2) else "recipes"."yield_grams" end glob '[0-9]*'
      and length(replace(case when substr("recipes"."yield_grams", 1, 1) = '-' then substr("recipes"."yield_grams", 2) else "recipes"."yield_grams" end, '.', '')) between 1 and 6
      and length(case when substr("recipes"."yield_grams", 1, 1) = '-' then substr("recipes"."yield_grams", 2) else "recipes"."yield_grams" end) - length(replace(case when substr("recipes"."yield_grams", 1, 1) = '-' then substr("recipes"."yield_grams", 2) else "recipes"."yield_grams" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("recipes"."yield_grams", 1, 1) = '-' then substr("recipes"."yield_grams", 2) else "recipes"."yield_grams" end, '.') > 1
        and length(substr(case when substr("recipes"."yield_grams", 1, 1) = '-' then substr("recipes"."yield_grams", 2) else "recipes"."yield_grams" end, instr(case when substr("recipes"."yield_grams", 1, 1) = '-' then substr("recipes"."yield_grams", 2) else "recipes"."yield_grams" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "recipes_shotTimeSeconds_decimal" CHECK("recipes"."shot_time_seconds" is null or (
      typeof("recipes"."shot_time_seconds") = 'text'
      and case when substr("recipes"."shot_time_seconds", 1, 1) = '-' then substr("recipes"."shot_time_seconds", 2) else "recipes"."shot_time_seconds" end not glob '*[^0-9.]*'
      and case when substr("recipes"."shot_time_seconds", 1, 1) = '-' then substr("recipes"."shot_time_seconds", 2) else "recipes"."shot_time_seconds" end glob '[0-9]*'
      and length(replace(case when substr("recipes"."shot_time_seconds", 1, 1) = '-' then substr("recipes"."shot_time_seconds", 2) else "recipes"."shot_time_seconds" end, '.', '')) between 1 and 8
      and length(case when substr("recipes"."shot_time_seconds", 1, 1) = '-' then substr("recipes"."shot_time_seconds", 2) else "recipes"."shot_time_seconds" end) - length(replace(case when substr("recipes"."shot_time_seconds", 1, 1) = '-' then substr("recipes"."shot_time_seconds", 2) else "recipes"."shot_time_seconds" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("recipes"."shot_time_seconds", 1, 1) = '-' then substr("recipes"."shot_time_seconds", 2) else "recipes"."shot_time_seconds" end, '.') > 1
        and length(substr(case when substr("recipes"."shot_time_seconds", 1, 1) = '-' then substr("recipes"."shot_time_seconds", 2) else "recipes"."shot_time_seconds" end, instr(case when substr("recipes"."shot_time_seconds", 1, 1) = '-' then substr("recipes"."shot_time_seconds", 2) else "recipes"."shot_time_seconds" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "recipes_targetTimeSeconds_decimal" CHECK("recipes"."target_time_seconds" is null or (
      typeof("recipes"."target_time_seconds") = 'text'
      and case when substr("recipes"."target_time_seconds", 1, 1) = '-' then substr("recipes"."target_time_seconds", 2) else "recipes"."target_time_seconds" end not glob '*[^0-9.]*'
      and case when substr("recipes"."target_time_seconds", 1, 1) = '-' then substr("recipes"."target_time_seconds", 2) else "recipes"."target_time_seconds" end glob '[0-9]*'
      and length(replace(case when substr("recipes"."target_time_seconds", 1, 1) = '-' then substr("recipes"."target_time_seconds", 2) else "recipes"."target_time_seconds" end, '.', '')) between 1 and 8
      and length(case when substr("recipes"."target_time_seconds", 1, 1) = '-' then substr("recipes"."target_time_seconds", 2) else "recipes"."target_time_seconds" end) - length(replace(case when substr("recipes"."target_time_seconds", 1, 1) = '-' then substr("recipes"."target_time_seconds", 2) else "recipes"."target_time_seconds" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("recipes"."target_time_seconds", 1, 1) = '-' then substr("recipes"."target_time_seconds", 2) else "recipes"."target_time_seconds" end, '.') > 1
        and length(substr(case when substr("recipes"."target_time_seconds", 1, 1) = '-' then substr("recipes"."target_time_seconds", 2) else "recipes"."target_time_seconds" end, instr(case when substr("recipes"."target_time_seconds", 1, 1) = '-' then substr("recipes"."target_time_seconds", 2) else "recipes"."target_time_seconds" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "recipes_brewTemperatureCelsius_decimal" CHECK("recipes"."brew_temperature_celsius" is null or (
      typeof("recipes"."brew_temperature_celsius") = 'text'
      and case when substr("recipes"."brew_temperature_celsius", 1, 1) = '-' then substr("recipes"."brew_temperature_celsius", 2) else "recipes"."brew_temperature_celsius" end not glob '*[^0-9.]*'
      and case when substr("recipes"."brew_temperature_celsius", 1, 1) = '-' then substr("recipes"."brew_temperature_celsius", 2) else "recipes"."brew_temperature_celsius" end glob '[0-9]*'
      and length(replace(case when substr("recipes"."brew_temperature_celsius", 1, 1) = '-' then substr("recipes"."brew_temperature_celsius", 2) else "recipes"."brew_temperature_celsius" end, '.', '')) between 1 and 4
      and length(case when substr("recipes"."brew_temperature_celsius", 1, 1) = '-' then substr("recipes"."brew_temperature_celsius", 2) else "recipes"."brew_temperature_celsius" end) - length(replace(case when substr("recipes"."brew_temperature_celsius", 1, 1) = '-' then substr("recipes"."brew_temperature_celsius", 2) else "recipes"."brew_temperature_celsius" end, '.', '')) = 1
      and (1 = 0 or (
        instr(case when substr("recipes"."brew_temperature_celsius", 1, 1) = '-' then substr("recipes"."brew_temperature_celsius", 2) else "recipes"."brew_temperature_celsius" end, '.') > 1
        and length(substr(case when substr("recipes"."brew_temperature_celsius", 1, 1) = '-' then substr("recipes"."brew_temperature_celsius", 2) else "recipes"."brew_temperature_celsius" end, instr(case when substr("recipes"."brew_temperature_celsius", 1, 1) = '-' then substr("recipes"."brew_temperature_celsius", 2) else "recipes"."brew_temperature_celsius" end, '.') + 1)) = 1
      ))
    )),
	CONSTRAINT "recipes_preinfusionTimeSeconds_decimal" CHECK("recipes"."preinfusion_time_seconds" is null or (
      typeof("recipes"."preinfusion_time_seconds") = 'text'
      and case when substr("recipes"."preinfusion_time_seconds", 1, 1) = '-' then substr("recipes"."preinfusion_time_seconds", 2) else "recipes"."preinfusion_time_seconds" end not glob '*[^0-9.]*'
      and case when substr("recipes"."preinfusion_time_seconds", 1, 1) = '-' then substr("recipes"."preinfusion_time_seconds", 2) else "recipes"."preinfusion_time_seconds" end glob '[0-9]*'
      and length(replace(case when substr("recipes"."preinfusion_time_seconds", 1, 1) = '-' then substr("recipes"."preinfusion_time_seconds", 2) else "recipes"."preinfusion_time_seconds" end, '.', '')) between 1 and 5
      and length(case when substr("recipes"."preinfusion_time_seconds", 1, 1) = '-' then substr("recipes"."preinfusion_time_seconds", 2) else "recipes"."preinfusion_time_seconds" end) - length(replace(case when substr("recipes"."preinfusion_time_seconds", 1, 1) = '-' then substr("recipes"."preinfusion_time_seconds", 2) else "recipes"."preinfusion_time_seconds" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("recipes"."preinfusion_time_seconds", 1, 1) = '-' then substr("recipes"."preinfusion_time_seconds", 2) else "recipes"."preinfusion_time_seconds" end, '.') > 1
        and length(substr(case when substr("recipes"."preinfusion_time_seconds", 1, 1) = '-' then substr("recipes"."preinfusion_time_seconds", 2) else "recipes"."preinfusion_time_seconds" end, instr(case when substr("recipes"."preinfusion_time_seconds", 1, 1) = '-' then substr("recipes"."preinfusion_time_seconds", 2) else "recipes"."preinfusion_time_seconds" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "recipes_preinfusionPressureBar_decimal" CHECK("recipes"."preinfusion_pressure_bar" is null or (
      typeof("recipes"."preinfusion_pressure_bar") = 'text'
      and case when substr("recipes"."preinfusion_pressure_bar", 1, 1) = '-' then substr("recipes"."preinfusion_pressure_bar", 2) else "recipes"."preinfusion_pressure_bar" end not glob '*[^0-9.]*'
      and case when substr("recipes"."preinfusion_pressure_bar", 1, 1) = '-' then substr("recipes"."preinfusion_pressure_bar", 2) else "recipes"."preinfusion_pressure_bar" end glob '[0-9]*'
      and length(replace(case when substr("recipes"."preinfusion_pressure_bar", 1, 1) = '-' then substr("recipes"."preinfusion_pressure_bar", 2) else "recipes"."preinfusion_pressure_bar" end, '.', '')) between 1 and 4
      and length(case when substr("recipes"."preinfusion_pressure_bar", 1, 1) = '-' then substr("recipes"."preinfusion_pressure_bar", 2) else "recipes"."preinfusion_pressure_bar" end) - length(replace(case when substr("recipes"."preinfusion_pressure_bar", 1, 1) = '-' then substr("recipes"."preinfusion_pressure_bar", 2) else "recipes"."preinfusion_pressure_bar" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("recipes"."preinfusion_pressure_bar", 1, 1) = '-' then substr("recipes"."preinfusion_pressure_bar", 2) else "recipes"."preinfusion_pressure_bar" end, '.') > 1
        and length(substr(case when substr("recipes"."preinfusion_pressure_bar", 1, 1) = '-' then substr("recipes"."preinfusion_pressure_bar", 2) else "recipes"."preinfusion_pressure_bar" end, instr(case when substr("recipes"."preinfusion_pressure_bar", 1, 1) = '-' then substr("recipes"."preinfusion_pressure_bar", 2) else "recipes"."preinfusion_pressure_bar" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "recipes_bloomTimeSeconds_decimal" CHECK("recipes"."bloom_time_seconds" is null or (
      typeof("recipes"."bloom_time_seconds") = 'text'
      and case when substr("recipes"."bloom_time_seconds", 1, 1) = '-' then substr("recipes"."bloom_time_seconds", 2) else "recipes"."bloom_time_seconds" end not glob '*[^0-9.]*'
      and case when substr("recipes"."bloom_time_seconds", 1, 1) = '-' then substr("recipes"."bloom_time_seconds", 2) else "recipes"."bloom_time_seconds" end glob '[0-9]*'
      and length(replace(case when substr("recipes"."bloom_time_seconds", 1, 1) = '-' then substr("recipes"."bloom_time_seconds", 2) else "recipes"."bloom_time_seconds" end, '.', '')) between 1 and 5
      and length(case when substr("recipes"."bloom_time_seconds", 1, 1) = '-' then substr("recipes"."bloom_time_seconds", 2) else "recipes"."bloom_time_seconds" end) - length(replace(case when substr("recipes"."bloom_time_seconds", 1, 1) = '-' then substr("recipes"."bloom_time_seconds", 2) else "recipes"."bloom_time_seconds" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("recipes"."bloom_time_seconds", 1, 1) = '-' then substr("recipes"."bloom_time_seconds", 2) else "recipes"."bloom_time_seconds" end, '.') > 1
        and length(substr(case when substr("recipes"."bloom_time_seconds", 1, 1) = '-' then substr("recipes"."bloom_time_seconds", 2) else "recipes"."bloom_time_seconds" end, instr(case when substr("recipes"."bloom_time_seconds", 1, 1) = '-' then substr("recipes"."bloom_time_seconds", 2) else "recipes"."bloom_time_seconds" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "recipes_brewPressureBar_decimal" CHECK("recipes"."brew_pressure_bar" is null or (
      typeof("recipes"."brew_pressure_bar") = 'text'
      and case when substr("recipes"."brew_pressure_bar", 1, 1) = '-' then substr("recipes"."brew_pressure_bar", 2) else "recipes"."brew_pressure_bar" end not glob '*[^0-9.]*'
      and case when substr("recipes"."brew_pressure_bar", 1, 1) = '-' then substr("recipes"."brew_pressure_bar", 2) else "recipes"."brew_pressure_bar" end glob '[0-9]*'
      and length(replace(case when substr("recipes"."brew_pressure_bar", 1, 1) = '-' then substr("recipes"."brew_pressure_bar", 2) else "recipes"."brew_pressure_bar" end, '.', '')) between 1 and 4
      and length(case when substr("recipes"."brew_pressure_bar", 1, 1) = '-' then substr("recipes"."brew_pressure_bar", 2) else "recipes"."brew_pressure_bar" end) - length(replace(case when substr("recipes"."brew_pressure_bar", 1, 1) = '-' then substr("recipes"."brew_pressure_bar", 2) else "recipes"."brew_pressure_bar" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("recipes"."brew_pressure_bar", 1, 1) = '-' then substr("recipes"."brew_pressure_bar", 2) else "recipes"."brew_pressure_bar" end, '.') > 1
        and length(substr(case when substr("recipes"."brew_pressure_bar", 1, 1) = '-' then substr("recipes"."brew_pressure_bar", 2) else "recipes"."brew_pressure_bar" end, instr(case when substr("recipes"."brew_pressure_bar", 1, 1) = '-' then substr("recipes"."brew_pressure_bar", 2) else "recipes"."brew_pressure_bar" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "recipes_flowRateMlPerSecond_decimal" CHECK("recipes"."flow_rate_ml_per_second" is null or (
      typeof("recipes"."flow_rate_ml_per_second") = 'text'
      and case when substr("recipes"."flow_rate_ml_per_second", 1, 1) = '-' then substr("recipes"."flow_rate_ml_per_second", 2) else "recipes"."flow_rate_ml_per_second" end not glob '*[^0-9.]*'
      and case when substr("recipes"."flow_rate_ml_per_second", 1, 1) = '-' then substr("recipes"."flow_rate_ml_per_second", 2) else "recipes"."flow_rate_ml_per_second" end glob '[0-9]*'
      and length(replace(case when substr("recipes"."flow_rate_ml_per_second", 1, 1) = '-' then substr("recipes"."flow_rate_ml_per_second", 2) else "recipes"."flow_rate_ml_per_second" end, '.', '')) between 1 and 4
      and length(case when substr("recipes"."flow_rate_ml_per_second", 1, 1) = '-' then substr("recipes"."flow_rate_ml_per_second", 2) else "recipes"."flow_rate_ml_per_second" end) - length(replace(case when substr("recipes"."flow_rate_ml_per_second", 1, 1) = '-' then substr("recipes"."flow_rate_ml_per_second", 2) else "recipes"."flow_rate_ml_per_second" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("recipes"."flow_rate_ml_per_second", 1, 1) = '-' then substr("recipes"."flow_rate_ml_per_second", 2) else "recipes"."flow_rate_ml_per_second" end, '.') > 1
        and length(substr(case when substr("recipes"."flow_rate_ml_per_second", 1, 1) = '-' then substr("recipes"."flow_rate_ml_per_second", 2) else "recipes"."flow_rate_ml_per_second" end, instr(case when substr("recipes"."flow_rate_ml_per_second", 1, 1) = '-' then substr("recipes"."flow_rate_ml_per_second", 2) else "recipes"."flow_rate_ml_per_second" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "recipes_usesPuckScreen_boolean" CHECK("recipes"."uses_puck_screen" in (0, 1)),
	CONSTRAINT "recipes_tampForceKg_decimal" CHECK("recipes"."tamp_force_kg" is null or (
      typeof("recipes"."tamp_force_kg") = 'text'
      and case when substr("recipes"."tamp_force_kg", 1, 1) = '-' then substr("recipes"."tamp_force_kg", 2) else "recipes"."tamp_force_kg" end not glob '*[^0-9.]*'
      and case when substr("recipes"."tamp_force_kg", 1, 1) = '-' then substr("recipes"."tamp_force_kg", 2) else "recipes"."tamp_force_kg" end glob '[0-9]*'
      and length(replace(case when substr("recipes"."tamp_force_kg", 1, 1) = '-' then substr("recipes"."tamp_force_kg", 2) else "recipes"."tamp_force_kg" end, '.', '')) between 1 and 5
      and length(case when substr("recipes"."tamp_force_kg", 1, 1) = '-' then substr("recipes"."tamp_force_kg", 2) else "recipes"."tamp_force_kg" end) - length(replace(case when substr("recipes"."tamp_force_kg", 1, 1) = '-' then substr("recipes"."tamp_force_kg", 2) else "recipes"."tamp_force_kg" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("recipes"."tamp_force_kg", 1, 1) = '-' then substr("recipes"."tamp_force_kg", 2) else "recipes"."tamp_force_kg" end, '.') > 1
        and length(substr(case when substr("recipes"."tamp_force_kg", 1, 1) = '-' then substr("recipes"."tamp_force_kg", 2) else "recipes"."tamp_force_kg" end, instr(case when substr("recipes"."tamp_force_kg", 1, 1) = '-' then substr("recipes"."tamp_force_kg", 2) else "recipes"."tamp_force_kg" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "recipes_ratio_basis_check" CHECK("recipes"."ratio_basis" in ('target_yield', 'brew_water')),
	CONSTRAINT "recipes_paper_filter_position_check" CHECK("recipes"."paper_filter_position" in ('none', 'top', 'bottom', 'both')),
	CONSTRAINT "recipes_measurements_nonnegative" CHECK(("recipes"."dose_grams" is null or cast("recipes"."dose_grams" as real) >= 0)
        and ("recipes"."brew_water_grams" is null or cast("recipes"."brew_water_grams" as real) >= 0)
        and ("recipes"."yield_grams" is null or cast("recipes"."yield_grams" as real) >= 0)
        and ("recipes"."shot_time_seconds" is null or cast("recipes"."shot_time_seconds" as real) >= 0)
        and ("recipes"."target_time_seconds" is null or cast("recipes"."target_time_seconds" as real) >= 0)
        and ("recipes"."brew_temperature_celsius" is null or cast("recipes"."brew_temperature_celsius" as real) >= 0)
        and ("recipes"."preinfusion_time_seconds" is null or cast("recipes"."preinfusion_time_seconds" as real) >= 0)
        and ("recipes"."preinfusion_pressure_bar" is null or cast("recipes"."preinfusion_pressure_bar" as real) >= 0)
        and ("recipes"."bloom_time_seconds" is null or cast("recipes"."bloom_time_seconds" as real) >= 0)
        and ("recipes"."brew_pressure_bar" is null or cast("recipes"."brew_pressure_bar" as real) >= 0)
        and ("recipes"."flow_rate_ml_per_second" is null or cast("recipes"."flow_rate_ml_per_second" as real) >= 0)
        and ("recipes"."tamp_force_kg" is null or cast("recipes"."tamp_force_kg" as real) >= 0))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `recipes_id_owner_unique` ON `recipes` (`owner_id`,`id`);--> statement-breakpoint
CREATE INDEX `recipes_owner_id_idx` ON `recipes` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `recipes_client_operation_id_unique` ON `recipes` (`owner_id`,`client_operation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `recipes_sync_id_unique` ON `recipes` (`owner_id`,`sync_id`);--> statement-breakpoint
CREATE INDEX `recipes_brewing_method_id_idx` ON `recipes` (`brewing_method_id`);--> statement-breakpoint
CREATE INDEX `recipes_bean_id_idx` ON `recipes` (`bean_id`);--> statement-breakpoint
CREATE INDEX `recipes_drink_type_id_idx` ON `recipes` (`drink_type_id`);--> statement-breakpoint
CREATE TABLE `replication_changes` (
	`owner_id` text NOT NULL,
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`document_id` text NOT NULL,
	`document` text NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "replication_changes_document_json" CHECK("replication_changes"."document" is null or json_valid("replication_changes"."document")),
	CONSTRAINT "replication_changes_deleted_boolean" CHECK("replication_changes"."deleted" in (0, 1))
);
--> statement-breakpoint
CREATE INDEX `replication_changes_owner_id_idx` ON `replication_changes` (`owner_id`);--> statement-breakpoint
CREATE INDEX `replication_changes_entity_sequence_idx` ON `replication_changes` (`entity`,`sequence`);--> statement-breakpoint
CREATE TABLE `roasters` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`location` text,
	`country` text,
	`website` text,
	`instagram_handle` text,
	`notes` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roasters_id_owner_unique` ON `roasters` (`owner_id`,`id`);--> statement-breakpoint
CREATE INDEX `roasters_owner_id_idx` ON `roasters` (`owner_id`);--> statement-breakpoint
CREATE INDEX `roasters_name_idx` ON `roasters` (`name`);--> statement-breakpoint
CREATE TABLE `scale_details` (
	`owner_id` text NOT NULL,
	`gear_id` integer PRIMARY KEY NOT NULL,
	`resolution_grams` text,
	`capacity_grams` text,
	`has_timer` integer,
	`supports_auto_tare` integer,
	`supports_auto_timer` integer,
	`has_flow_rate_display` integer,
	FOREIGN KEY (`gear_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`gear_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "scale_details_resolutionGrams_decimal" CHECK("scale_details"."resolution_grams" is null or (
      typeof("scale_details"."resolution_grams") = 'text'
      and case when substr("scale_details"."resolution_grams", 1, 1) = '-' then substr("scale_details"."resolution_grams", 2) else "scale_details"."resolution_grams" end not glob '*[^0-9.]*'
      and case when substr("scale_details"."resolution_grams", 1, 1) = '-' then substr("scale_details"."resolution_grams", 2) else "scale_details"."resolution_grams" end glob '[0-9]*'
      and length(replace(case when substr("scale_details"."resolution_grams", 1, 1) = '-' then substr("scale_details"."resolution_grams", 2) else "scale_details"."resolution_grams" end, '.', '')) between 1 and 7
      and length(case when substr("scale_details"."resolution_grams", 1, 1) = '-' then substr("scale_details"."resolution_grams", 2) else "scale_details"."resolution_grams" end) - length(replace(case when substr("scale_details"."resolution_grams", 1, 1) = '-' then substr("scale_details"."resolution_grams", 2) else "scale_details"."resolution_grams" end, '.', '')) = 1
      and (3 = 0 or (
        instr(case when substr("scale_details"."resolution_grams", 1, 1) = '-' then substr("scale_details"."resolution_grams", 2) else "scale_details"."resolution_grams" end, '.') > 1
        and length(substr(case when substr("scale_details"."resolution_grams", 1, 1) = '-' then substr("scale_details"."resolution_grams", 2) else "scale_details"."resolution_grams" end, instr(case when substr("scale_details"."resolution_grams", 1, 1) = '-' then substr("scale_details"."resolution_grams", 2) else "scale_details"."resolution_grams" end, '.') + 1)) = 3
      ))
    )),
	CONSTRAINT "scale_details_capacityGrams_decimal" CHECK("scale_details"."capacity_grams" is null or (
      typeof("scale_details"."capacity_grams") = 'text'
      and case when substr("scale_details"."capacity_grams", 1, 1) = '-' then substr("scale_details"."capacity_grams", 2) else "scale_details"."capacity_grams" end not glob '*[^0-9.]*'
      and case when substr("scale_details"."capacity_grams", 1, 1) = '-' then substr("scale_details"."capacity_grams", 2) else "scale_details"."capacity_grams" end glob '[0-9]*'
      and length(replace(case when substr("scale_details"."capacity_grams", 1, 1) = '-' then substr("scale_details"."capacity_grams", 2) else "scale_details"."capacity_grams" end, '.', '')) between 1 and 9
      and length(case when substr("scale_details"."capacity_grams", 1, 1) = '-' then substr("scale_details"."capacity_grams", 2) else "scale_details"."capacity_grams" end) - length(replace(case when substr("scale_details"."capacity_grams", 1, 1) = '-' then substr("scale_details"."capacity_grams", 2) else "scale_details"."capacity_grams" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("scale_details"."capacity_grams", 1, 1) = '-' then substr("scale_details"."capacity_grams", 2) else "scale_details"."capacity_grams" end, '.') > 1
        and length(substr(case when substr("scale_details"."capacity_grams", 1, 1) = '-' then substr("scale_details"."capacity_grams", 2) else "scale_details"."capacity_grams" end, instr(case when substr("scale_details"."capacity_grams", 1, 1) = '-' then substr("scale_details"."capacity_grams", 2) else "scale_details"."capacity_grams" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "scale_details_hasTimer_boolean" CHECK("scale_details"."has_timer" in (0, 1)),
	CONSTRAINT "scale_details_supportsAutoTare_boolean" CHECK("scale_details"."supports_auto_tare" in (0, 1)),
	CONSTRAINT "scale_details_supportsAutoTimer_boolean" CHECK("scale_details"."supports_auto_timer" in (0, 1)),
	CONSTRAINT "scale_details_hasFlowRateDisplay_boolean" CHECK("scale_details"."has_flow_rate_display" in (0, 1)),
	CONSTRAINT "scale_details_measurements_check" CHECK(("scale_details"."resolution_grams" is null or cast("scale_details"."resolution_grams" as real) > 0)
        and ("scale_details"."capacity_grams" is null or cast("scale_details"."capacity_grams" as real) > 0))
);
--> statement-breakpoint
CREATE INDEX `scale_details_owner_id_idx` ON `scale_details` (`owner_id`);--> statement-breakpoint
CREATE TABLE `settings` (
	`owner_id` text NOT NULL,
	`id` integer DEFAULT 1 NOT NULL,
	`default_currency` text DEFAULT 'EUR' NOT NULL,
	`date_format` text DEFAULT 'day-month-year-slash' NOT NULL,
	`number_format` text DEFAULT 'decimal-point' NOT NULL,
	`time_zone` text DEFAULT 'UTC' NOT NULL,
	`default_list_view` text DEFAULT 'cards' NOT NULL,
	`light_theme` text DEFAULT 'light-roast' NOT NULL,
	`dark_theme` text DEFAULT 'dark-roast' NOT NULL,
	`background_grain_enabled` integer DEFAULT true NOT NULL,
	`background_texture_enabled` integer DEFAULT true NOT NULL,
	`taste_profile_fields` text DEFAULT '["overallRating","bitterness","acidity","sweetness","body","astringency","flavorTags","notes"]' NOT NULL,
	`default_map_latitude` real DEFAULT 48.8566,
	`default_map_longitude` real DEFAULT 2.3522,
	`default_map_label` text DEFAULT 'Paris, France',
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`owner_id`, `id`),
	CONSTRAINT "settings_backgroundGrainEnabled_boolean" CHECK("settings"."background_grain_enabled" in (0, 1)),
	CONSTRAINT "settings_backgroundTextureEnabled_boolean" CHECK("settings"."background_texture_enabled" in (0, 1)),
	CONSTRAINT "settings_tasteProfileFields_json_array" CHECK("settings"."taste_profile_fields" is null or (json_valid("settings"."taste_profile_fields") and json_type("settings"."taste_profile_fields") = 'array')),
	CONSTRAINT "settings_singleton_check" CHECK("settings"."id" = 1),
	CONSTRAINT "settings_currency_check" CHECK("settings"."default_currency" in ('EUR', 'USD', 'GBP', 'CHF')),
	CONSTRAINT "settings_date_format_check" CHECK("settings"."date_format" in ('day-month-year-slash', 'month-day-year-slash', 'day-month-year-dot', 'year-month-day')),
	CONSTRAINT "settings_number_format_check" CHECK("settings"."number_format" in ('decimal-point', 'decimal-comma', 'space-decimal-point', 'space-decimal-comma', 'apostrophe-decimal-point', 'apostrophe-decimal-comma')),
	CONSTRAINT "settings_list_view_check" CHECK("settings"."default_list_view" in ('cards', 'table')),
	CONSTRAINT "settings_map_location_check" CHECK((
        ("settings"."default_map_latitude" is null
          and "settings"."default_map_longitude" is null
          and "settings"."default_map_label" is null)
        or
        ("settings"."default_map_latitude" is not null
          and "settings"."default_map_longitude" is not null
          and "settings"."default_map_label" is not null
          and "settings"."default_map_latitude" between -90 and 90
          and "settings"."default_map_longitude" between -180 and 180
          and length(trim("settings"."default_map_label")) > 0)
      ))
);
--> statement-breakpoint
CREATE INDEX `settings_owner_id_idx` ON `settings` (`owner_id`);--> statement-breakpoint
CREATE TABLE `brew_accessory_gear` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brew_id` integer NOT NULL,
	`gear_id` integer NOT NULL,
	FOREIGN KEY (`brew_id`) REFERENCES `brews`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`gear_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`brew_id`) REFERENCES `brews`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`gear_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `brew_accessory_gear_owner_id_idx` ON `brew_accessory_gear` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `brew_accessory_gear_brew_gear_idx` ON `brew_accessory_gear` (`owner_id`,`brew_id`,`gear_id`);--> statement-breakpoint
CREATE INDEX `brew_accessory_gear_gear_id_idx` ON `brew_accessory_gear` (`gear_id`);--> statement-breakpoint
CREATE TABLE `brew_drink_options` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brew_id` integer NOT NULL,
	`option_value_id` integer NOT NULL,
	FOREIGN KEY (`brew_id`) REFERENCES `brews`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`option_value_id`) REFERENCES `drink_option_values`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`owner_id`,`brew_id`) REFERENCES `brews`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`option_value_id`) REFERENCES `drink_option_values`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `brew_drink_options_owner_id_idx` ON `brew_drink_options` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `brew_drink_options_brew_value_idx` ON `brew_drink_options` (`owner_id`,`brew_id`,`option_value_id`);--> statement-breakpoint
CREATE INDEX `brew_drink_options_value_id_idx` ON `brew_drink_options` (`option_value_id`);--> statement-breakpoint
CREATE TABLE `brew_images` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brew_id` integer NOT NULL,
	`client_operation_id` text,
	`storage_path` text NOT NULL,
	`original_filename` text,
	`mime_type` text,
	`size_bytes` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`brew_id`) REFERENCES `brews`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`brew_id`) REFERENCES `brews`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `brew_images_owner_id_idx` ON `brew_images` (`owner_id`);--> statement-breakpoint
CREATE INDEX `brew_images_brew_id_idx` ON `brew_images` (`brew_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `brew_images_client_operation_id_unique` ON `brew_images` (`owner_id`,`client_operation_id`);--> statement-breakpoint
CREATE TABLE `brew_taste_tags` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brew_id` integer NOT NULL,
	`taste_tag_id` integer NOT NULL,
	FOREIGN KEY (`brew_id`) REFERENCES `brews`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`taste_tag_id`) REFERENCES `taste_tags`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`brew_id`) REFERENCES `brews`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`taste_tag_id`) REFERENCES `taste_tags`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `brew_taste_tags_owner_id_idx` ON `brew_taste_tags` (`owner_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `brew_taste_tags_brew_tag_idx` ON `brew_taste_tags` (`owner_id`,`brew_id`,`taste_tag_id`);--> statement-breakpoint
CREATE INDEX `brew_taste_tags_taste_tag_id_idx` ON `brew_taste_tags` (`taste_tag_id`);--> statement-breakpoint
CREATE TABLE `brews` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brewed_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`brewing_method_id` integer NOT NULL,
	`bean_id` integer,
	`bean_purchase_id` integer,
	`drink_type_id` integer,
	`machine_setting_revision_id` integer,
	`machine_id` integer,
	`dose_grams` text,
	`brew_water_grams` text,
	`ratio_basis` text,
	`grinder_id` integer,
	`grind_setting` text,
	`yield_grams` text,
	`shot_time_seconds` text,
	`target_time_seconds` text,
	`brew_temperature_celsius` text,
	`preinfusion_time_seconds` text,
	`preinfusion_pressure_bar` text,
	`bloom_time_seconds` text,
	`brew_pressure_bar` text,
	`flow_rate_ml_per_second` text,
	`basket_id` integer,
	`uses_puck_screen` integer,
	`paper_filter_position` text,
	`distribution_method` text,
	`tamp_force_kg` text,
	`rating` integer,
	`extraction_balance` integer,
	`bitterness` integer,
	`acidity` integer,
	`sweetness` integer,
	`body` integer,
	`astringency` integer,
	`notes` text,
	`client_operation_id` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`brewing_method_id`) REFERENCES `brewing_methods`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`bean_id`) REFERENCES `beans`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`drink_type_id`) REFERENCES `drink_types`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`machine_setting_revision_id`) REFERENCES `espresso_machine_setting_revisions`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`machine_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`grinder_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`basket_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`owner_id`,`brewing_method_id`) REFERENCES `brewing_methods`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`bean_id`) REFERENCES `beans`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`drink_type_id`) REFERENCES `drink_types`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`machine_setting_revision_id`) REFERENCES `espresso_machine_setting_revisions`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`machine_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`grinder_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`basket_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_id`,`bean_purchase_id`,`bean_id`) REFERENCES `bean_purchases`(`owner_id`,`id`,`bean_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "brews_doseGrams_decimal" CHECK("brews"."dose_grams" is null or (
      typeof("brews"."dose_grams") = 'text'
      and case when substr("brews"."dose_grams", 1, 1) = '-' then substr("brews"."dose_grams", 2) else "brews"."dose_grams" end not glob '*[^0-9.]*'
      and case when substr("brews"."dose_grams", 1, 1) = '-' then substr("brews"."dose_grams", 2) else "brews"."dose_grams" end glob '[0-9]*'
      and length(replace(case when substr("brews"."dose_grams", 1, 1) = '-' then substr("brews"."dose_grams", 2) else "brews"."dose_grams" end, '.', '')) between 1 and 6
      and length(case when substr("brews"."dose_grams", 1, 1) = '-' then substr("brews"."dose_grams", 2) else "brews"."dose_grams" end) - length(replace(case when substr("brews"."dose_grams", 1, 1) = '-' then substr("brews"."dose_grams", 2) else "brews"."dose_grams" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("brews"."dose_grams", 1, 1) = '-' then substr("brews"."dose_grams", 2) else "brews"."dose_grams" end, '.') > 1
        and length(substr(case when substr("brews"."dose_grams", 1, 1) = '-' then substr("brews"."dose_grams", 2) else "brews"."dose_grams" end, instr(case when substr("brews"."dose_grams", 1, 1) = '-' then substr("brews"."dose_grams", 2) else "brews"."dose_grams" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "brews_brewWaterGrams_decimal" CHECK("brews"."brew_water_grams" is null or (
      typeof("brews"."brew_water_grams") = 'text'
      and case when substr("brews"."brew_water_grams", 1, 1) = '-' then substr("brews"."brew_water_grams", 2) else "brews"."brew_water_grams" end not glob '*[^0-9.]*'
      and case when substr("brews"."brew_water_grams", 1, 1) = '-' then substr("brews"."brew_water_grams", 2) else "brews"."brew_water_grams" end glob '[0-9]*'
      and length(replace(case when substr("brews"."brew_water_grams", 1, 1) = '-' then substr("brews"."brew_water_grams", 2) else "brews"."brew_water_grams" end, '.', '')) between 1 and 7
      and length(case when substr("brews"."brew_water_grams", 1, 1) = '-' then substr("brews"."brew_water_grams", 2) else "brews"."brew_water_grams" end) - length(replace(case when substr("brews"."brew_water_grams", 1, 1) = '-' then substr("brews"."brew_water_grams", 2) else "brews"."brew_water_grams" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("brews"."brew_water_grams", 1, 1) = '-' then substr("brews"."brew_water_grams", 2) else "brews"."brew_water_grams" end, '.') > 1
        and length(substr(case when substr("brews"."brew_water_grams", 1, 1) = '-' then substr("brews"."brew_water_grams", 2) else "brews"."brew_water_grams" end, instr(case when substr("brews"."brew_water_grams", 1, 1) = '-' then substr("brews"."brew_water_grams", 2) else "brews"."brew_water_grams" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "brews_yieldGrams_decimal" CHECK("brews"."yield_grams" is null or (
      typeof("brews"."yield_grams") = 'text'
      and case when substr("brews"."yield_grams", 1, 1) = '-' then substr("brews"."yield_grams", 2) else "brews"."yield_grams" end not glob '*[^0-9.]*'
      and case when substr("brews"."yield_grams", 1, 1) = '-' then substr("brews"."yield_grams", 2) else "brews"."yield_grams" end glob '[0-9]*'
      and length(replace(case when substr("brews"."yield_grams", 1, 1) = '-' then substr("brews"."yield_grams", 2) else "brews"."yield_grams" end, '.', '')) between 1 and 6
      and length(case when substr("brews"."yield_grams", 1, 1) = '-' then substr("brews"."yield_grams", 2) else "brews"."yield_grams" end) - length(replace(case when substr("brews"."yield_grams", 1, 1) = '-' then substr("brews"."yield_grams", 2) else "brews"."yield_grams" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("brews"."yield_grams", 1, 1) = '-' then substr("brews"."yield_grams", 2) else "brews"."yield_grams" end, '.') > 1
        and length(substr(case when substr("brews"."yield_grams", 1, 1) = '-' then substr("brews"."yield_grams", 2) else "brews"."yield_grams" end, instr(case when substr("brews"."yield_grams", 1, 1) = '-' then substr("brews"."yield_grams", 2) else "brews"."yield_grams" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "brews_shotTimeSeconds_decimal" CHECK("brews"."shot_time_seconds" is null or (
      typeof("brews"."shot_time_seconds") = 'text'
      and case when substr("brews"."shot_time_seconds", 1, 1) = '-' then substr("brews"."shot_time_seconds", 2) else "brews"."shot_time_seconds" end not glob '*[^0-9.]*'
      and case when substr("brews"."shot_time_seconds", 1, 1) = '-' then substr("brews"."shot_time_seconds", 2) else "brews"."shot_time_seconds" end glob '[0-9]*'
      and length(replace(case when substr("brews"."shot_time_seconds", 1, 1) = '-' then substr("brews"."shot_time_seconds", 2) else "brews"."shot_time_seconds" end, '.', '')) between 1 and 8
      and length(case when substr("brews"."shot_time_seconds", 1, 1) = '-' then substr("brews"."shot_time_seconds", 2) else "brews"."shot_time_seconds" end) - length(replace(case when substr("brews"."shot_time_seconds", 1, 1) = '-' then substr("brews"."shot_time_seconds", 2) else "brews"."shot_time_seconds" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("brews"."shot_time_seconds", 1, 1) = '-' then substr("brews"."shot_time_seconds", 2) else "brews"."shot_time_seconds" end, '.') > 1
        and length(substr(case when substr("brews"."shot_time_seconds", 1, 1) = '-' then substr("brews"."shot_time_seconds", 2) else "brews"."shot_time_seconds" end, instr(case when substr("brews"."shot_time_seconds", 1, 1) = '-' then substr("brews"."shot_time_seconds", 2) else "brews"."shot_time_seconds" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "brews_targetTimeSeconds_decimal" CHECK("brews"."target_time_seconds" is null or (
      typeof("brews"."target_time_seconds") = 'text'
      and case when substr("brews"."target_time_seconds", 1, 1) = '-' then substr("brews"."target_time_seconds", 2) else "brews"."target_time_seconds" end not glob '*[^0-9.]*'
      and case when substr("brews"."target_time_seconds", 1, 1) = '-' then substr("brews"."target_time_seconds", 2) else "brews"."target_time_seconds" end glob '[0-9]*'
      and length(replace(case when substr("brews"."target_time_seconds", 1, 1) = '-' then substr("brews"."target_time_seconds", 2) else "brews"."target_time_seconds" end, '.', '')) between 1 and 8
      and length(case when substr("brews"."target_time_seconds", 1, 1) = '-' then substr("brews"."target_time_seconds", 2) else "brews"."target_time_seconds" end) - length(replace(case when substr("brews"."target_time_seconds", 1, 1) = '-' then substr("brews"."target_time_seconds", 2) else "brews"."target_time_seconds" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("brews"."target_time_seconds", 1, 1) = '-' then substr("brews"."target_time_seconds", 2) else "brews"."target_time_seconds" end, '.') > 1
        and length(substr(case when substr("brews"."target_time_seconds", 1, 1) = '-' then substr("brews"."target_time_seconds", 2) else "brews"."target_time_seconds" end, instr(case when substr("brews"."target_time_seconds", 1, 1) = '-' then substr("brews"."target_time_seconds", 2) else "brews"."target_time_seconds" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "brews_brewTemperatureCelsius_decimal" CHECK("brews"."brew_temperature_celsius" is null or (
      typeof("brews"."brew_temperature_celsius") = 'text'
      and case when substr("brews"."brew_temperature_celsius", 1, 1) = '-' then substr("brews"."brew_temperature_celsius", 2) else "brews"."brew_temperature_celsius" end not glob '*[^0-9.]*'
      and case when substr("brews"."brew_temperature_celsius", 1, 1) = '-' then substr("brews"."brew_temperature_celsius", 2) else "brews"."brew_temperature_celsius" end glob '[0-9]*'
      and length(replace(case when substr("brews"."brew_temperature_celsius", 1, 1) = '-' then substr("brews"."brew_temperature_celsius", 2) else "brews"."brew_temperature_celsius" end, '.', '')) between 1 and 4
      and length(case when substr("brews"."brew_temperature_celsius", 1, 1) = '-' then substr("brews"."brew_temperature_celsius", 2) else "brews"."brew_temperature_celsius" end) - length(replace(case when substr("brews"."brew_temperature_celsius", 1, 1) = '-' then substr("brews"."brew_temperature_celsius", 2) else "brews"."brew_temperature_celsius" end, '.', '')) = 1
      and (1 = 0 or (
        instr(case when substr("brews"."brew_temperature_celsius", 1, 1) = '-' then substr("brews"."brew_temperature_celsius", 2) else "brews"."brew_temperature_celsius" end, '.') > 1
        and length(substr(case when substr("brews"."brew_temperature_celsius", 1, 1) = '-' then substr("brews"."brew_temperature_celsius", 2) else "brews"."brew_temperature_celsius" end, instr(case when substr("brews"."brew_temperature_celsius", 1, 1) = '-' then substr("brews"."brew_temperature_celsius", 2) else "brews"."brew_temperature_celsius" end, '.') + 1)) = 1
      ))
    )),
	CONSTRAINT "brews_preinfusionTimeSeconds_decimal" CHECK("brews"."preinfusion_time_seconds" is null or (
      typeof("brews"."preinfusion_time_seconds") = 'text'
      and case when substr("brews"."preinfusion_time_seconds", 1, 1) = '-' then substr("brews"."preinfusion_time_seconds", 2) else "brews"."preinfusion_time_seconds" end not glob '*[^0-9.]*'
      and case when substr("brews"."preinfusion_time_seconds", 1, 1) = '-' then substr("brews"."preinfusion_time_seconds", 2) else "brews"."preinfusion_time_seconds" end glob '[0-9]*'
      and length(replace(case when substr("brews"."preinfusion_time_seconds", 1, 1) = '-' then substr("brews"."preinfusion_time_seconds", 2) else "brews"."preinfusion_time_seconds" end, '.', '')) between 1 and 5
      and length(case when substr("brews"."preinfusion_time_seconds", 1, 1) = '-' then substr("brews"."preinfusion_time_seconds", 2) else "brews"."preinfusion_time_seconds" end) - length(replace(case when substr("brews"."preinfusion_time_seconds", 1, 1) = '-' then substr("brews"."preinfusion_time_seconds", 2) else "brews"."preinfusion_time_seconds" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("brews"."preinfusion_time_seconds", 1, 1) = '-' then substr("brews"."preinfusion_time_seconds", 2) else "brews"."preinfusion_time_seconds" end, '.') > 1
        and length(substr(case when substr("brews"."preinfusion_time_seconds", 1, 1) = '-' then substr("brews"."preinfusion_time_seconds", 2) else "brews"."preinfusion_time_seconds" end, instr(case when substr("brews"."preinfusion_time_seconds", 1, 1) = '-' then substr("brews"."preinfusion_time_seconds", 2) else "brews"."preinfusion_time_seconds" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "brews_preinfusionPressureBar_decimal" CHECK("brews"."preinfusion_pressure_bar" is null or (
      typeof("brews"."preinfusion_pressure_bar") = 'text'
      and case when substr("brews"."preinfusion_pressure_bar", 1, 1) = '-' then substr("brews"."preinfusion_pressure_bar", 2) else "brews"."preinfusion_pressure_bar" end not glob '*[^0-9.]*'
      and case when substr("brews"."preinfusion_pressure_bar", 1, 1) = '-' then substr("brews"."preinfusion_pressure_bar", 2) else "brews"."preinfusion_pressure_bar" end glob '[0-9]*'
      and length(replace(case when substr("brews"."preinfusion_pressure_bar", 1, 1) = '-' then substr("brews"."preinfusion_pressure_bar", 2) else "brews"."preinfusion_pressure_bar" end, '.', '')) between 1 and 4
      and length(case when substr("brews"."preinfusion_pressure_bar", 1, 1) = '-' then substr("brews"."preinfusion_pressure_bar", 2) else "brews"."preinfusion_pressure_bar" end) - length(replace(case when substr("brews"."preinfusion_pressure_bar", 1, 1) = '-' then substr("brews"."preinfusion_pressure_bar", 2) else "brews"."preinfusion_pressure_bar" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("brews"."preinfusion_pressure_bar", 1, 1) = '-' then substr("brews"."preinfusion_pressure_bar", 2) else "brews"."preinfusion_pressure_bar" end, '.') > 1
        and length(substr(case when substr("brews"."preinfusion_pressure_bar", 1, 1) = '-' then substr("brews"."preinfusion_pressure_bar", 2) else "brews"."preinfusion_pressure_bar" end, instr(case when substr("brews"."preinfusion_pressure_bar", 1, 1) = '-' then substr("brews"."preinfusion_pressure_bar", 2) else "brews"."preinfusion_pressure_bar" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "brews_bloomTimeSeconds_decimal" CHECK("brews"."bloom_time_seconds" is null or (
      typeof("brews"."bloom_time_seconds") = 'text'
      and case when substr("brews"."bloom_time_seconds", 1, 1) = '-' then substr("brews"."bloom_time_seconds", 2) else "brews"."bloom_time_seconds" end not glob '*[^0-9.]*'
      and case when substr("brews"."bloom_time_seconds", 1, 1) = '-' then substr("brews"."bloom_time_seconds", 2) else "brews"."bloom_time_seconds" end glob '[0-9]*'
      and length(replace(case when substr("brews"."bloom_time_seconds", 1, 1) = '-' then substr("brews"."bloom_time_seconds", 2) else "brews"."bloom_time_seconds" end, '.', '')) between 1 and 5
      and length(case when substr("brews"."bloom_time_seconds", 1, 1) = '-' then substr("brews"."bloom_time_seconds", 2) else "brews"."bloom_time_seconds" end) - length(replace(case when substr("brews"."bloom_time_seconds", 1, 1) = '-' then substr("brews"."bloom_time_seconds", 2) else "brews"."bloom_time_seconds" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("brews"."bloom_time_seconds", 1, 1) = '-' then substr("brews"."bloom_time_seconds", 2) else "brews"."bloom_time_seconds" end, '.') > 1
        and length(substr(case when substr("brews"."bloom_time_seconds", 1, 1) = '-' then substr("brews"."bloom_time_seconds", 2) else "brews"."bloom_time_seconds" end, instr(case when substr("brews"."bloom_time_seconds", 1, 1) = '-' then substr("brews"."bloom_time_seconds", 2) else "brews"."bloom_time_seconds" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "brews_brewPressureBar_decimal" CHECK("brews"."brew_pressure_bar" is null or (
      typeof("brews"."brew_pressure_bar") = 'text'
      and case when substr("brews"."brew_pressure_bar", 1, 1) = '-' then substr("brews"."brew_pressure_bar", 2) else "brews"."brew_pressure_bar" end not glob '*[^0-9.]*'
      and case when substr("brews"."brew_pressure_bar", 1, 1) = '-' then substr("brews"."brew_pressure_bar", 2) else "brews"."brew_pressure_bar" end glob '[0-9]*'
      and length(replace(case when substr("brews"."brew_pressure_bar", 1, 1) = '-' then substr("brews"."brew_pressure_bar", 2) else "brews"."brew_pressure_bar" end, '.', '')) between 1 and 4
      and length(case when substr("brews"."brew_pressure_bar", 1, 1) = '-' then substr("brews"."brew_pressure_bar", 2) else "brews"."brew_pressure_bar" end) - length(replace(case when substr("brews"."brew_pressure_bar", 1, 1) = '-' then substr("brews"."brew_pressure_bar", 2) else "brews"."brew_pressure_bar" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("brews"."brew_pressure_bar", 1, 1) = '-' then substr("brews"."brew_pressure_bar", 2) else "brews"."brew_pressure_bar" end, '.') > 1
        and length(substr(case when substr("brews"."brew_pressure_bar", 1, 1) = '-' then substr("brews"."brew_pressure_bar", 2) else "brews"."brew_pressure_bar" end, instr(case when substr("brews"."brew_pressure_bar", 1, 1) = '-' then substr("brews"."brew_pressure_bar", 2) else "brews"."brew_pressure_bar" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "brews_flowRateMlPerSecond_decimal" CHECK("brews"."flow_rate_ml_per_second" is null or (
      typeof("brews"."flow_rate_ml_per_second") = 'text'
      and case when substr("brews"."flow_rate_ml_per_second", 1, 1) = '-' then substr("brews"."flow_rate_ml_per_second", 2) else "brews"."flow_rate_ml_per_second" end not glob '*[^0-9.]*'
      and case when substr("brews"."flow_rate_ml_per_second", 1, 1) = '-' then substr("brews"."flow_rate_ml_per_second", 2) else "brews"."flow_rate_ml_per_second" end glob '[0-9]*'
      and length(replace(case when substr("brews"."flow_rate_ml_per_second", 1, 1) = '-' then substr("brews"."flow_rate_ml_per_second", 2) else "brews"."flow_rate_ml_per_second" end, '.', '')) between 1 and 4
      and length(case when substr("brews"."flow_rate_ml_per_second", 1, 1) = '-' then substr("brews"."flow_rate_ml_per_second", 2) else "brews"."flow_rate_ml_per_second" end) - length(replace(case when substr("brews"."flow_rate_ml_per_second", 1, 1) = '-' then substr("brews"."flow_rate_ml_per_second", 2) else "brews"."flow_rate_ml_per_second" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("brews"."flow_rate_ml_per_second", 1, 1) = '-' then substr("brews"."flow_rate_ml_per_second", 2) else "brews"."flow_rate_ml_per_second" end, '.') > 1
        and length(substr(case when substr("brews"."flow_rate_ml_per_second", 1, 1) = '-' then substr("brews"."flow_rate_ml_per_second", 2) else "brews"."flow_rate_ml_per_second" end, instr(case when substr("brews"."flow_rate_ml_per_second", 1, 1) = '-' then substr("brews"."flow_rate_ml_per_second", 2) else "brews"."flow_rate_ml_per_second" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "brews_usesPuckScreen_boolean" CHECK("brews"."uses_puck_screen" in (0, 1)),
	CONSTRAINT "brews_tampForceKg_decimal" CHECK("brews"."tamp_force_kg" is null or (
      typeof("brews"."tamp_force_kg") = 'text'
      and case when substr("brews"."tamp_force_kg", 1, 1) = '-' then substr("brews"."tamp_force_kg", 2) else "brews"."tamp_force_kg" end not glob '*[^0-9.]*'
      and case when substr("brews"."tamp_force_kg", 1, 1) = '-' then substr("brews"."tamp_force_kg", 2) else "brews"."tamp_force_kg" end glob '[0-9]*'
      and length(replace(case when substr("brews"."tamp_force_kg", 1, 1) = '-' then substr("brews"."tamp_force_kg", 2) else "brews"."tamp_force_kg" end, '.', '')) between 1 and 5
      and length(case when substr("brews"."tamp_force_kg", 1, 1) = '-' then substr("brews"."tamp_force_kg", 2) else "brews"."tamp_force_kg" end) - length(replace(case when substr("brews"."tamp_force_kg", 1, 1) = '-' then substr("brews"."tamp_force_kg", 2) else "brews"."tamp_force_kg" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("brews"."tamp_force_kg", 1, 1) = '-' then substr("brews"."tamp_force_kg", 2) else "brews"."tamp_force_kg" end, '.') > 1
        and length(substr(case when substr("brews"."tamp_force_kg", 1, 1) = '-' then substr("brews"."tamp_force_kg", 2) else "brews"."tamp_force_kg" end, instr(case when substr("brews"."tamp_force_kg", 1, 1) = '-' then substr("brews"."tamp_force_kg", 2) else "brews"."tamp_force_kg" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "brews_ratio_basis_check" CHECK("brews"."ratio_basis" in ('target_yield', 'brew_water')),
	CONSTRAINT "brews_paper_filter_position_check" CHECK("brews"."paper_filter_position" in ('none', 'top', 'bottom', 'both')),
	CONSTRAINT "brews_rating_check" CHECK("brews"."rating" between 1 and 5),
	CONSTRAINT "brews_extraction_balance_check" CHECK("brews"."extraction_balance" between 1 and 5),
	CONSTRAINT "brews_sensory_ratings_check" CHECK(("brews"."bitterness" is null or "brews"."bitterness" between 1 and 5)
        and ("brews"."acidity" is null or "brews"."acidity" between 1 and 5)
        and ("brews"."sweetness" is null or "brews"."sweetness" between 1 and 5)
        and ("brews"."body" is null or "brews"."body" between 1 and 5)
        and ("brews"."astringency" is null or "brews"."astringency" between 1 and 5)),
	CONSTRAINT "brews_measurements_nonnegative" CHECK(("brews"."dose_grams" is null or cast("brews"."dose_grams" as real) >= 0)
        and ("brews"."brew_water_grams" is null or cast("brews"."brew_water_grams" as real) >= 0)
        and ("brews"."yield_grams" is null or cast("brews"."yield_grams" as real) >= 0)
        and ("brews"."shot_time_seconds" is null or cast("brews"."shot_time_seconds" as real) >= 0)
        and ("brews"."target_time_seconds" is null or cast("brews"."target_time_seconds" as real) >= 0)
        and ("brews"."brew_temperature_celsius" is null or cast("brews"."brew_temperature_celsius" as real) >= 0)
        and ("brews"."preinfusion_time_seconds" is null or cast("brews"."preinfusion_time_seconds" as real) >= 0)
        and ("brews"."preinfusion_pressure_bar" is null or cast("brews"."preinfusion_pressure_bar" as real) >= 0)
        and ("brews"."bloom_time_seconds" is null or cast("brews"."bloom_time_seconds" as real) >= 0)
        and ("brews"."brew_pressure_bar" is null or cast("brews"."brew_pressure_bar" as real) >= 0)
        and ("brews"."flow_rate_ml_per_second" is null or cast("brews"."flow_rate_ml_per_second" as real) >= 0)
        and ("brews"."tamp_force_kg" is null or cast("brews"."tamp_force_kg" as real) >= 0)),
	CONSTRAINT "brews_purchase_requires_bean" CHECK("brews"."bean_purchase_id" is null or "brews"."bean_id" is not null)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brews_id_owner_unique` ON `brews` (`owner_id`,`id`);--> statement-breakpoint
CREATE INDEX `brews_owner_id_idx` ON `brews` (`owner_id`);--> statement-breakpoint
CREATE INDEX `brews_created_at_idx` ON `brews` (`created_at`);--> statement-breakpoint
CREATE INDEX `brews_brewed_at_idx` ON `brews` (`brewed_at`);--> statement-breakpoint
CREATE INDEX `brews_brewing_method_id_idx` ON `brews` (`brewing_method_id`);--> statement-breakpoint
CREATE INDEX `brews_bean_id_idx` ON `brews` (`bean_id`);--> statement-breakpoint
CREATE INDEX `brews_bean_purchase_id_idx` ON `brews` (`bean_purchase_id`);--> statement-breakpoint
CREATE INDEX `brews_drink_type_id_idx` ON `brews` (`drink_type_id`);--> statement-breakpoint
CREATE INDEX `brews_machine_setting_revision_id_idx` ON `brews` (`machine_setting_revision_id`);--> statement-breakpoint
CREATE INDEX `brews_machine_id_idx` ON `brews` (`machine_id`);--> statement-breakpoint
CREATE INDEX `brews_grinder_id_idx` ON `brews` (`grinder_id`);--> statement-breakpoint
CREATE INDEX `brews_basket_id_idx` ON `brews` (`basket_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `brews_client_operation_id_unique` ON `brews` (`owner_id`,`client_operation_id`);--> statement-breakpoint
CREATE TABLE `shottimer` (
	`owner_id` text NOT NULL,
	`id` integer DEFAULT 1 NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`token_hash` text,
	`latest_shot_seconds` real,
	`latest_shot_at` integer,
	`target_time_seconds` real,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	PRIMARY KEY(`owner_id`, `id`),
	CONSTRAINT "shottimer_enabled_boolean" CHECK("shottimer"."enabled" in (0, 1)),
	CONSTRAINT "shottimer_singleton_check" CHECK("shottimer"."id" = 1)
);
--> statement-breakpoint
CREATE INDEX `shottimer_owner_id_idx` ON `shottimer` (`owner_id`);--> statement-breakpoint
CREATE TABLE `tamper_details` (
	`owner_id` text NOT NULL,
	`gear_id` integer PRIMARY KEY NOT NULL,
	`diameter_mm` text,
	`force_control` text,
	`base_shape` text,
	`self_leveling` integer,
	FOREIGN KEY (`gear_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`gear_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "tamper_details_diameterMm_decimal" CHECK("tamper_details"."diameter_mm" is null or (
      typeof("tamper_details"."diameter_mm") = 'text'
      and case when substr("tamper_details"."diameter_mm", 1, 1) = '-' then substr("tamper_details"."diameter_mm", 2) else "tamper_details"."diameter_mm" end not glob '*[^0-9.]*'
      and case when substr("tamper_details"."diameter_mm", 1, 1) = '-' then substr("tamper_details"."diameter_mm", 2) else "tamper_details"."diameter_mm" end glob '[0-9]*'
      and length(replace(case when substr("tamper_details"."diameter_mm", 1, 1) = '-' then substr("tamper_details"."diameter_mm", 2) else "tamper_details"."diameter_mm" end, '.', '')) between 1 and 5
      and length(case when substr("tamper_details"."diameter_mm", 1, 1) = '-' then substr("tamper_details"."diameter_mm", 2) else "tamper_details"."diameter_mm" end) - length(replace(case when substr("tamper_details"."diameter_mm", 1, 1) = '-' then substr("tamper_details"."diameter_mm", 2) else "tamper_details"."diameter_mm" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("tamper_details"."diameter_mm", 1, 1) = '-' then substr("tamper_details"."diameter_mm", 2) else "tamper_details"."diameter_mm" end, '.') > 1
        and length(substr(case when substr("tamper_details"."diameter_mm", 1, 1) = '-' then substr("tamper_details"."diameter_mm", 2) else "tamper_details"."diameter_mm" end, instr(case when substr("tamper_details"."diameter_mm", 1, 1) = '-' then substr("tamper_details"."diameter_mm", 2) else "tamper_details"."diameter_mm" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "tamper_details_selfLeveling_boolean" CHECK("tamper_details"."self_leveling" in (0, 1)),
	CONSTRAINT "tamper_details_force_control_check" CHECK("tamper_details"."force_control" in ('none', 'fixed', 'adjustable')),
	CONSTRAINT "tamper_details_base_shape_check" CHECK("tamper_details"."base_shape" in ('flat', 'convex', 'rippled', 'other')),
	CONSTRAINT "tamper_details_diameter_check" CHECK("tamper_details"."diameter_mm" is null or cast("tamper_details"."diameter_mm" as real) > 0)
);
--> statement-breakpoint
CREATE INDEX `tamper_details_owner_id_idx` ON `tamper_details` (`owner_id`);--> statement-breakpoint
CREATE TABLE `taste_tags` (
	`owner_id` text NOT NULL,
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`extraction_axis` text,
	`strength_axis` text,
	`hint` text DEFAULT '' NOT NULL,
	CONSTRAINT "taste_tags_extractionAxis_decimal" CHECK("taste_tags"."extraction_axis" is null or (
      typeof("taste_tags"."extraction_axis") = 'text'
      and case when substr("taste_tags"."extraction_axis", 1, 1) = '-' then substr("taste_tags"."extraction_axis", 2) else "taste_tags"."extraction_axis" end not glob '*[^0-9.]*'
      and case when substr("taste_tags"."extraction_axis", 1, 1) = '-' then substr("taste_tags"."extraction_axis", 2) else "taste_tags"."extraction_axis" end glob '[0-9]*'
      and length(replace(case when substr("taste_tags"."extraction_axis", 1, 1) = '-' then substr("taste_tags"."extraction_axis", 2) else "taste_tags"."extraction_axis" end, '.', '')) between 1 and 3
      and length(case when substr("taste_tags"."extraction_axis", 1, 1) = '-' then substr("taste_tags"."extraction_axis", 2) else "taste_tags"."extraction_axis" end) - length(replace(case when substr("taste_tags"."extraction_axis", 1, 1) = '-' then substr("taste_tags"."extraction_axis", 2) else "taste_tags"."extraction_axis" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("taste_tags"."extraction_axis", 1, 1) = '-' then substr("taste_tags"."extraction_axis", 2) else "taste_tags"."extraction_axis" end, '.') > 1
        and length(substr(case when substr("taste_tags"."extraction_axis", 1, 1) = '-' then substr("taste_tags"."extraction_axis", 2) else "taste_tags"."extraction_axis" end, instr(case when substr("taste_tags"."extraction_axis", 1, 1) = '-' then substr("taste_tags"."extraction_axis", 2) else "taste_tags"."extraction_axis" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "taste_tags_strengthAxis_decimal" CHECK("taste_tags"."strength_axis" is null or (
      typeof("taste_tags"."strength_axis") = 'text'
      and case when substr("taste_tags"."strength_axis", 1, 1) = '-' then substr("taste_tags"."strength_axis", 2) else "taste_tags"."strength_axis" end not glob '*[^0-9.]*'
      and case when substr("taste_tags"."strength_axis", 1, 1) = '-' then substr("taste_tags"."strength_axis", 2) else "taste_tags"."strength_axis" end glob '[0-9]*'
      and length(replace(case when substr("taste_tags"."strength_axis", 1, 1) = '-' then substr("taste_tags"."strength_axis", 2) else "taste_tags"."strength_axis" end, '.', '')) between 1 and 3
      and length(case when substr("taste_tags"."strength_axis", 1, 1) = '-' then substr("taste_tags"."strength_axis", 2) else "taste_tags"."strength_axis" end) - length(replace(case when substr("taste_tags"."strength_axis", 1, 1) = '-' then substr("taste_tags"."strength_axis", 2) else "taste_tags"."strength_axis" end, '.', '')) = 1
      and (2 = 0 or (
        instr(case when substr("taste_tags"."strength_axis", 1, 1) = '-' then substr("taste_tags"."strength_axis", 2) else "taste_tags"."strength_axis" end, '.') > 1
        and length(substr(case when substr("taste_tags"."strength_axis", 1, 1) = '-' then substr("taste_tags"."strength_axis", 2) else "taste_tags"."strength_axis" end, instr(case when substr("taste_tags"."strength_axis", 1, 1) = '-' then substr("taste_tags"."strength_axis", 2) else "taste_tags"."strength_axis" end, '.') + 1)) = 2
      ))
    )),
	CONSTRAINT "taste_tags_extraction_axis_check" CHECK(cast("taste_tags"."extraction_axis" as real) between -1 and 1),
	CONSTRAINT "taste_tags_strength_axis_check" CHECK(cast("taste_tags"."strength_axis" as real) between -1 and 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `taste_tags_id_owner_unique` ON `taste_tags` (`owner_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `taste_tags_name_unique` ON `taste_tags` (`owner_id`,`name`);--> statement-breakpoint
CREATE INDEX `taste_tags_owner_id_idx` ON `taste_tags` (`owner_id`);--> statement-breakpoint
CREATE TABLE `wdt_details` (
	`owner_id` text NOT NULL,
	`gear_id` integer PRIMARY KEY NOT NULL,
	`needle_diameter_mm` text,
	`needle_count` integer,
	`depth_control` text,
	FOREIGN KEY (`gear_id`) REFERENCES `gear`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`owner_id`,`gear_id`) REFERENCES `gear`(`owner_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "wdt_details_needleDiameterMm_decimal" CHECK("wdt_details"."needle_diameter_mm" is null or (
      typeof("wdt_details"."needle_diameter_mm") = 'text'
      and case when substr("wdt_details"."needle_diameter_mm", 1, 1) = '-' then substr("wdt_details"."needle_diameter_mm", 2) else "wdt_details"."needle_diameter_mm" end not glob '*[^0-9.]*'
      and case when substr("wdt_details"."needle_diameter_mm", 1, 1) = '-' then substr("wdt_details"."needle_diameter_mm", 2) else "wdt_details"."needle_diameter_mm" end glob '[0-9]*'
      and length(replace(case when substr("wdt_details"."needle_diameter_mm", 1, 1) = '-' then substr("wdt_details"."needle_diameter_mm", 2) else "wdt_details"."needle_diameter_mm" end, '.', '')) between 1 and 5
      and length(case when substr("wdt_details"."needle_diameter_mm", 1, 1) = '-' then substr("wdt_details"."needle_diameter_mm", 2) else "wdt_details"."needle_diameter_mm" end) - length(replace(case when substr("wdt_details"."needle_diameter_mm", 1, 1) = '-' then substr("wdt_details"."needle_diameter_mm", 2) else "wdt_details"."needle_diameter_mm" end, '.', '')) = 1
      and (3 = 0 or (
        instr(case when substr("wdt_details"."needle_diameter_mm", 1, 1) = '-' then substr("wdt_details"."needle_diameter_mm", 2) else "wdt_details"."needle_diameter_mm" end, '.') > 1
        and length(substr(case when substr("wdt_details"."needle_diameter_mm", 1, 1) = '-' then substr("wdt_details"."needle_diameter_mm", 2) else "wdt_details"."needle_diameter_mm" end, instr(case when substr("wdt_details"."needle_diameter_mm", 1, 1) = '-' then substr("wdt_details"."needle_diameter_mm", 2) else "wdt_details"."needle_diameter_mm" end, '.') + 1)) = 3
      ))
    )),
	CONSTRAINT "wdt_details_depth_control_check" CHECK("wdt_details"."depth_control" in ('none', 'fixed', 'adjustable')),
	CONSTRAINT "wdt_details_measurements_check" CHECK(("wdt_details"."needle_diameter_mm" is null or cast("wdt_details"."needle_diameter_mm" as real) > 0)
        and ("wdt_details"."needle_count" is null or "wdt_details"."needle_count" > 0))
);
--> statement-breakpoint
CREATE INDEX `wdt_details_owner_id_idx` ON `wdt_details` (`owner_id`);
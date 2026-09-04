ALTER TABLE "grinder_details" ADD COLUMN "grind_setting_format" text DEFAULT 'string' NOT NULL;--> statement-breakpoint
ALTER TABLE "grinder_details" ADD COLUMN "grind_setting_minimum" numeric(7, 3);--> statement-breakpoint
ALTER TABLE "grinder_details" ADD COLUMN "grind_setting_maximum" numeric(7, 3);--> statement-breakpoint
ALTER TABLE "grinder_details" ADD CONSTRAINT "grinder_details_grind_setting_format_check" CHECK ("grinder_details"."grind_setting_format" in ('whole_number', 'decimal', 'string'));--> statement-breakpoint
ALTER TABLE "grinder_details" ADD CONSTRAINT "grinder_details_grind_setting_range_check" CHECK (("grinder_details"."grind_setting_minimum" is null or "grinder_details"."grind_setting_minimum" >= 0)
        and ("grinder_details"."grind_setting_maximum" is null or "grinder_details"."grind_setting_maximum" >= 0)
        and ("grinder_details"."grind_setting_minimum" is null or "grinder_details"."grind_setting_maximum" is null or "grinder_details"."grind_setting_minimum" <= "grinder_details"."grind_setting_maximum")
        and ("grinder_details"."grind_setting_format" <> 'string' or ("grinder_details"."grind_setting_minimum" is null and "grinder_details"."grind_setting_maximum" is null))
        and ("grinder_details"."grind_setting_format" <> 'whole_number' or "grinder_details"."grind_setting_minimum" is null or trunc("grinder_details"."grind_setting_minimum") = "grinder_details"."grind_setting_minimum")
        and ("grinder_details"."grind_setting_format" <> 'whole_number' or "grinder_details"."grind_setting_maximum" is null or trunc("grinder_details"."grind_setting_maximum") = "grinder_details"."grind_setting_maximum"));
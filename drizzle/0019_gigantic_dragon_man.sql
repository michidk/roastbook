CREATE TABLE "settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"default_currency" text DEFAULT 'EUR' NOT NULL,
	"default_map_latitude" double precision,
	"default_map_longitude" double precision,
	"default_map_label" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "settings_singleton_check" CHECK ("settings"."id" = 1),
	CONSTRAINT "settings_currency_check" CHECK ("settings"."default_currency" in ('EUR', 'USD', 'GBP', 'CHF')),
	CONSTRAINT "settings_map_location_check" CHECK ((
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
INSERT INTO "settings" ("id") VALUES (1);

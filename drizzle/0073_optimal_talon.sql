ALTER TABLE "settings" ADD COLUMN "light_theme" text DEFAULT 'light-roast' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "dark_theme" text DEFAULT 'dark-roast' NOT NULL;--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN "background_grain_enabled" boolean DEFAULT true NOT NULL;
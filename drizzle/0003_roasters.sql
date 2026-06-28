-- Create roasters table
CREATE TABLE IF NOT EXISTS "roasters" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "location" text,
  "country" text,
  "website" text,
  "instagram_handle" text,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Add roaster_id foreign key to beans table
ALTER TABLE "beans" ADD COLUMN "roaster_id" integer;--> statement-breakpoint
ALTER TABLE "beans" ADD CONSTRAINT "beans_roaster_id_roasters_id_fk" FOREIGN KEY ("roaster_id") REFERENCES "roasters"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

ALTER TYPE "public"."gear_type" ADD VALUE 'brewer' BEFORE 'grinder';--> statement-breakpoint
ALTER TABLE "brewing_methods" ADD COLUMN "timer_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE "brewing_methods"
SET "timer_enabled" = 'shotTimeSeconds' = ANY("enabled_parameters");--> statement-breakpoint
UPDATE "brewing_methods"
SET "enabled_parameters" = array_prepend('machineId', "enabled_parameters")
WHERE "name" IN ('Pour over', 'AeroPress', 'French press', 'Moka pot', 'Cold brew')
  AND NOT ('machineId' = ANY("enabled_parameters"));

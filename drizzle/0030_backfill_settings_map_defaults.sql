-- Migration 0019 inserts the singleton settings row before 0026 gives the map
-- columns their Paris defaults, and `ALTER COLUMN ... SET DEFAULT` never
-- backfills existing rows. Every database created before this point therefore
-- has a settings row with no default map location at all.
--
-- Only fill the row when all three columns are still NULL, both to respect
-- `settings_map_location_check` (all set or all null) and to leave a location
-- the user has already chosen untouched.
UPDATE "settings"
SET
	"default_map_latitude" = 48.8566,
	"default_map_longitude" = 2.3522,
	"default_map_label" = 'Paris, France'
WHERE "id" = 1
	AND "default_map_latitude" IS NULL
	AND "default_map_longitude" IS NULL
	AND "default_map_label" IS NULL;

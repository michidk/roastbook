-- Pour over describes a brewing method. Existing drinks keep their history as Filter.
INSERT INTO "drink_types" ("name") VALUES ('Filter') ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "brewing_method_drink_types" ("brewing_method_id", "drink_type_id")
SELECT links."brewing_method_id", target."id"
FROM "brewing_method_drink_types" links
JOIN "drink_types" source ON source."id" = links."drink_type_id"
CROSS JOIN "drink_types" target
WHERE source."name" = 'Pour Over' AND target."name" = 'Filter'
ON CONFLICT ("brewing_method_id", "drink_type_id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "drink_type_option_groups" ("drink_type_id", "option_group_id")
SELECT target."id", links."option_group_id"
FROM "drink_type_option_groups" links
JOIN "drink_types" source ON source."id" = links."drink_type_id"
CROSS JOIN "drink_types" target
WHERE source."name" = 'Pour Over' AND target."name" = 'Filter'
ON CONFLICT ("drink_type_id", "option_group_id") DO NOTHING;
--> statement-breakpoint
UPDATE "brews" SET "drink_type_id" = (SELECT "id" FROM "drink_types" WHERE "name" = 'Filter'),
  "revision" = "revision" + 1, "updated_at" = now()
WHERE "drink_type_id" = (SELECT "id" FROM "drink_types" WHERE "name" = 'Pour Over');
--> statement-breakpoint
WITH changed AS (
  UPDATE "recipes" SET "drink_type_id" = (SELECT "id" FROM "drink_types" WHERE "name" = 'Filter'),
    "revision" = "revision" + 1, "updated_at" = now()
  WHERE "drink_type_id" = (SELECT "id" FROM "drink_types" WHERE "name" = 'Pour Over')
  RETURNING *
)
INSERT INTO "replication_changes" ("entity", "document_id", "document")
SELECT 'recipes', "sync_id", jsonb_build_object(
  'id', "sync_id", 'serverId', "id", 'syncId', "sync_id", 'name', "name",
  'brewingMethodId', "brewing_method_id", 'beanId', "bean_id", 'drinkTypeId', "drink_type_id",
  'serverRevision', "revision", 'updatedAt', to_char("updated_at" AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'), '_deleted', false
) FROM changed;
--> statement-breakpoint
UPDATE "cafe_visits" SET "drink_type_id" = (SELECT "id" FROM "drink_types" WHERE "name" = 'Filter'), "updated_at" = now()
WHERE "drink_type_id" = (SELECT "id" FROM "drink_types" WHERE "name" = 'Pour Over');
--> statement-breakpoint
DELETE FROM "drink_types" WHERE "name" = 'Pour Over';
--> statement-breakpoint
-- Only replace untouched default field selections; keep customized methods.
UPDATE "brewing_methods" AS method
SET "enabled_parameters" = defaults.new_parameters, "updated_at" = now()
FROM (VALUES
  ('Espresso', ARRAY['machineId','doseGrams','grinderId','grindSetting','yieldGrams','shotTimeSeconds','targetTimeSeconds','brewTemperatureCelsius','preinfusionTimeSeconds','preinfusionPressureBar','brewPressureBar','basketId','usesPuckScreen','paperFilterPosition','distributionMethod','tampForceKg','accessoryGearIds']::text[], ARRAY['machineId','doseGrams','grinderId','grindSetting','yieldGrams','shotTimeSeconds','targetTimeSeconds','brewTemperatureCelsius','basketId','accessoryGearIds']::text[]),
  ('Pour over', ARRAY['machineId','doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','targetTimeSeconds','brewTemperatureCelsius','bloomTimeSeconds','flowRateMlPerSecond','accessoryGearIds']::text[], ARRAY['machineId','doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','targetTimeSeconds','brewTemperatureCelsius','bloomTimeSeconds','accessoryGearIds']::text[]),
  ('AeroPress', ARRAY['machineId','doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','targetTimeSeconds','brewTemperatureCelsius','bloomTimeSeconds','paperFilterPosition','accessoryGearIds']::text[], ARRAY['machineId','doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','targetTimeSeconds','brewTemperatureCelsius','accessoryGearIds']::text[]),
  ('French press', ARRAY['machineId','doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','targetTimeSeconds','brewTemperatureCelsius','bloomTimeSeconds','accessoryGearIds']::text[], ARRAY['machineId','doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','targetTimeSeconds','brewTemperatureCelsius','accessoryGearIds']::text[])
) AS defaults(name, old_parameters, new_parameters)
WHERE method."name" = defaults.name
  AND method."enabled_parameters" @> defaults.old_parameters
  AND defaults.old_parameters @> method."enabled_parameters";

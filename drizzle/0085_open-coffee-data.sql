-- Distribution methods were stored as display labels; store the Open Coffee ids.
UPDATE "brews" SET "distribution_method" = CASE "distribution_method"
  WHEN 'WDT' THEN 'wdt'
  WHEN 'Blind shaker' THEN 'blind_shaker'
  WHEN 'Distribution tool' THEN 'distribution_tool'
  WHEN 'Stockfleth move' THEN 'stockfleth_move'
END
WHERE "distribution_method" IN ('WDT', 'Blind shaker', 'Distribution tool', 'Stockfleth move');
--> statement-breakpoint
UPDATE "recipes" SET "distribution_method" = CASE "distribution_method"
  WHEN 'WDT' THEN 'wdt'
  WHEN 'Blind shaker' THEN 'blind_shaker'
  WHEN 'Distribution tool' THEN 'distribution_tool'
  WHEN 'Stockfleth move' THEN 'stockfleth_move'
END
WHERE "distribution_method" IN ('WDT', 'Blind shaker', 'Distribution tool', 'Stockfleth move');
--> statement-breakpoint
-- Link the default methods to their Open Coffee brew methods.
UPDATE "brewing_methods" AS method
SET "brew_method_id" = defaults.brew_method_id
FROM (VALUES
  ('Espresso', 'espresso'),
  ('Pour over', 'pour-over'),
  ('AeroPress', 'aeropress'),
  ('French press', 'french-press'),
  ('Moka pot', 'moka-pot'),
  ('Cold brew', 'cold-brew')
) AS defaults(name, brew_method_id)
WHERE method."name" = defaults.name
  AND method."brew_method_id" IS NULL;
--> statement-breakpoint
-- Enable the new parameters only on untouched default field selections.
UPDATE "brewing_methods" AS method
SET "enabled_parameters" = defaults.new_parameters
FROM (VALUES
  ('Pour over', ARRAY['machineId','doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','targetTimeSeconds','brewTemperatureCelsius','bloomTimeSeconds','accessoryGearIds']::text[], ARRAY['machineId','doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','targetTimeSeconds','brewTemperatureCelsius','bloomTimeSeconds','bloomWaterGrams','pourCount','accessoryGearIds']::text[]),
  ('AeroPress', ARRAY['machineId','doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','targetTimeSeconds','brewTemperatureCelsius','accessoryGearIds']::text[], ARRAY['machineId','doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','targetTimeSeconds','steepTimeSeconds','brewTemperatureCelsius','accessoryGearIds']::text[]),
  ('French press', ARRAY['machineId','doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','targetTimeSeconds','brewTemperatureCelsius','accessoryGearIds']::text[], ARRAY['machineId','doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','targetTimeSeconds','steepTimeSeconds','brewTemperatureCelsius','accessoryGearIds']::text[]),
  ('Cold brew', ARRAY['machineId','doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','targetTimeSeconds','accessoryGearIds']::text[], ARRAY['machineId','doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','targetTimeSeconds','steepTimeSeconds','accessoryGearIds']::text[]),
  ('Other', ARRAY['machineId','doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','targetTimeSeconds','brewTemperatureCelsius','preinfusionTimeSeconds','preinfusionPressureBar','bloomTimeSeconds','brewPressureBar','flowRateMlPerSecond','basketId','usesPuckScreen','paperFilterPosition','distributionMethod','tampForceKg','accessoryGearIds']::text[], ARRAY['machineId','doseGrams','brewWaterGrams','ratioBasis','grinderId','grindSetting','yieldGrams','shotTimeSeconds','targetTimeSeconds','steepTimeSeconds','brewTemperatureCelsius','preinfusionTimeSeconds','preinfusionPressureBar','bloomTimeSeconds','bloomWaterGrams','pourCount','brewPressureBar','flowRateMlPerSecond','basketId','usesPuckScreen','paperFilterPosition','distributionMethod','tampForceKg','accessoryGearIds']::text[])
) AS defaults(name, old_parameters, new_parameters)
WHERE method."name" = defaults.name
  AND method."enabled_parameters" @> defaults.old_parameters
  AND defaults.old_parameters @> method."enabled_parameters";

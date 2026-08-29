-- Target time is a new brewing parameter, so every brewing method created
-- before this migration lists it as disabled and would hide the field until it
-- is switched on by hand. A target only means something where the actual brew
-- time is recorded, so enable it exactly for the methods that already track
-- brew time and leave the others untouched.
UPDATE "brewing_methods"
SET "enabled_parameters" = array_append("enabled_parameters", 'targetTimeSeconds')
WHERE 'shotTimeSeconds' = ANY ("enabled_parameters")
	AND NOT ('targetTimeSeconds' = ANY ("enabled_parameters"));

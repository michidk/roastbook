-- Gear names are now always derived as "<brand> <model>"; the form no longer
-- has a free-form name field. Existing rows predate that rule: many have a
-- name but no model, so treat the old name as the model (stripping a leading
-- brand prefix to avoid repeating it), then rebuild every derivable name.
UPDATE "gear"
SET "model" = NULLIF(btrim(
	CASE
		WHEN "brand" IS NOT NULL
			AND lower("name") LIKE lower("brand") || ' %'
			THEN substr("name", length("brand") + 2)
		ELSE "name"
	END
), '')
WHERE "model" IS NULL OR btrim("model") = '';
--> statement-breakpoint
UPDATE "gear"
SET "name" = btrim(concat_ws(' ', NULLIF(btrim("brand"), ''), NULLIF(btrim("model"), '')))
WHERE btrim(concat_ws(' ', NULLIF(btrim("brand"), ''), NULLIF(btrim("model"), ''))) <> '';

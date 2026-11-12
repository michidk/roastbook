ALTER TABLE "taste_tags" ADD COLUMN "is_archived" boolean DEFAULT false NOT NULL;--> statement-breakpoint
-- Built-in taste tags are the SCA flavor wheel's second tier (src/lib/taste-tags.ts).
-- Server only: browser journals receive these rows through synchronization.
DO $$
BEGIN
IF to_regnamespace('roastbook_local') IS NOT NULL THEN RETURN; END IF;
CREATE TEMP TABLE sca_taste_tags (name text PRIMARY KEY) ON COMMIT DROP;
INSERT INTO sca_taste_tags VALUES
	('Black Tea'), ('Floral'),
	('Berry'), ('Dried Fruit'), ('Other Fruit'), ('Citrus Fruit'),
	('Sour'), ('Alcohol / Fermented'),
	('Olive Oil'), ('Raw'), ('Green / Vegetative'), ('Beany'),
	('Papery / Musty'), ('Chemical'),
	('Pipe Tobacco'), ('Tobacco'), ('Burnt'), ('Cereal'),
	('Pungent'), ('Pepper'), ('Brown Spice'),
	('Nutty'), ('Cocoa'),
	('Brown Sugar'), ('Vanilla'), ('Vanillin'), ('Overall Sweet'), ('Sweet Aromatics');
-- Adopt existing tags that differ only in case or spacing, such as "Dried fruit".
UPDATE "taste_tags" t SET "name" = match.name
FROM (
	SELECT DISTINCT ON (c."owner_id", s.name) c."id", s.name
	FROM "taste_tags" c
	JOIN sca_taste_tags s ON lower(replace(c."name", ' ', '')) = lower(replace(s.name, ' ', ''))
	WHERE c."name" <> s.name
		AND NOT EXISTS (
			SELECT 1 FROM "taste_tags" e WHERE e."owner_id" = c."owner_id" AND e."name" = s.name
		)
	ORDER BY c."owner_id", s.name, c."id"
) match
WHERE t."id" = match."id";
INSERT INTO "taste_tags" ("owner_id", "name")
SELECT owners."owner_id", s.name
FROM (
	SELECT "owner_id" FROM "drink_types"
	UNION SELECT "owner_id" FROM "taste_tags"
) owners
CROSS JOIN sca_taste_tags s
ON CONFLICT ("owner_id", "name") DO NOTHING;
END $$;

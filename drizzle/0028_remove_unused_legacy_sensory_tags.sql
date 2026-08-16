-- Stop offering the original seed tags that are now represented by dedicated
-- sensory intensity fields. Keep tags attached to existing records so this
-- migration never erases historical tasting data; the shot forms hide those
-- retained legacy tags unless they are already selected.
DELETE FROM "taste_tags"
WHERE "name" IN (
	'Bright',
	'Crisp',
	'Mellow',
	'Sour',
	'Bitter',
	'Astringent',
	'Syrupy',
	'Creamy',
	'Thin',
	'Full',
	'Honey'
)
AND NOT EXISTS (
	SELECT 1
	FROM "shot_taste_tags"
	WHERE "shot_taste_tags"."taste_tag_id" = "taste_tags"."id"
)
AND NOT EXISTS (
	SELECT 1
	FROM "cafe_visit_taste_tags"
	WHERE "cafe_visit_taste_tags"."taste_tag_id" = "taste_tags"."id"
);--> statement-breakpoint
UPDATE "taste_tags"
SET "extraction_axis" = NULL, "strength_axis" = NULL
WHERE "name" IN (
	'Berry', 'Dried fruit', 'Citrus', 'Stone fruit', 'Tropical fruit', 'Floral',
	'Chocolate', 'Nutty', 'Caramel', 'Vanilla', 'Spicy', 'Roasted', 'Cereal',
	'Green / vegetative', 'Earthy', 'Fermented', 'Woody'
);--> statement-breakpoint
INSERT INTO "taste_tags" (
	"name", "category", "hint", "extraction_axis", "strength_axis"
)
VALUES
	('Fruity', 'Flavor', 'Flavor wheel: Fruity. A general ripe-fruit aroma when no more specific fruit family fits. Espresso Compass: sweet spot — extraction and strength are on target.', 0.35, 0.25),
	('Overwhelming', 'Flavor', 'Espresso Compass: under-extracted and strong — improve extraction and/or extract more (grind finer, extract longer, or increase yield).', -0.90, 0.70),
	('Intense', 'Flavor', 'Espresso Compass: under-extracted and strong — improve extraction and/or extract more (grind finer, extract longer, or increase yield).', -0.80, 0.40),
	('Salty', 'Flavor', 'Espresso Compass: under-extracted and strong — improve extraction and/or extract more (grind finer, extract longer, or increase yield).', -0.60, 0.50),
	('Quick Finish', 'Flavor', 'Espresso Compass: under-extracted and strong — improve extraction and/or extract more (grind finer, extract longer, or increase yield).', -0.60, -0.10),
	('Generic', 'Flavor', 'Espresso Compass: under-extracted and strong — improve extraction and/or extract more (grind finer, extract longer, or increase yield).', -0.50, -0.20),
	('Bland', 'Flavor', 'Espresso Compass: under-extracted and strong — improve extraction and/or extract more (grind finer, extract longer, or increase yield).', -0.50, -0.40),
	('Strong', 'Flavor', 'Espresso Compass: sweet spot — extraction and strength are on target.', -0.20, 0.90),
	('Robust', 'Flavor', 'Espresso Compass: sweet spot — extraction and strength are on target.', -0.10, 0.75),
	('Plump', 'Flavor', 'Espresso Compass: sweet spot — extraction and strength are on target.', 0.00, 0.65),
	('Transparent', 'Flavor', 'Espresso Compass: sweet spot — extraction and strength are on target.', 0.10, 0.55),
	('Balanced', 'Flavor', 'Espresso Compass: sweet spot — extraction and strength are on target.', 0.00, 0.40),
	('Rich', 'Flavor', 'Espresso Compass: sweet spot — extraction and strength are on target.', 0.25, 0.35),
	('Luscious', 'Flavor', 'Espresso Compass: sweet spot — extraction and strength are on target.', 0.30, 0.30),
	('Substantial', 'Flavor', 'Espresso Compass: sweet spot — extraction and strength are on target.', -0.20, 0.30),
	('Ripe', 'Flavor', 'Espresso Compass: sweet spot — extraction and strength are on target.', -0.10, 0.10),
	('Nuanced', 'Flavor', 'Espresso Compass: sweet spot — extraction and strength are on target.', 0.50, 0.10),
	('Tasty', 'Flavor', 'Espresso Compass: sweet spot — extraction and strength are on target.', 0.10, 0.00),
	('Fluffy', 'Flavor', 'Espresso Compass: sweet spot — extraction and strength are on target.', 0.55, 0.00),
	('Light', 'Flavor', 'Espresso Compass: sweet spot — extraction and strength are on target.', 0.20, -0.20),
	('Slender', 'Flavor', 'Espresso Compass: over-extracted and weak — decrease yield and/or extract less (grind coarser or cut the shot shorter).', 0.60, -0.10),
	('Delicate', 'Flavor', 'Espresso Compass: over-extracted and weak — decrease yield and/or extract less (grind coarser or cut the shot shorter).', 0.65, -0.20),
	('Empty', 'Flavor', 'Espresso Compass: over-extracted and weak — decrease yield and/or extract less (grind coarser or cut the shot shorter).', 0.80, -0.35),
	('Powdery', 'Flavor', 'Espresso Compass: over-extracted and weak — decrease yield and/or extract less (grind coarser or cut the shot shorter).', 0.55, -0.55)
ON CONFLICT ("name") DO UPDATE SET
	"category" = excluded."category",
	"hint" = excluded."hint",
	"extraction_axis" = excluded."extraction_axis",
	"strength_axis" = excluded."strength_axis";

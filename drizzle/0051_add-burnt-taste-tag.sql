INSERT INTO "taste_tags" (
	"name", "category", "hint", "extraction_axis", "strength_axis"
)
VALUES (
	'Burnt',
	'Defect',
	'Flavor wheel: Roasted → Burnt. Ashy, acrid, smoky, or charred flavors.',
	NULL,
	NULL
)
ON CONFLICT ("name") DO UPDATE SET
	"category" = excluded."category",
	"hint" = excluded."hint",
	"extraction_axis" = excluded."extraction_axis",
	"strength_axis" = excluded."strength_axis";

ALTER TABLE "taste_tags" RENAME COLUMN "hint" TO "llm_instruction";--> statement-breakpoint
UPDATE "taste_tags" AS tag
SET "llm_instruction" = defaults."llm_instruction"
FROM (
	VALUES
		('Fruity', 'Use for a general ripe-fruit aroma when no more specific fruit family fits. Treat it as somewhat under-extracted and medium in strength when suggesting dial-in changes.'),
		('Berry', 'Use for strawberry, raspberry, blueberry, or blackberry-like aromas. Treat it as somewhat under-extracted and medium in strength when suggesting dial-in changes.'),
		('Dried fruit', 'Use for raisin, prune, date, or dried-berry aromas. Treat it as slightly under-extracted and moderately strong when suggesting dial-in changes.'),
		('Citrus', 'Use for lemon, lime, orange, grapefruit, or citrus-peel aromas. Treat it as slightly under-extracted and moderately light when suggesting dial-in changes.'),
		('Stone fruit', 'Use for peach, apricot, plum, nectarine, or cherry-like aromas. Treat it as somewhat under-extracted and medium in strength when suggesting dial-in changes.'),
		('Tropical fruit', 'Use for pineapple, mango, papaya, passion fruit, or coconut-like aromas. Treat it as somewhat under-extracted and slightly strong when suggesting dial-in changes.'),
		('Floral', 'Use for jasmine, rose, chamomile, or tea-like aromas. Treat it as under-extracted and light when suggesting dial-in changes.'),
		('Chocolate', 'Use for milk chocolate, dark chocolate, or cocoa-like aromas. Treat it as slightly over-extracted and strong when suggesting dial-in changes.'),
		('Nutty', 'Use for almond, hazelnut, peanut, or walnut-like aromas. Treat it as balanced in extraction and moderately strong when suggesting dial-in changes.'),
		('Caramel', 'Use for caramelized, honey, molasses, or maple-like sweet aromatics. Treat it as slightly over-extracted and moderately strong when suggesting dial-in changes.'),
		('Vanilla', 'Use for vanilla, marshmallow, or custard-like sweet aromatics. Treat it as balanced in extraction and strength when suggesting dial-in changes.'),
		('Spicy', 'Use for cinnamon, clove, nutmeg, anise, or pepper-like aromas. Treat it as over-extracted and moderately strong when suggesting dial-in changes.'),
		('Roasted', 'Use for toasted, coffee-like, smoky, or tobacco-like aromas. Treat it as distinctly over-extracted and strong when suggesting dial-in changes.'),
		('Cereal', 'Use for grain, malt, or fresh-bread aromas. Treat it as slightly over-extracted and slightly light when suggesting dial-in changes.'),
		('Green / vegetative', 'Use for fresh, herbal, peapod, hay, or unripe-plant aromas. Treat it as under-extracted and moderately light when suggesting dial-in changes.'),
		('Earthy', 'Use for soil, damp wood, or dusty aromas. Treat it as over-extracted and strong when suggesting dial-in changes.'),
		('Fermented', 'Use for winey, overripe, or alcohol-like aromas, separate from acidity intensity. Treat it as near-balanced in extraction and strong when suggesting dial-in changes.'),
		('Woody', 'Use for dry wood, bark, cedar, or pencil-shaving aromas. Treat it as over-extracted and slightly strong when suggesting dial-in changes.')
) AS defaults("name", "llm_instruction")
WHERE tag."name" = defaults."name";

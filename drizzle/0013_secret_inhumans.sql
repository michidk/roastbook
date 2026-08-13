ALTER TABLE "brewing_methods" ADD COLUMN "description" text;--> statement-breakpoint
UPDATE "brewing_methods" SET "description" = CASE "name"
	WHEN 'Espresso' THEN 'Concentrated coffee brewed under pressure.'
	WHEN 'Pour over' THEN 'Filter coffee brewed by pouring water over the grounds.'
	WHEN 'AeroPress' THEN 'Immersion brewing finished with gentle manual pressure.'
	WHEN 'French press' THEN 'Full-immersion coffee separated with a mesh plunger.'
	WHEN 'Moka pot' THEN 'Stovetop coffee brewed as steam pressure pushes water upward.'
	WHEN 'Cold brew' THEN 'Coffee extracted slowly with cool water.'
	WHEN 'Other' THEN 'A flexible method for custom brewing workflows.'
	ELSE "description"
END;

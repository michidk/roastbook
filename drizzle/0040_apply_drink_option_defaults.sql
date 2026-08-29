INSERT INTO "drink_types" ("name") VALUES
	('Espresso'),
	('Doppio'),
	('Ristretto'),
	('Lungo'),
	('Americano'),
	('Latte'),
	('Cappuccino'),
	('Flat White'),
	('Cortado'),
	('Macchiato'),
	('Mocha'),
	('Pour Over'),
	('Filter'),
	('Cold Brew'),
	('Iced Coffee'),
	('Other')
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
INSERT INTO "drink_option_groups" ("name") VALUES ('Milk')
ON CONFLICT ("name") DO NOTHING;--> statement-breakpoint
INSERT INTO "drink_option_values" ("group_id", "name")
SELECT "id", "milk_name"
FROM "drink_option_groups"
CROSS JOIN (VALUES
	('Whole milk'),
	('Skim milk'),
	('Oat milk'),
	('Soy milk'),
	('Almond milk'),
	('Coconut milk'),
	('Lactose-free milk')
) AS "defaults"("milk_name")
WHERE "drink_option_groups"."name" = 'Milk'
ON CONFLICT ("group_id", "name") DO NOTHING;--> statement-breakpoint
INSERT INTO "drink_type_option_groups" ("drink_type_id", "option_group_id")
SELECT "drink_types"."id", "drink_option_groups"."id"
FROM "drink_types"
CROSS JOIN "drink_option_groups"
WHERE "drink_types"."name" IN ('Latte', 'Cappuccino', 'Flat White', 'Cortado', 'Macchiato', 'Mocha')
	AND "drink_option_groups"."name" = 'Milk'
ON CONFLICT ("drink_type_id", "option_group_id") DO NOTHING;

CREATE TABLE "brewing_method_drink_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"brewing_method_id" integer NOT NULL,
	"drink_type_id" integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE "brewing_method_drink_types" ADD CONSTRAINT "brewing_method_drink_types_brewing_method_id_brewing_methods_id_fk" FOREIGN KEY ("brewing_method_id") REFERENCES "public"."brewing_methods"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brewing_method_drink_types" ADD CONSTRAINT "brewing_method_drink_types_drink_type_id_drink_types_id_fk" FOREIGN KEY ("drink_type_id") REFERENCES "public"."drink_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "brewing_method_drink_types_method_type_idx" ON "brewing_method_drink_types" USING btree ("brewing_method_id","drink_type_id");--> statement-breakpoint
CREATE INDEX "brewing_method_drink_types_drink_type_id_idx" ON "brewing_method_drink_types" USING btree ("drink_type_id");--> statement-breakpoint
INSERT INTO "brewing_method_drink_types" ("brewing_method_id", "drink_type_id")
SELECT "brewing_methods"."id", "drink_types"."id"
FROM (VALUES
	('Espresso', 'Espresso'),
	('Espresso', 'Doppio'),
	('Espresso', 'Ristretto'),
	('Espresso', 'Lungo'),
	('Espresso', 'Americano'),
	('Espresso', 'Latte'),
	('Espresso', 'Cappuccino'),
	('Espresso', 'Flat White'),
	('Espresso', 'Cortado'),
	('Espresso', 'Macchiato'),
	('Espresso', 'Mocha'),
	('Espresso', 'Other'),
	('Pour over', 'Pour Over'),
	('Pour over', 'Filter'),
	('Pour over', 'Iced Coffee'),
	('Pour over', 'Other'),
	('AeroPress', 'Filter'),
	('AeroPress', 'Iced Coffee'),
	('AeroPress', 'Other'),
	('French press', 'Filter'),
	('French press', 'Iced Coffee'),
	('French press', 'Other'),
	('Moka pot', 'Espresso'),
	('Moka pot', 'Americano'),
	('Moka pot', 'Latte'),
	('Moka pot', 'Cappuccino'),
	('Moka pot', 'Flat White'),
	('Moka pot', 'Cortado'),
	('Moka pot', 'Macchiato'),
	('Moka pot', 'Mocha'),
	('Moka pot', 'Other'),
	('Cold brew', 'Cold Brew'),
	('Cold brew', 'Other')
) AS "defaults" ("method_name", "drink_type_name")
INNER JOIN "brewing_methods"
	ON "brewing_methods"."name" = "defaults"."method_name"
INNER JOIN "drink_types"
	ON "drink_types"."name" = "defaults"."drink_type_name"
ON CONFLICT ("brewing_method_id", "drink_type_id") DO NOTHING;

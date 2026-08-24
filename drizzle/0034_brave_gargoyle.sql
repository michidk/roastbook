CREATE TABLE "gear_set_accessory_gear" (
	"id" serial PRIMARY KEY NOT NULL,
	"gear_set_id" integer NOT NULL,
	"gear_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gear_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"machine_id" integer,
	"grinder_id" integer,
	"basket_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gear_set_accessory_gear" ADD CONSTRAINT "gear_set_accessory_gear_gear_set_id_gear_sets_id_fk" FOREIGN KEY ("gear_set_id") REFERENCES "public"."gear_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_set_accessory_gear" ADD CONSTRAINT "gear_set_accessory_gear_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_sets" ADD CONSTRAINT "gear_sets_machine_id_gear_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."gear"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_sets" ADD CONSTRAINT "gear_sets_grinder_id_gear_id_fk" FOREIGN KEY ("grinder_id") REFERENCES "public"."gear"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_sets" ADD CONSTRAINT "gear_sets_basket_id_gear_id_fk" FOREIGN KEY ("basket_id") REFERENCES "public"."gear"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "gear_set_accessory_gear_set_gear_idx" ON "gear_set_accessory_gear" USING btree ("gear_set_id","gear_id");--> statement-breakpoint
CREATE INDEX "gear_set_accessory_gear_gear_id_idx" ON "gear_set_accessory_gear" USING btree ("gear_id");--> statement-breakpoint
CREATE INDEX "gear_sets_created_at_idx" ON "gear_sets" USING btree ("created_at");
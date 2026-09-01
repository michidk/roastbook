CREATE TABLE "brewer_details" (
	"gear_id" integer PRIMARY KEY NOT NULL,
	"mechanism" text,
	"capacity_ml" numeric(7, 2),
	"filter_format" text,
	"flow_control" text,
	CONSTRAINT "brewer_details_mechanism_check" CHECK ("brewer_details"."mechanism" in ('percolation', 'immersion', 'hybrid', 'press', 'vacuum', 'other')),
	CONSTRAINT "brewer_details_flow_control_check" CHECK ("brewer_details"."flow_control" in ('fixed', 'manual_valve', 'programmable')),
	CONSTRAINT "brewer_details_capacity_check" CHECK ("brewer_details"."capacity_ml" is null or "brewer_details"."capacity_ml" > 0)
);
--> statement-breakpoint
CREATE TABLE "espresso_machine_details" (
	"gear_id" integer PRIMARY KEY NOT NULL,
	"portafilter_diameter_mm" numeric(5, 2),
	"heating_architecture" text,
	"temperature_control" text,
	"pressure_control" text,
	"flow_control" text,
	"preinfusion_control" text,
	"shot_stop_modes" text[],
	"steam_system" text,
	"simultaneous_brew_and_steam" boolean,
	"group_count" integer,
	"pump_type" text,
	"water_source_modes" text[],
	"brew_pressure_minimum_bar" numeric(4, 2),
	"brew_pressure_maximum_bar" numeric(4, 2),
	"brew_temperature_minimum_celsius" numeric(4, 1),
	"brew_temperature_maximum_celsius" numeric(4, 1),
	CONSTRAINT "espresso_machine_details_heating_architecture_check" CHECK ("espresso_machine_details"."heating_architecture" in ('single_boiler', 'heat_exchanger', 'dual_boiler', 'multi_boiler', 'single_thermoblock', 'dual_thermoblock', 'hybrid', 'manual', 'other')),
	CONSTRAINT "espresso_machine_details_temperature_control_check" CHECK ("espresso_machine_details"."temperature_control" in ('none', 'fixed', 'adjustable', 'programmable')),
	CONSTRAINT "espresso_machine_details_pressure_control_check" CHECK ("espresso_machine_details"."pressure_control" in ('fixed', 'adjustable_opv', 'manual', 'programmable')),
	CONSTRAINT "espresso_machine_details_flow_control_check" CHECK ("espresso_machine_details"."flow_control" in ('none', 'manual', 'programmable')),
	CONSTRAINT "espresso_machine_details_preinfusion_control_check" CHECK ("espresso_machine_details"."preinfusion_control" in ('none', 'supported', 'fixed', 'adjustable', 'programmable')),
	CONSTRAINT "espresso_machine_details_shot_stop_modes_check" CHECK ("espresso_machine_details"."shot_stop_modes" <@ ARRAY['manual', 'weight', 'time', 'volume']::text[]),
	CONSTRAINT "espresso_machine_details_steam_system_check" CHECK ("espresso_machine_details"."steam_system" in ('none', 'shared_heater', 'dedicated_heater')),
	CONSTRAINT "espresso_machine_details_pump_type_check" CHECK ("espresso_machine_details"."pump_type" in ('vibration', 'rotary', 'gear', 'peristaltic', 'manual', 'other')),
	CONSTRAINT "espresso_machine_details_water_source_modes_check" CHECK ("espresso_machine_details"."water_source_modes" <@ ARRAY['reservoir', 'plumbed']::text[]),
	CONSTRAINT "espresso_machine_details_measurements_check" CHECK (("espresso_machine_details"."portafilter_diameter_mm" is null or "espresso_machine_details"."portafilter_diameter_mm" > 0)
        and ("espresso_machine_details"."group_count" is null or "espresso_machine_details"."group_count" > 0)
        and ("espresso_machine_details"."brew_pressure_minimum_bar" is null or "espresso_machine_details"."brew_pressure_minimum_bar" >= 0)
        and ("espresso_machine_details"."brew_pressure_maximum_bar" is null or "espresso_machine_details"."brew_pressure_maximum_bar" >= 0)
        and ("espresso_machine_details"."brew_pressure_minimum_bar" is null or "espresso_machine_details"."brew_pressure_maximum_bar" is null or "espresso_machine_details"."brew_pressure_minimum_bar" <= "espresso_machine_details"."brew_pressure_maximum_bar")
        and ("espresso_machine_details"."brew_temperature_minimum_celsius" is null or "espresso_machine_details"."brew_temperature_maximum_celsius" is null or "espresso_machine_details"."brew_temperature_minimum_celsius" <= "espresso_machine_details"."brew_temperature_maximum_celsius"))
);
--> statement-breakpoint
CREATE TABLE "espresso_machine_setting_revisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"gear_id" integer NOT NULL,
	"kind" text NOT NULL,
	"brew_pressure_bar" numeric(4, 2),
	"preinfusion_enabled" boolean,
	"preinfusion_time_seconds" numeric(5, 2),
	"preinfusion_pressure_bar" numeric(4, 2),
	"flow_limit_ml_per_second" numeric(4, 2),
	"brew_temperature_offset_celsius" numeric(4, 1),
	"programmed_volume_ml" numeric(6, 2),
	"default_stop_mode" text,
	"steam_temperature_celsius" numeric(4, 1),
	"steam_pressure_bar" numeric(4, 2),
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"superseded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "espresso_machine_setting_revisions_kind_check" CHECK ("espresso_machine_setting_revisions"."kind" in ('factory', 'owner')),
	CONSTRAINT "espresso_machine_setting_revisions_stop_mode_check" CHECK ("espresso_machine_setting_revisions"."default_stop_mode" in ('manual', 'weight', 'time', 'volume')),
	CONSTRAINT "espresso_machine_setting_revisions_measurements_check" CHECK (("espresso_machine_setting_revisions"."brew_pressure_bar" is null or "espresso_machine_setting_revisions"."brew_pressure_bar" >= 0)
        and ("espresso_machine_setting_revisions"."preinfusion_time_seconds" is null or "espresso_machine_setting_revisions"."preinfusion_time_seconds" >= 0)
        and ("espresso_machine_setting_revisions"."preinfusion_pressure_bar" is null or "espresso_machine_setting_revisions"."preinfusion_pressure_bar" >= 0)
        and ("espresso_machine_setting_revisions"."flow_limit_ml_per_second" is null or "espresso_machine_setting_revisions"."flow_limit_ml_per_second" >= 0)
        and ("espresso_machine_setting_revisions"."programmed_volume_ml" is null or "espresso_machine_setting_revisions"."programmed_volume_ml" >= 0)
        and ("espresso_machine_setting_revisions"."steam_temperature_celsius" is null or "espresso_machine_setting_revisions"."steam_temperature_celsius" >= 0)
        and ("espresso_machine_setting_revisions"."steam_pressure_bar" is null or "espresso_machine_setting_revisions"."steam_pressure_bar" >= 0))
);
--> statement-breakpoint
CREATE TABLE "gear_property_evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"gear_id" integer NOT NULL,
	"property_key" text NOT NULL,
	"value_json" jsonb NOT NULL,
	"source_url" text NOT NULL,
	"source_title" text,
	"source_kind" text NOT NULL,
	"raw_value" text,
	"raw_unit" text,
	"retrieved_at" timestamp DEFAULT now() NOT NULL,
	"accepted_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gear_property_evidence_source_kind_check" CHECK ("gear_property_evidence"."source_kind" in ('manual', 'manufacturer', 'specialist', 'retailer', 'community'))
);
--> statement-breakpoint
CREATE TABLE "grinder_details" (
	"gear_id" integer PRIMARY KEY NOT NULL,
	"burr_mechanism" text,
	"burr_diameter_mm" numeric(5, 2),
	"adjustment_type" text,
	"brew_range" text[],
	"bean_feed" text,
	"dose_control_modes" text[],
	"burr_material" text,
	CONSTRAINT "grinder_details_burr_mechanism_check" CHECK ("grinder_details"."burr_mechanism" in ('conical', 'flat', 'ghost', 'roller', 'blade', 'other')),
	CONSTRAINT "grinder_details_adjustment_type_check" CHECK ("grinder_details"."adjustment_type" in ('fixed', 'stepped', 'stepless')),
	CONSTRAINT "grinder_details_brew_range_check" CHECK ("grinder_details"."brew_range" <@ ARRAY['espresso', 'filter']::text[]),
	CONSTRAINT "grinder_details_bean_feed_check" CHECK ("grinder_details"."bean_feed" in ('single_dose', 'hopper', 'both')),
	CONSTRAINT "grinder_details_dose_control_modes_check" CHECK ("grinder_details"."dose_control_modes" <@ ARRAY['manual', 'time', 'weight']::text[]),
	CONSTRAINT "grinder_details_burr_material_check" CHECK ("grinder_details"."burr_material" in ('steel', 'ceramic', 'other')),
	CONSTRAINT "grinder_details_burr_diameter_check" CHECK ("grinder_details"."burr_diameter_mm" is null or "grinder_details"."burr_diameter_mm" > 0)
);
--> statement-breakpoint
CREATE TABLE "kettle_details" (
	"gear_id" integer PRIMARY KEY NOT NULL,
	"capacity_ml" numeric(7, 2),
	"spout_type" text,
	"temperature_control" text,
	"minimum_temperature_celsius" numeric(4, 1),
	"maximum_temperature_celsius" numeric(4, 1),
	"supports_temperature_hold" boolean,
	CONSTRAINT "kettle_details_spout_type_check" CHECK ("kettle_details"."spout_type" in ('gooseneck', 'standard', 'other')),
	CONSTRAINT "kettle_details_temperature_control_check" CHECK ("kettle_details"."temperature_control" in ('none', 'fixed', 'adjustable')),
	CONSTRAINT "kettle_details_measurements_check" CHECK (("kettle_details"."capacity_ml" is null or "kettle_details"."capacity_ml" > 0)
        and ("kettle_details"."minimum_temperature_celsius" is null or "kettle_details"."minimum_temperature_celsius" >= 0)
        and ("kettle_details"."maximum_temperature_celsius" is null or "kettle_details"."maximum_temperature_celsius" >= 0)
        and ("kettle_details"."minimum_temperature_celsius" is null or "kettle_details"."maximum_temperature_celsius" is null or "kettle_details"."minimum_temperature_celsius" <= "kettle_details"."maximum_temperature_celsius"))
);
--> statement-breakpoint
CREATE TABLE "scale_details" (
	"gear_id" integer PRIMARY KEY NOT NULL,
	"resolution_grams" numeric(7, 3),
	"capacity_grams" numeric(9, 2),
	"has_timer" boolean,
	"supports_auto_tare" boolean,
	"supports_auto_timer" boolean,
	"has_flow_rate_display" boolean,
	CONSTRAINT "scale_details_measurements_check" CHECK (("scale_details"."resolution_grams" is null or "scale_details"."resolution_grams" > 0)
        and ("scale_details"."capacity_grams" is null or "scale_details"."capacity_grams" > 0))
);
--> statement-breakpoint
CREATE TABLE "tamper_details" (
	"gear_id" integer PRIMARY KEY NOT NULL,
	"diameter_mm" numeric(5, 2),
	"force_control" text,
	"base_shape" text,
	"self_leveling" boolean,
	CONSTRAINT "tamper_details_force_control_check" CHECK ("tamper_details"."force_control" in ('none', 'fixed', 'adjustable')),
	CONSTRAINT "tamper_details_base_shape_check" CHECK ("tamper_details"."base_shape" in ('flat', 'convex', 'rippled', 'other')),
	CONSTRAINT "tamper_details_diameter_check" CHECK ("tamper_details"."diameter_mm" is null or "tamper_details"."diameter_mm" > 0)
);
--> statement-breakpoint
CREATE TABLE "wdt_details" (
	"gear_id" integer PRIMARY KEY NOT NULL,
	"needle_diameter_mm" numeric(5, 3),
	"needle_count" integer,
	"depth_control" text,
	CONSTRAINT "wdt_details_depth_control_check" CHECK ("wdt_details"."depth_control" in ('none', 'fixed', 'adjustable')),
	CONSTRAINT "wdt_details_measurements_check" CHECK (("wdt_details"."needle_diameter_mm" is null or "wdt_details"."needle_diameter_mm" > 0)
        and ("wdt_details"."needle_count" is null or "wdt_details"."needle_count" > 0))
);
--> statement-breakpoint
INSERT INTO "espresso_machine_details" (
	"gear_id",
	"preinfusion_control",
	"shot_stop_modes"
)
SELECT
	"gear_id",
	CASE
		WHEN "supports_preinfusion" = false THEN 'none'
		WHEN "supports_preinfusion" = true THEN 'supported'
		ELSE NULL
	END,
	CASE
		WHEN "auto_stop_mode" IS NULL THEN NULL
		ELSE ARRAY["auto_stop_mode"]::text[]
	END
FROM "machine_settings";
--> statement-breakpoint
INSERT INTO "espresso_machine_setting_revisions" (
	"gear_id",
	"kind",
	"brew_pressure_bar",
	"preinfusion_enabled",
	"preinfusion_time_seconds",
	"preinfusion_pressure_bar",
	"flow_limit_ml_per_second",
	"brew_temperature_offset_celsius",
	"programmed_volume_ml",
	"default_stop_mode",
	"steam_temperature_celsius",
	"steam_pressure_bar"
)
SELECT
	"gear_id",
	'owner',
	"brew_pressure_opv_bar",
	"default_preinfusion_enabled",
	"default_preinfusion_time_seconds",
	"default_preinfusion_pressure_bar",
	"default_flow_limit_ml_per_second",
	"temperature_offset_celsius",
	"volumetric_shot_volume_ml",
	"auto_stop_mode",
	"steam_temperature_celsius",
	"steam_pressure_bar"
FROM "machine_settings"
WHERE "brew_pressure_opv_bar" IS NOT NULL
	OR "default_preinfusion_enabled" IS NOT NULL
	OR "default_preinfusion_time_seconds" IS NOT NULL
	OR "default_preinfusion_pressure_bar" IS NOT NULL
	OR "default_flow_limit_ml_per_second" IS NOT NULL
	OR "temperature_offset_celsius" IS NOT NULL
	OR "volumetric_shot_volume_ml" IS NOT NULL
	OR "auto_stop_mode" IS NOT NULL
	OR "steam_temperature_celsius" IS NOT NULL
	OR "steam_pressure_bar" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "machine_settings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "machine_settings" CASCADE;--> statement-breakpoint
ALTER TABLE "basket_details" DROP CONSTRAINT "basket_details_dose_nonnegative";--> statement-breakpoint
ALTER TABLE "basket_details" ADD COLUMN "diameter_mm" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "basket_details" ADD COLUMN "is_pressurized" boolean;--> statement-breakpoint
ALTER TABLE "basket_details" ADD COLUMN "dose_minimum_grams" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "basket_details" ADD COLUMN "dose_maximum_grams" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "basket_details" ADD COLUMN "kind" text;--> statement-breakpoint
ALTER TABLE "brews" ADD COLUMN "machine_setting_revision_id" integer;--> statement-breakpoint
ALTER TABLE "brewer_details" ADD CONSTRAINT "brewer_details_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "espresso_machine_details" ADD CONSTRAINT "espresso_machine_details_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "espresso_machine_setting_revisions" ADD CONSTRAINT "espresso_machine_setting_revisions_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gear_property_evidence" ADD CONSTRAINT "gear_property_evidence_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grinder_details" ADD CONSTRAINT "grinder_details_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kettle_details" ADD CONSTRAINT "kettle_details_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scale_details" ADD CONSTRAINT "scale_details_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tamper_details" ADD CONSTRAINT "tamper_details_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wdt_details" ADD CONSTRAINT "wdt_details_gear_id_gear_id_fk" FOREIGN KEY ("gear_id") REFERENCES "public"."gear"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "espresso_machine_setting_revisions_current_kind_idx" ON "espresso_machine_setting_revisions" USING btree ("gear_id","kind") WHERE "espresso_machine_setting_revisions"."superseded_at" is null;--> statement-breakpoint
CREATE INDEX "espresso_machine_setting_revisions_gear_id_idx" ON "espresso_machine_setting_revisions" USING btree ("gear_id","effective_from");--> statement-breakpoint
CREATE INDEX "gear_property_evidence_gear_property_idx" ON "gear_property_evidence" USING btree ("gear_id","property_key");--> statement-breakpoint
ALTER TABLE "brews" ADD CONSTRAINT "brews_machine_setting_revision_id_espresso_machine_setting_revisions_id_fk" FOREIGN KEY ("machine_setting_revision_id") REFERENCES "public"."espresso_machine_setting_revisions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "brews_machine_setting_revision_id_idx" ON "brews" USING btree ("machine_setting_revision_id");--> statement-breakpoint
ALTER TABLE "basket_details" ADD CONSTRAINT "basket_details_kind_check" CHECK ("basket_details"."kind" in ('single', 'double', 'triple', 'other'));--> statement-breakpoint
ALTER TABLE "basket_details" ADD CONSTRAINT "basket_details_measurements_check" CHECK (("basket_details"."nominal_dose_grams" is null or "basket_details"."nominal_dose_grams" >= 0)
        and ("basket_details"."diameter_mm" is null or "basket_details"."diameter_mm" > 0)
        and ("basket_details"."dose_minimum_grams" is null or "basket_details"."dose_minimum_grams" > 0)
        and ("basket_details"."dose_maximum_grams" is null or "basket_details"."dose_maximum_grams" > 0)
        and ("basket_details"."dose_minimum_grams" is null or "basket_details"."dose_maximum_grams" is null or "basket_details"."dose_minimum_grams" <= "basket_details"."dose_maximum_grams"));--> statement-breakpoint
CREATE FUNCTION "check_gear_subtype_compatibility"() RETURNS trigger AS $$
DECLARE
	target_gear_id integer;
	target_type gear_type;
BEGIN
	target_gear_id := COALESCE(
		(to_jsonb(NEW)->>'gear_id')::integer,
		(to_jsonb(NEW)->>'id')::integer
	);
	SELECT "type" INTO target_type FROM "gear" WHERE "id" = target_gear_id;
	IF target_type IS NULL THEN
		RETURN NEW;
	END IF;

	IF (
		(target_type NOT IN ('espresso_machine', 'espresso_machine_with_grinder') AND EXISTS (SELECT 1 FROM "espresso_machine_details" WHERE "gear_id" = target_gear_id))
		OR (target_type NOT IN ('espresso_machine', 'espresso_machine_with_grinder') AND EXISTS (SELECT 1 FROM "espresso_machine_setting_revisions" WHERE "gear_id" = target_gear_id AND "superseded_at" IS NULL))
		OR (target_type NOT IN ('grinder', 'espresso_machine_with_grinder') AND EXISTS (SELECT 1 FROM "grinder_details" WHERE "gear_id" = target_gear_id))
		OR (target_type <> 'brewer' AND EXISTS (SELECT 1 FROM "brewer_details" WHERE "gear_id" = target_gear_id))
		OR (target_type <> 'kettle' AND EXISTS (SELECT 1 FROM "kettle_details" WHERE "gear_id" = target_gear_id))
		OR (target_type <> 'scale' AND EXISTS (SELECT 1 FROM "scale_details" WHERE "gear_id" = target_gear_id))
		OR (target_type <> 'tamper' AND EXISTS (SELECT 1 FROM "tamper_details" WHERE "gear_id" = target_gear_id))
		OR (target_type <> 'wdt' AND EXISTS (SELECT 1 FROM "wdt_details" WHERE "gear_id" = target_gear_id))
		OR (target_type <> 'basket' AND EXISTS (SELECT 1 FROM "basket_details" WHERE "gear_id" = target_gear_id))
	) THEN
		RAISE EXCEPTION 'Gear subtype properties are incompatible with gear type'
			USING ERRCODE = '23514', CONSTRAINT = 'gear_subtype_compatibility_check';
	END IF;

	RETURN NEW;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "gear_subtype_compatibility_gear_trigger"
AFTER INSERT OR UPDATE ON "gear"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_gear_subtype_compatibility"();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "gear_subtype_compatibility_machine_trigger"
AFTER INSERT OR UPDATE ON "espresso_machine_details"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_gear_subtype_compatibility"();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "gear_subtype_compatibility_machine_settings_trigger"
AFTER INSERT OR UPDATE ON "espresso_machine_setting_revisions"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_gear_subtype_compatibility"();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "gear_subtype_compatibility_grinder_trigger"
AFTER INSERT OR UPDATE ON "grinder_details"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_gear_subtype_compatibility"();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "gear_subtype_compatibility_brewer_trigger"
AFTER INSERT OR UPDATE ON "brewer_details"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_gear_subtype_compatibility"();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "gear_subtype_compatibility_kettle_trigger"
AFTER INSERT OR UPDATE ON "kettle_details"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_gear_subtype_compatibility"();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "gear_subtype_compatibility_scale_trigger"
AFTER INSERT OR UPDATE ON "scale_details"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_gear_subtype_compatibility"();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "gear_subtype_compatibility_tamper_trigger"
AFTER INSERT OR UPDATE ON "tamper_details"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_gear_subtype_compatibility"();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "gear_subtype_compatibility_wdt_trigger"
AFTER INSERT OR UPDATE ON "wdt_details"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_gear_subtype_compatibility"();--> statement-breakpoint
CREATE CONSTRAINT TRIGGER "gear_subtype_compatibility_basket_trigger"
AFTER INSERT OR UPDATE ON "basket_details"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION "check_gear_subtype_compatibility"();

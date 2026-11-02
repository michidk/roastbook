ALTER TABLE "beans" ADD COLUMN "altitude_min_meters" integer;--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "altitude_max_meters" integer;--> statement-breakpoint
ALTER TABLE "beans" ADD CONSTRAINT "beans_altitude_range_check" CHECK (("beans"."altitude_min_meters" is null or "beans"."altitude_min_meters" between 0 and 9000)
        and ("beans"."altitude_max_meters" is null or "beans"."altitude_max_meters" between 0 and 9000)
        and ("beans"."altitude_min_meters" is null or "beans"."altitude_max_meters" is null or "beans"."altitude_min_meters" <= "beans"."altitude_max_meters"));
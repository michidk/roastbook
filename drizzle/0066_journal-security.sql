DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'roastbook_journal') THEN
    CREATE ROLE roastbook_journal NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
  IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'roastbook_journal' AND (rolsuper OR rolbypassrls OR rolcanlogin)) THEN
    RAISE EXCEPTION 'roastbook_journal must be a restricted NOLOGIN role';
  END IF;
  EXECUTE format('GRANT roastbook_journal TO %I', current_user);
END $$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO roastbook_journal;
--> statement-breakpoint
INSERT INTO auth_users(id,name,email,email_verified,role) VALUES ('local','Default user','default@roastbook.invalid',false,'admin') ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO instance_identity(id) VALUES(1) ON CONFLICT DO NOTHING;
--> statement-breakpoint
ALTER TABLE "ai_request_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_request_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "ai_request_logs" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "ai_request_logs" TO roastbook_journal;

--> statement-breakpoint
ALTER TABLE "ai_usage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ai_usage" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "ai_usage" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "ai_usage" TO roastbook_journal;

--> statement-breakpoint
ALTER TABLE "basket_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "basket_details" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "basket_details" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "basket_details" TO roastbook_journal;
--> statement-breakpoint
CREATE FUNCTION "check_basket_details_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."gear_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."gear_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "basket_details" FOR EACH ROW EXECUTE FUNCTION "check_basket_details_owner"();
--> statement-breakpoint
ALTER TABLE "bean_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bean_images" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "bean_images" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "bean_images" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_bean_images_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."bean_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "beans" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."bean_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."bean_purchase_id" IS NOT NULL AND NEW."bean_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "bean_purchases" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."bean_purchase_id" AND parent."bean_id" = NEW."bean_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "bean_images" FOR EACH ROW EXECUTE FUNCTION "check_bean_images_owner"();
--> statement-breakpoint
ALTER TABLE "bean_purchases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bean_purchases" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "bean_purchases" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "bean_purchases" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_bean_purchases_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."bean_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "beans" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."bean_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "bean_purchases" FOR EACH ROW EXECUTE FUNCTION "check_bean_purchases_owner"();
--> statement-breakpoint
ALTER TABLE "beans" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "beans" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "beans" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "beans" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_beans_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."roaster_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "roasters" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."roaster_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "beans" FOR EACH ROW EXECUTE FUNCTION "check_beans_owner"();
--> statement-breakpoint
ALTER TABLE "brewer_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brewer_details" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "brewer_details" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "brewer_details" TO roastbook_journal;
--> statement-breakpoint
CREATE FUNCTION "check_brewer_details_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."gear_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."gear_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "brewer_details" FOR EACH ROW EXECUTE FUNCTION "check_brewer_details_owner"();
--> statement-breakpoint
ALTER TABLE "brewing_method_drink_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brewing_method_drink_types" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "brewing_method_drink_types" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "brewing_method_drink_types" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_brewing_method_drink_types_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."brewing_method_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "brewing_methods" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."brewing_method_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."drink_type_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "drink_types" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."drink_type_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "brewing_method_drink_types" FOR EACH ROW EXECUTE FUNCTION "check_brewing_method_drink_types_owner"();
--> statement-breakpoint
ALTER TABLE "brewing_methods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brewing_methods" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "brewing_methods" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "brewing_methods" TO roastbook_journal;

--> statement-breakpoint
ALTER TABLE "cafe_visit_drink_options" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cafe_visit_drink_options" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "cafe_visit_drink_options" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "cafe_visit_drink_options" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_cafe_visit_drink_options_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."cafe_visit_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "cafe_visits" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."cafe_visit_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."option_value_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "drink_option_values" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."option_value_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "cafe_visit_drink_options" FOR EACH ROW EXECUTE FUNCTION "check_cafe_visit_drink_options_owner"();
--> statement-breakpoint
ALTER TABLE "cafe_visit_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cafe_visit_images" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "cafe_visit_images" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "cafe_visit_images" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_cafe_visit_images_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."cafe_visit_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "cafe_visits" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."cafe_visit_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "cafe_visit_images" FOR EACH ROW EXECUTE FUNCTION "check_cafe_visit_images_owner"();
--> statement-breakpoint
ALTER TABLE "cafe_visit_taste_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cafe_visit_taste_tags" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "cafe_visit_taste_tags" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "cafe_visit_taste_tags" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_cafe_visit_taste_tags_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."cafe_visit_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "cafe_visits" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."cafe_visit_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."taste_tag_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "taste_tags" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."taste_tag_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "cafe_visit_taste_tags" FOR EACH ROW EXECUTE FUNCTION "check_cafe_visit_taste_tags_owner"();
--> statement-breakpoint
ALTER TABLE "cafe_visits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cafe_visits" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "cafe_visits" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "cafe_visits" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_cafe_visits_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."coffee_shop_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "coffee_shops" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."coffee_shop_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."bean_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "beans" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."bean_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."drink_type_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "drink_types" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."drink_type_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "cafe_visits" FOR EACH ROW EXECUTE FUNCTION "check_cafe_visits_owner"();
--> statement-breakpoint
ALTER TABLE "client_operations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_operations" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "client_operations" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "client_operations" TO roastbook_journal;
--> statement-breakpoint
CREATE FUNCTION "check_client_operations_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."brew_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "brews" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."brew_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."recipe_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "recipes" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."recipe_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "client_operations" FOR EACH ROW EXECUTE FUNCTION "check_client_operations_owner"();
--> statement-breakpoint
ALTER TABLE "coffee_shop_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coffee_shop_images" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "coffee_shop_images" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "coffee_shop_images" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_coffee_shop_images_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."coffee_shop_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "coffee_shops" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."coffee_shop_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "coffee_shop_images" FOR EACH ROW EXECUTE FUNCTION "check_coffee_shop_images_owner"();
--> statement-breakpoint
ALTER TABLE "coffee_shops" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "coffee_shops" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "coffee_shops" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "coffee_shops" TO roastbook_journal;

--> statement-breakpoint
ALTER TABLE "drink_option_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "drink_option_groups" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "drink_option_groups" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "drink_option_groups" TO roastbook_journal;

--> statement-breakpoint
ALTER TABLE "drink_option_values" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "drink_option_values" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "drink_option_values" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "drink_option_values" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_drink_option_values_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."group_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "drink_option_groups" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."group_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "drink_option_values" FOR EACH ROW EXECUTE FUNCTION "check_drink_option_values_owner"();
--> statement-breakpoint
ALTER TABLE "drink_type_option_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "drink_type_option_groups" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "drink_type_option_groups" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "drink_type_option_groups" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_drink_type_option_groups_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."drink_type_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "drink_types" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."drink_type_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."option_group_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "drink_option_groups" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."option_group_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "drink_type_option_groups" FOR EACH ROW EXECUTE FUNCTION "check_drink_type_option_groups_owner"();
--> statement-breakpoint
ALTER TABLE "drink_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "drink_types" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "drink_types" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "drink_types" TO roastbook_journal;

--> statement-breakpoint
ALTER TABLE "espresso_machine_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "espresso_machine_details" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "espresso_machine_details" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "espresso_machine_details" TO roastbook_journal;
--> statement-breakpoint
CREATE FUNCTION "check_espresso_machine_details_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."gear_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."gear_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "espresso_machine_details" FOR EACH ROW EXECUTE FUNCTION "check_espresso_machine_details_owner"();
--> statement-breakpoint
ALTER TABLE "espresso_machine_setting_revisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "espresso_machine_setting_revisions" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "espresso_machine_setting_revisions" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "espresso_machine_setting_revisions" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_espresso_machine_setting_revisions_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."gear_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."gear_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "espresso_machine_setting_revisions" FOR EACH ROW EXECUTE FUNCTION "check_espresso_machine_setting_revisions_owner"();
--> statement-breakpoint
ALTER TABLE "gear" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gear" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "gear" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "gear" TO roastbook_journal;

--> statement-breakpoint
ALTER TABLE "gear_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gear_images" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "gear_images" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "gear_images" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_gear_images_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."gear_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."gear_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "gear_images" FOR EACH ROW EXECUTE FUNCTION "check_gear_images_owner"();
--> statement-breakpoint
ALTER TABLE "gear_property_evidence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gear_property_evidence" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "gear_property_evidence" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "gear_property_evidence" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_gear_property_evidence_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."gear_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."gear_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "gear_property_evidence" FOR EACH ROW EXECUTE FUNCTION "check_gear_property_evidence_owner"();
--> statement-breakpoint
ALTER TABLE "gear_set_accessory_gear" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gear_set_accessory_gear" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "gear_set_accessory_gear" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "gear_set_accessory_gear" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_gear_set_accessory_gear_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."gear_set_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear_sets" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."gear_set_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."gear_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."gear_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "gear_set_accessory_gear" FOR EACH ROW EXECUTE FUNCTION "check_gear_set_accessory_gear_owner"();
--> statement-breakpoint
ALTER TABLE "gear_sets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "gear_sets" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "gear_sets" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "gear_sets" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_gear_sets_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."machine_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."machine_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."grinder_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."grinder_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."basket_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."basket_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "gear_sets" FOR EACH ROW EXECUTE FUNCTION "check_gear_sets_owner"();
--> statement-breakpoint
ALTER TABLE "grinder_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "grinder_details" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "grinder_details" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "grinder_details" TO roastbook_journal;
--> statement-breakpoint
CREATE FUNCTION "check_grinder_details_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."gear_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."gear_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "grinder_details" FOR EACH ROW EXECUTE FUNCTION "check_grinder_details_owner"();
--> statement-breakpoint
ALTER TABLE "kettle_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "kettle_details" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "kettle_details" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "kettle_details" TO roastbook_journal;
--> statement-breakpoint
CREATE FUNCTION "check_kettle_details_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."gear_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."gear_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "kettle_details" FOR EACH ROW EXECUTE FUNCTION "check_kettle_details_owner"();
--> statement-breakpoint
ALTER TABLE "mcp_audit_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mcp_audit_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "mcp_audit_events" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "mcp_audit_events" TO roastbook_journal;

--> statement-breakpoint
ALTER TABLE "mcp_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mcp_settings" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "mcp_settings" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "mcp_settings" TO roastbook_journal;
--> statement-breakpoint
ALTER TABLE "media_cleanup_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "media_cleanup_jobs" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "media_cleanup_jobs" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "media_cleanup_jobs" TO roastbook_journal;

--> statement-breakpoint
ALTER TABLE "recipe_accessory_gear" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recipe_accessory_gear" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "recipe_accessory_gear" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "recipe_accessory_gear" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_recipe_accessory_gear_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."recipe_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "recipes" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."recipe_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."gear_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."gear_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "recipe_accessory_gear" FOR EACH ROW EXECUTE FUNCTION "check_recipe_accessory_gear_owner"();
--> statement-breakpoint
ALTER TABLE "recipe_drink_options" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recipe_drink_options" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "recipe_drink_options" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "recipe_drink_options" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_recipe_drink_options_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."recipe_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "recipes" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."recipe_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."option_value_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "drink_option_values" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."option_value_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "recipe_drink_options" FOR EACH ROW EXECUTE FUNCTION "check_recipe_drink_options_owner"();
--> statement-breakpoint
ALTER TABLE "recipes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recipes" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "recipes" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "recipes" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_recipes_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."drink_type_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "drink_types" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."drink_type_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."brewing_method_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "brewing_methods" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."brewing_method_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."bean_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "beans" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."bean_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."machine_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."machine_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."grinder_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."grinder_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."basket_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."basket_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "recipes" FOR EACH ROW EXECUTE FUNCTION "check_recipes_owner"();
--> statement-breakpoint
ALTER TABLE "replication_changes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "replication_changes" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "replication_changes" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "replication_changes" TO roastbook_journal;

--> statement-breakpoint
ALTER TABLE "roasters" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "roasters" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "roasters" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "roasters" TO roastbook_journal;

--> statement-breakpoint
ALTER TABLE "scale_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "scale_details" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "scale_details" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "scale_details" TO roastbook_journal;
--> statement-breakpoint
CREATE FUNCTION "check_scale_details_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."gear_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."gear_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "scale_details" FOR EACH ROW EXECUTE FUNCTION "check_scale_details_owner"();
--> statement-breakpoint
ALTER TABLE "settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "settings" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "settings" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "settings" TO roastbook_journal;
--> statement-breakpoint
ALTER TABLE "brew_accessory_gear" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brew_accessory_gear" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "brew_accessory_gear" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "brew_accessory_gear" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_brew_accessory_gear_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."brew_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "brews" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."brew_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."gear_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."gear_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "brew_accessory_gear" FOR EACH ROW EXECUTE FUNCTION "check_brew_accessory_gear_owner"();
--> statement-breakpoint
ALTER TABLE "brew_drink_options" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brew_drink_options" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "brew_drink_options" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "brew_drink_options" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_brew_drink_options_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."brew_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "brews" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."brew_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."option_value_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "drink_option_values" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."option_value_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "brew_drink_options" FOR EACH ROW EXECUTE FUNCTION "check_brew_drink_options_owner"();
--> statement-breakpoint
ALTER TABLE "brew_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brew_images" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "brew_images" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "brew_images" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_brew_images_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."brew_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "brews" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."brew_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "brew_images" FOR EACH ROW EXECUTE FUNCTION "check_brew_images_owner"();
--> statement-breakpoint
ALTER TABLE "brew_taste_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brew_taste_tags" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "brew_taste_tags" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "brew_taste_tags" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_brew_taste_tags_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."brew_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "brews" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."brew_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."taste_tag_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "taste_tags" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."taste_tag_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "brew_taste_tags" FOR EACH ROW EXECUTE FUNCTION "check_brew_taste_tags_owner"();
--> statement-breakpoint
ALTER TABLE "brews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brews" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "brews" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "brews" TO roastbook_journal;

--> statement-breakpoint
CREATE FUNCTION "check_brews_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."brewing_method_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "brewing_methods" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."brewing_method_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."bean_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "beans" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."bean_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."drink_type_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "drink_types" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."drink_type_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."machine_setting_revision_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "espresso_machine_setting_revisions" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."machine_setting_revision_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."machine_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."machine_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."grinder_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."grinder_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."basket_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."basket_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
IF NEW."bean_purchase_id" IS NOT NULL AND NEW."bean_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "bean_purchases" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."bean_purchase_id" AND parent."bean_id" = NEW."bean_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "brews" FOR EACH ROW EXECUTE FUNCTION "check_brews_owner"();
--> statement-breakpoint
ALTER TABLE "shottimer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "shottimer" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "shottimer" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "shottimer" TO roastbook_journal;
--> statement-breakpoint
ALTER TABLE "tamper_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tamper_details" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "tamper_details" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "tamper_details" TO roastbook_journal;
--> statement-breakpoint
CREATE FUNCTION "check_tamper_details_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."gear_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."gear_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "tamper_details" FOR EACH ROW EXECUTE FUNCTION "check_tamper_details_owner"();
--> statement-breakpoint
ALTER TABLE "taste_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "taste_tags" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "taste_tags" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "taste_tags" TO roastbook_journal;

--> statement-breakpoint
ALTER TABLE "wdt_details" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "wdt_details" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "wdt_details" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
GRANT SELECT, INSERT, UPDATE, DELETE ON "wdt_details" TO roastbook_journal;
--> statement-breakpoint
CREATE FUNCTION "check_wdt_details_owner"() RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$ BEGIN
IF current_user <> 'roastbook_journal' AND current_setting('roastbook.bootstrap', true) = 'true' THEN RETURN NEW; END IF;
IF NEW."gear_id" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "gear" parent WHERE parent.owner_id = NEW.owner_id AND parent."id" = NEW."gear_id") THEN RAISE EXCEPTION 'Related record is unavailable' USING ERRCODE = '23503'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER check_journal_owner BEFORE INSERT OR UPDATE ON "wdt_details" FOR EACH ROW EXECUTE FUNCTION "check_wdt_details_owner"();

--> statement-breakpoint
DO $$ DECLARE item record; sequence_name text; BEGIN
  FOR item IN SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND column_default LIKE 'nextval(%' AND table_name IN (SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity) LOOP
    sequence_name := pg_get_serial_sequence(format('public.%I', item.table_name), item.column_name);
    IF sequence_name IS NOT NULL THEN EXECUTE format('GRANT USAGE ON SEQUENCE %s TO roastbook_journal', sequence_name); END IF;
  END LOOP;
END $$;
--> statement-breakpoint
-- The control connection owns migrations and performs bootstrap/maintenance.
-- SET LOCAL ROLE removes its privileges for every journal request.
DO $$ DECLARE item record; BEGIN
  FOR item IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity LOOP
    EXECUTE format('CREATE POLICY instance_control ON %I TO %I USING (true) WITH CHECK (true)', item.tablename, current_user);
  END LOOP;
END $$;

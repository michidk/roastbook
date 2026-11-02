-- D1 has no PostgreSQL RLS. Require an existing active account on journal writes.
-- DELETE remains available to the account-deletion worker.
-- Array guards preserve PostgreSQL text[] element types for raw SQL writes.
--> statement-breakpoint
CREATE TRIGGER "ai_request_logs_active_owner_insert"
BEFORE INSERT ON "ai_request_logs"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "ai_request_logs_active_owner_update"
BEFORE UPDATE ON "ai_request_logs"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "ai_usage_active_owner_insert"
BEFORE INSERT ON "ai_usage"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "ai_usage_active_owner_update"
BEFORE UPDATE ON "ai_usage"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "basket_details_active_owner_insert"
BEFORE INSERT ON "basket_details"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "basket_details_active_owner_update"
BEFORE UPDATE ON "basket_details"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "bean_images_active_owner_insert"
BEFORE INSERT ON "bean_images"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "bean_images_active_owner_update"
BEFORE UPDATE ON "bean_images"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "bean_purchases_active_owner_insert"
BEFORE INSERT ON "bean_purchases"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "bean_purchases_active_owner_update"
BEFORE UPDATE ON "bean_purchases"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "beans_active_owner_insert"
BEFORE INSERT ON "beans"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "beans_active_owner_update"
BEFORE UPDATE ON "beans"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "brewer_details_active_owner_insert"
BEFORE INSERT ON "brewer_details"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "brewer_details_active_owner_update"
BEFORE UPDATE ON "brewer_details"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "brewing_method_drink_types_active_owner_insert"
BEFORE INSERT ON "brewing_method_drink_types"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "brewing_method_drink_types_active_owner_update"
BEFORE UPDATE ON "brewing_method_drink_types"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "brewing_methods_active_owner_insert"
BEFORE INSERT ON "brewing_methods"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "brewing_methods_active_owner_update"
BEFORE UPDATE ON "brewing_methods"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "cafe_visit_drink_options_active_owner_insert"
BEFORE INSERT ON "cafe_visit_drink_options"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "cafe_visit_drink_options_active_owner_update"
BEFORE UPDATE ON "cafe_visit_drink_options"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "cafe_visit_images_active_owner_insert"
BEFORE INSERT ON "cafe_visit_images"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "cafe_visit_images_active_owner_update"
BEFORE UPDATE ON "cafe_visit_images"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "cafe_visit_taste_tags_active_owner_insert"
BEFORE INSERT ON "cafe_visit_taste_tags"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "cafe_visit_taste_tags_active_owner_update"
BEFORE UPDATE ON "cafe_visit_taste_tags"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "cafe_visits_active_owner_insert"
BEFORE INSERT ON "cafe_visits"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "cafe_visits_active_owner_update"
BEFORE UPDATE ON "cafe_visits"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "client_operations_active_owner_insert"
BEFORE INSERT ON "client_operations"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "client_operations_active_owner_update"
BEFORE UPDATE ON "client_operations"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "coffee_shop_images_active_owner_insert"
BEFORE INSERT ON "coffee_shop_images"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "coffee_shop_images_active_owner_update"
BEFORE UPDATE ON "coffee_shop_images"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "coffee_shops_active_owner_insert"
BEFORE INSERT ON "coffee_shops"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "coffee_shops_active_owner_update"
BEFORE UPDATE ON "coffee_shops"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "drink_option_groups_active_owner_insert"
BEFORE INSERT ON "drink_option_groups"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "drink_option_groups_active_owner_update"
BEFORE UPDATE ON "drink_option_groups"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "drink_option_values_active_owner_insert"
BEFORE INSERT ON "drink_option_values"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "drink_option_values_active_owner_update"
BEFORE UPDATE ON "drink_option_values"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "drink_type_option_groups_active_owner_insert"
BEFORE INSERT ON "drink_type_option_groups"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "drink_type_option_groups_active_owner_update"
BEFORE UPDATE ON "drink_type_option_groups"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "drink_types_active_owner_insert"
BEFORE INSERT ON "drink_types"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "drink_types_active_owner_update"
BEFORE UPDATE ON "drink_types"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "espresso_machine_details_active_owner_insert"
BEFORE INSERT ON "espresso_machine_details"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "espresso_machine_details_active_owner_update"
BEFORE UPDATE ON "espresso_machine_details"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "espresso_machine_setting_revisions_active_owner_insert"
BEFORE INSERT ON "espresso_machine_setting_revisions"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "espresso_machine_setting_revisions_active_owner_update"
BEFORE UPDATE ON "espresso_machine_setting_revisions"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "gear_active_owner_insert"
BEFORE INSERT ON "gear"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "gear_active_owner_update"
BEFORE UPDATE ON "gear"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "gear_images_active_owner_insert"
BEFORE INSERT ON "gear_images"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "gear_images_active_owner_update"
BEFORE UPDATE ON "gear_images"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "gear_property_evidence_active_owner_insert"
BEFORE INSERT ON "gear_property_evidence"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "gear_property_evidence_active_owner_update"
BEFORE UPDATE ON "gear_property_evidence"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "gear_set_accessory_gear_active_owner_insert"
BEFORE INSERT ON "gear_set_accessory_gear"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "gear_set_accessory_gear_active_owner_update"
BEFORE UPDATE ON "gear_set_accessory_gear"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "gear_sets_active_owner_insert"
BEFORE INSERT ON "gear_sets"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "gear_sets_active_owner_update"
BEFORE UPDATE ON "gear_sets"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "grinder_details_active_owner_insert"
BEFORE INSERT ON "grinder_details"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "grinder_details_active_owner_update"
BEFORE UPDATE ON "grinder_details"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "kettle_details_active_owner_insert"
BEFORE INSERT ON "kettle_details"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "kettle_details_active_owner_update"
BEFORE UPDATE ON "kettle_details"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "mcp_audit_events_active_owner_insert"
BEFORE INSERT ON "mcp_audit_events"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "mcp_audit_events_active_owner_update"
BEFORE UPDATE ON "mcp_audit_events"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "mcp_settings_active_owner_insert"
BEFORE INSERT ON "mcp_settings"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "mcp_settings_active_owner_update"
BEFORE UPDATE ON "mcp_settings"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "media_cleanup_jobs_active_owner_insert"
BEFORE INSERT ON "media_cleanup_jobs"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "media_cleanup_jobs_active_owner_update"
BEFORE UPDATE ON "media_cleanup_jobs"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "recipe_accessory_gear_active_owner_insert"
BEFORE INSERT ON "recipe_accessory_gear"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "recipe_accessory_gear_active_owner_update"
BEFORE UPDATE ON "recipe_accessory_gear"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "recipe_drink_options_active_owner_insert"
BEFORE INSERT ON "recipe_drink_options"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "recipe_drink_options_active_owner_update"
BEFORE UPDATE ON "recipe_drink_options"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "recipes_active_owner_insert"
BEFORE INSERT ON "recipes"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "recipes_active_owner_update"
BEFORE UPDATE ON "recipes"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "replication_changes_active_owner_insert"
BEFORE INSERT ON "replication_changes"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "replication_changes_active_owner_update"
BEFORE UPDATE ON "replication_changes"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "roasters_active_owner_insert"
BEFORE INSERT ON "roasters"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "roasters_active_owner_update"
BEFORE UPDATE ON "roasters"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "scale_details_active_owner_insert"
BEFORE INSERT ON "scale_details"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "scale_details_active_owner_update"
BEFORE UPDATE ON "scale_details"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "settings_active_owner_insert"
BEFORE INSERT ON "settings"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "settings_active_owner_update"
BEFORE UPDATE ON "settings"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "brew_accessory_gear_active_owner_insert"
BEFORE INSERT ON "brew_accessory_gear"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "brew_accessory_gear_active_owner_update"
BEFORE UPDATE ON "brew_accessory_gear"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "brew_drink_options_active_owner_insert"
BEFORE INSERT ON "brew_drink_options"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "brew_drink_options_active_owner_update"
BEFORE UPDATE ON "brew_drink_options"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "brew_images_active_owner_insert"
BEFORE INSERT ON "brew_images"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "brew_images_active_owner_update"
BEFORE UPDATE ON "brew_images"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "brew_taste_tags_active_owner_insert"
BEFORE INSERT ON "brew_taste_tags"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "brew_taste_tags_active_owner_update"
BEFORE UPDATE ON "brew_taste_tags"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "brews_active_owner_insert"
BEFORE INSERT ON "brews"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "brews_active_owner_update"
BEFORE UPDATE ON "brews"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "shottimer_active_owner_insert"
BEFORE INSERT ON "shottimer"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "shottimer_active_owner_update"
BEFORE UPDATE ON "shottimer"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "tamper_details_active_owner_insert"
BEFORE INSERT ON "tamper_details"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "tamper_details_active_owner_update"
BEFORE UPDATE ON "tamper_details"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "taste_tags_active_owner_insert"
BEFORE INSERT ON "taste_tags"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "taste_tags_active_owner_update"
BEFORE UPDATE ON "taste_tags"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "wdt_details_active_owner_insert"
BEFORE INSERT ON "wdt_details"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "wdt_details_active_owner_update"
BEFORE UPDATE ON "wdt_details"
WHEN NOT EXISTS (SELECT 1 FROM auth_users WHERE id = NEW.owner_id AND deleting_at IS NULL)
BEGIN
  SELECT RAISE(ABORT, 'Journal owner is unavailable');
END;
--> statement-breakpoint
CREATE TRIGGER "settings_string_arrays_insert"
BEFORE INSERT ON "settings"
WHEN (NEW."taste_profile_fields" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."taste_profile_fields") WHERE type <> 'text'))
BEGIN
  SELECT RAISE(ABORT, 'Array elements must be strings');
END;
--> statement-breakpoint
CREATE TRIGGER "settings_string_arrays_update"
BEFORE UPDATE ON "settings"
WHEN (NEW."taste_profile_fields" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."taste_profile_fields") WHERE type <> 'text'))
BEGIN
  SELECT RAISE(ABORT, 'Array elements must be strings');
END;
--> statement-breakpoint
CREATE TRIGGER "espresso_machine_details_string_arrays_insert"
BEFORE INSERT ON "espresso_machine_details"
WHEN (NEW."shot_stop_modes" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."shot_stop_modes") WHERE type <> 'text'))
  OR (NEW."water_source_modes" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."water_source_modes") WHERE type <> 'text'))
BEGIN
  SELECT RAISE(ABORT, 'Array elements must be strings');
END;
--> statement-breakpoint
CREATE TRIGGER "espresso_machine_details_string_arrays_update"
BEFORE UPDATE ON "espresso_machine_details"
WHEN (NEW."shot_stop_modes" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."shot_stop_modes") WHERE type <> 'text'))
  OR (NEW."water_source_modes" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."water_source_modes") WHERE type <> 'text'))
BEGIN
  SELECT RAISE(ABORT, 'Array elements must be strings');
END;
--> statement-breakpoint
CREATE TRIGGER "grinder_details_string_arrays_insert"
BEFORE INSERT ON "grinder_details"
WHEN (NEW."brew_range" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."brew_range") WHERE type <> 'text'))
  OR (NEW."dose_control_modes" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."dose_control_modes") WHERE type <> 'text'))
BEGIN
  SELECT RAISE(ABORT, 'Array elements must be strings');
END;
--> statement-breakpoint
CREATE TRIGGER "grinder_details_string_arrays_update"
BEFORE UPDATE ON "grinder_details"
WHEN (NEW."brew_range" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."brew_range") WHERE type <> 'text'))
  OR (NEW."dose_control_modes" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."dose_control_modes") WHERE type <> 'text'))
BEGIN
  SELECT RAISE(ABORT, 'Array elements must be strings');
END;
--> statement-breakpoint
CREATE TRIGGER "brewing_methods_string_arrays_insert"
BEFORE INSERT ON "brewing_methods"
WHEN (NEW."enabled_parameters" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."enabled_parameters") WHERE type <> 'text'))
BEGIN
  SELECT RAISE(ABORT, 'Array elements must be strings');
END;
--> statement-breakpoint
CREATE TRIGGER "brewing_methods_string_arrays_update"
BEFORE UPDATE ON "brewing_methods"
WHEN (NEW."enabled_parameters" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."enabled_parameters") WHERE type <> 'text'))
BEGIN
  SELECT RAISE(ABORT, 'Array elements must be strings');
END;
--> statement-breakpoint
CREATE TRIGGER "oauth_client_string_arrays_insert"
BEFORE INSERT ON "oauth_client"
WHEN (NEW."scopes" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."scopes") WHERE type <> 'text'))
  OR (NEW."client_credentials_scopes" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."client_credentials_scopes") WHERE type <> 'text'))
  OR (NEW."contacts" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."contacts") WHERE type <> 'text'))
  OR (NEW."redirect_uris" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."redirect_uris") WHERE type <> 'text'))
  OR (NEW."post_logout_redirect_uris" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."post_logout_redirect_uris") WHERE type <> 'text'))
  OR (NEW."grant_types" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."grant_types") WHERE type <> 'text'))
  OR (NEW."response_types" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."response_types") WHERE type <> 'text'))
BEGIN
  SELECT RAISE(ABORT, 'Array elements must be strings');
END;
--> statement-breakpoint
CREATE TRIGGER "oauth_client_string_arrays_update"
BEFORE UPDATE ON "oauth_client"
WHEN (NEW."scopes" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."scopes") WHERE type <> 'text'))
  OR (NEW."client_credentials_scopes" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."client_credentials_scopes") WHERE type <> 'text'))
  OR (NEW."contacts" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."contacts") WHERE type <> 'text'))
  OR (NEW."redirect_uris" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."redirect_uris") WHERE type <> 'text'))
  OR (NEW."post_logout_redirect_uris" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."post_logout_redirect_uris") WHERE type <> 'text'))
  OR (NEW."grant_types" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."grant_types") WHERE type <> 'text'))
  OR (NEW."response_types" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."response_types") WHERE type <> 'text'))
BEGIN
  SELECT RAISE(ABORT, 'Array elements must be strings');
END;
--> statement-breakpoint
CREATE TRIGGER "oauth_resource_string_arrays_insert"
BEFORE INSERT ON "oauth_resource"
WHEN (NEW."allowed_scopes" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."allowed_scopes") WHERE type <> 'text'))
BEGIN
  SELECT RAISE(ABORT, 'Array elements must be strings');
END;
--> statement-breakpoint
CREATE TRIGGER "oauth_resource_string_arrays_update"
BEFORE UPDATE ON "oauth_resource"
WHEN (NEW."allowed_scopes" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."allowed_scopes") WHERE type <> 'text'))
BEGIN
  SELECT RAISE(ABORT, 'Array elements must be strings');
END;
--> statement-breakpoint
CREATE TRIGGER "oauth_refresh_token_string_arrays_insert"
BEFORE INSERT ON "oauth_refresh_token"
WHEN (NEW."resources" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."resources") WHERE type <> 'text'))
  OR (NEW."requested_user_info_claims" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."requested_user_info_claims") WHERE type <> 'text'))
  OR (NEW."scopes" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."scopes") WHERE type <> 'text'))
BEGIN
  SELECT RAISE(ABORT, 'Array elements must be strings');
END;
--> statement-breakpoint
CREATE TRIGGER "oauth_refresh_token_string_arrays_update"
BEFORE UPDATE ON "oauth_refresh_token"
WHEN (NEW."resources" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."resources") WHERE type <> 'text'))
  OR (NEW."requested_user_info_claims" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."requested_user_info_claims") WHERE type <> 'text'))
  OR (NEW."scopes" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."scopes") WHERE type <> 'text'))
BEGIN
  SELECT RAISE(ABORT, 'Array elements must be strings');
END;
--> statement-breakpoint
CREATE TRIGGER "oauth_access_token_string_arrays_insert"
BEFORE INSERT ON "oauth_access_token"
WHEN (NEW."resources" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."resources") WHERE type <> 'text'))
  OR (NEW."requested_user_info_claims" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."requested_user_info_claims") WHERE type <> 'text'))
  OR (NEW."scopes" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."scopes") WHERE type <> 'text'))
BEGIN
  SELECT RAISE(ABORT, 'Array elements must be strings');
END;
--> statement-breakpoint
CREATE TRIGGER "oauth_access_token_string_arrays_update"
BEFORE UPDATE ON "oauth_access_token"
WHEN (NEW."resources" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."resources") WHERE type <> 'text'))
  OR (NEW."requested_user_info_claims" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."requested_user_info_claims") WHERE type <> 'text'))
  OR (NEW."scopes" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."scopes") WHERE type <> 'text'))
BEGIN
  SELECT RAISE(ABORT, 'Array elements must be strings');
END;
--> statement-breakpoint
CREATE TRIGGER "oauth_consent_string_arrays_insert"
BEFORE INSERT ON "oauth_consent"
WHEN (NEW."resources" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."resources") WHERE type <> 'text'))
  OR (NEW."requested_user_info_claims" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."requested_user_info_claims") WHERE type <> 'text'))
  OR (NEW."scopes" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."scopes") WHERE type <> 'text'))
BEGIN
  SELECT RAISE(ABORT, 'Array elements must be strings');
END;
--> statement-breakpoint
CREATE TRIGGER "oauth_consent_string_arrays_update"
BEFORE UPDATE ON "oauth_consent"
WHEN (NEW."resources" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."resources") WHERE type <> 'text'))
  OR (NEW."requested_user_info_claims" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."requested_user_info_claims") WHERE type <> 'text'))
  OR (NEW."scopes" IS NOT NULL AND EXISTS (SELECT 1 FROM json_each(NEW."scopes") WHERE type <> 'text'))
BEGIN
  SELECT RAISE(ABORT, 'Array elements must be strings');
END;

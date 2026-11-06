ALTER TABLE "bean_images" ALTER COLUMN "bean_purchase_id" DROP NOT NULL;
--> statement-breakpoint
INSERT INTO bean_tags(owner_id, name)
SELECT owners.owner_id, defaults.name FROM
(SELECT 'local' AS owner_id UNION SELECT owner_id FROM settings UNION SELECT id FROM auth_users) owners
CROSS JOIN (VALUES ('Reorder'), ('Want to try')) defaults(name);

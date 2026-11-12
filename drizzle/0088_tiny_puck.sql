ALTER TABLE "bean_images" ADD COLUMN "original_storage_path" text;--> statement-breakpoint
ALTER TABLE "bean_images" ADD COLUMN "original_mime_type" text;--> statement-breakpoint
ALTER TABLE "bean_images" ADD COLUMN "original_size_bytes" integer;--> statement-breakpoint
ALTER TABLE "bean_images" ADD COLUMN "original_storage_bytes" integer;--> statement-breakpoint
ALTER TABLE "bean_images" ADD COLUMN "beautified_at" timestamp;--> statement-breakpoint
ALTER TABLE "cafe_visit_images" ADD COLUMN "original_storage_path" text;--> statement-breakpoint
ALTER TABLE "cafe_visit_images" ADD COLUMN "original_mime_type" text;--> statement-breakpoint
ALTER TABLE "cafe_visit_images" ADD COLUMN "original_size_bytes" integer;--> statement-breakpoint
ALTER TABLE "cafe_visit_images" ADD COLUMN "original_storage_bytes" integer;--> statement-breakpoint
ALTER TABLE "cafe_visit_images" ADD COLUMN "beautified_at" timestamp;--> statement-breakpoint
ALTER TABLE "coffee_shop_images" ADD COLUMN "original_storage_path" text;--> statement-breakpoint
ALTER TABLE "coffee_shop_images" ADD COLUMN "original_mime_type" text;--> statement-breakpoint
ALTER TABLE "coffee_shop_images" ADD COLUMN "original_size_bytes" integer;--> statement-breakpoint
ALTER TABLE "coffee_shop_images" ADD COLUMN "original_storage_bytes" integer;--> statement-breakpoint
ALTER TABLE "coffee_shop_images" ADD COLUMN "beautified_at" timestamp;--> statement-breakpoint
ALTER TABLE "gear_images" ADD COLUMN "original_storage_path" text;--> statement-breakpoint
ALTER TABLE "gear_images" ADD COLUMN "original_mime_type" text;--> statement-breakpoint
ALTER TABLE "gear_images" ADD COLUMN "original_size_bytes" integer;--> statement-breakpoint
ALTER TABLE "gear_images" ADD COLUMN "original_storage_bytes" integer;--> statement-breakpoint
ALTER TABLE "gear_images" ADD COLUMN "beautified_at" timestamp;--> statement-breakpoint
ALTER TABLE "brew_images" ADD COLUMN "original_storage_path" text;--> statement-breakpoint
ALTER TABLE "brew_images" ADD COLUMN "original_mime_type" text;--> statement-breakpoint
ALTER TABLE "brew_images" ADD COLUMN "original_size_bytes" integer;--> statement-breakpoint
ALTER TABLE "brew_images" ADD COLUMN "original_storage_bytes" integer;--> statement-breakpoint
ALTER TABLE "brew_images" ADD COLUMN "beautified_at" timestamp;--> statement-breakpoint
CREATE TEMP TABLE roastbook_beautified_migration AS
SELECT DISTINCT ON (original.id) original.id AS source_id, copy.*
FROM "bean_images" original
JOIN "bean_images" copy ON copy.beautified_from_image_id = original.id
  AND copy.owner_id = original.owner_id AND copy."bean_purchase_id" = original."bean_purchase_id"
WHERE original.beautified_from_image_id IS NULL
ORDER BY original.id, copy.is_thumbnail DESC, copy.created_at DESC, copy.id DESC;--> statement-breakpoint
UPDATE "bean_images" SET is_thumbnail = false WHERE id IN (SELECT id FROM roastbook_beautified_migration);--> statement-breakpoint
UPDATE "bean_images" original SET
  original_storage_path = original.storage_path,
  original_mime_type = original.mime_type,
  original_size_bytes = original.size_bytes,
  original_storage_bytes = original.storage_bytes,
  storage_path = copy.storage_path,
  mime_type = copy.mime_type,
  size_bytes = copy.size_bytes,
  storage_bytes = original.storage_bytes + copy.storage_bytes,
  beautified_at = copy.created_at, is_thumbnail = original.is_thumbnail OR copy.is_thumbnail
FROM roastbook_beautified_migration copy
WHERE original.id = copy.source_id AND original.owner_id = copy.owner_id;--> statement-breakpoint
DELETE FROM "bean_images" WHERE id IN (SELECT id FROM roastbook_beautified_migration);--> statement-breakpoint
DROP TABLE roastbook_beautified_migration;--> statement-breakpoint
UPDATE "bean_images" SET beautified_at = created_at
WHERE beautified_from_image_id IS NOT NULL AND beautified_at IS NULL;--> statement-breakpoint
CREATE TEMP TABLE roastbook_beautified_migration AS
SELECT DISTINCT ON (original.id) original.id AS source_id, copy.*
FROM "gear_images" original
JOIN "gear_images" copy ON copy.beautified_from_image_id = original.id
  AND copy.owner_id = original.owner_id AND copy."gear_id" = original."gear_id"
WHERE original.beautified_from_image_id IS NULL
ORDER BY original.id, copy.is_thumbnail DESC, copy.created_at DESC, copy.id DESC;--> statement-breakpoint
UPDATE "gear_images" SET is_thumbnail = false WHERE id IN (SELECT id FROM roastbook_beautified_migration);--> statement-breakpoint
UPDATE "gear_images" original SET
  original_storage_path = original.storage_path,
  original_mime_type = original.mime_type,
  original_size_bytes = original.size_bytes,
  original_storage_bytes = original.storage_bytes,
  storage_path = copy.storage_path,
  mime_type = copy.mime_type,
  size_bytes = copy.size_bytes,
  storage_bytes = original.storage_bytes + copy.storage_bytes,
  beautified_at = copy.created_at, is_thumbnail = original.is_thumbnail OR copy.is_thumbnail
FROM roastbook_beautified_migration copy
WHERE original.id = copy.source_id AND original.owner_id = copy.owner_id;--> statement-breakpoint
DELETE FROM "gear_images" WHERE id IN (SELECT id FROM roastbook_beautified_migration);--> statement-breakpoint
DROP TABLE roastbook_beautified_migration;--> statement-breakpoint
UPDATE "gear_images" SET beautified_at = created_at
WHERE beautified_from_image_id IS NOT NULL AND beautified_at IS NULL;--> statement-breakpoint
CREATE TEMP TABLE roastbook_beautified_migration AS
SELECT DISTINCT ON (original.id) original.id AS source_id, copy.*
FROM "coffee_shop_images" original
JOIN "coffee_shop_images" copy ON copy.beautified_from_image_id = original.id
  AND copy.owner_id = original.owner_id AND copy."coffee_shop_id" = original."coffee_shop_id"
WHERE original.beautified_from_image_id IS NULL
ORDER BY original.id, copy.created_at DESC, copy.id DESC;--> statement-breakpoint
UPDATE "coffee_shop_images" original SET
  original_storage_path = original.storage_path,
  original_mime_type = original.mime_type,
  original_size_bytes = original.size_bytes,
  original_storage_bytes = original.storage_bytes,
  storage_path = copy.storage_path,
  mime_type = copy.mime_type,
  size_bytes = copy.size_bytes,
  storage_bytes = original.storage_bytes + copy.storage_bytes,
  beautified_at = copy.created_at
FROM roastbook_beautified_migration copy
WHERE original.id = copy.source_id AND original.owner_id = copy.owner_id;--> statement-breakpoint
DELETE FROM "coffee_shop_images" WHERE id IN (SELECT id FROM roastbook_beautified_migration);--> statement-breakpoint
DROP TABLE roastbook_beautified_migration;--> statement-breakpoint
UPDATE "coffee_shop_images" SET beautified_at = created_at
WHERE beautified_from_image_id IS NOT NULL AND beautified_at IS NULL;--> statement-breakpoint
CREATE TEMP TABLE roastbook_beautified_migration AS
SELECT DISTINCT ON (original.id) original.id AS source_id, copy.*
FROM "brew_images" original
JOIN "brew_images" copy ON copy.beautified_from_image_id = original.id
  AND copy.owner_id = original.owner_id AND copy."brew_id" = original."brew_id"
WHERE original.beautified_from_image_id IS NULL
ORDER BY original.id, copy.created_at DESC, copy.id DESC;--> statement-breakpoint
UPDATE "brew_images" original SET
  original_storage_path = original.storage_path,
  original_mime_type = original.mime_type,
  original_size_bytes = original.size_bytes,
  original_storage_bytes = original.storage_bytes,
  storage_path = copy.storage_path,
  mime_type = copy.mime_type,
  size_bytes = copy.size_bytes,
  storage_bytes = original.storage_bytes + copy.storage_bytes,
  beautified_at = copy.created_at
FROM roastbook_beautified_migration copy
WHERE original.id = copy.source_id AND original.owner_id = copy.owner_id;--> statement-breakpoint
DELETE FROM "brew_images" WHERE id IN (SELECT id FROM roastbook_beautified_migration);--> statement-breakpoint
DROP TABLE roastbook_beautified_migration;--> statement-breakpoint
UPDATE "brew_images" SET beautified_at = created_at
WHERE beautified_from_image_id IS NOT NULL AND beautified_at IS NULL;--> statement-breakpoint
CREATE TEMP TABLE roastbook_beautified_migration AS
SELECT DISTINCT ON (original.id) original.id AS source_id, copy.*
FROM "cafe_visit_images" original
JOIN "cafe_visit_images" copy ON copy.beautified_from_image_id = original.id
  AND copy.owner_id = original.owner_id AND copy."cafe_visit_id" = original."cafe_visit_id"
WHERE original.beautified_from_image_id IS NULL
ORDER BY original.id, copy.created_at DESC, copy.id DESC;--> statement-breakpoint
UPDATE "cafe_visit_images" original SET
  original_storage_path = original.storage_path,
  original_mime_type = original.mime_type,
  original_size_bytes = original.size_bytes,
  original_storage_bytes = original.storage_bytes,
  storage_path = copy.storage_path,
  mime_type = copy.mime_type,
  size_bytes = copy.size_bytes,
  storage_bytes = original.storage_bytes + copy.storage_bytes,
  beautified_at = copy.created_at
FROM roastbook_beautified_migration copy
WHERE original.id = copy.source_id AND original.owner_id = copy.owner_id;--> statement-breakpoint
DELETE FROM "cafe_visit_images" WHERE id IN (SELECT id FROM roastbook_beautified_migration);--> statement-breakpoint
DROP TABLE roastbook_beautified_migration;--> statement-breakpoint
UPDATE "cafe_visit_images" SET beautified_at = created_at
WHERE beautified_from_image_id IS NOT NULL AND beautified_at IS NULL;--> statement-breakpoint
ALTER TABLE "bean_images" DROP COLUMN "beautified_from_image_id";--> statement-breakpoint
ALTER TABLE "cafe_visit_images" DROP COLUMN "beautified_from_image_id";--> statement-breakpoint
ALTER TABLE "coffee_shop_images" DROP COLUMN "beautified_from_image_id";--> statement-breakpoint
ALTER TABLE "gear_images" DROP COLUMN "beautified_from_image_id";--> statement-breakpoint
ALTER TABLE "brew_images" DROP COLUMN "beautified_from_image_id";

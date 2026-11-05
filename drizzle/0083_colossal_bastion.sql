CREATE TABLE "bean_tag_assignments" (
	"owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL,
	"bean_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	CONSTRAINT "bean_tag_assignments_owner_id_bean_id_tag_id_pk" PRIMARY KEY("owner_id","bean_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "bean_tags" (
	"owner_id" text DEFAULT coalesce(nullif(current_setting('roastbook.user_id', true), ''), 'local') NOT NULL,
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bean_tags_name_check" CHECK (length(trim("bean_tags"."name")) between 1 and 50)
);
--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "always_on_shelf" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "rating" integer;--> statement-breakpoint
ALTER TABLE "beans" ADD COLUMN "rating_note" text;--> statement-breakpoint
CREATE INDEX "bean_tags_owner_id_idx" ON "bean_tags" USING btree ("owner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bean_tags_owner_id_id_unique" ON "bean_tags" USING btree ("owner_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "bean_tags_owner_name_unique" ON "bean_tags" USING btree ("owner_id",lower(trim("name")));--> statement-breakpoint
CREATE UNIQUE INDEX "beans_owner_id_id_unique" ON "beans" USING btree ("owner_id","id");--> statement-breakpoint
ALTER TABLE "bean_tag_assignments" ADD CONSTRAINT "bean_tag_assignments_owner_id_bean_id_beans_owner_id_id_fk" FOREIGN KEY ("owner_id","bean_id") REFERENCES "public"."beans"("owner_id","id") ON DELETE cascade ON UPDATE no action DEFERRABLE INITIALLY DEFERRED;--> statement-breakpoint
ALTER TABLE "bean_tag_assignments" ADD CONSTRAINT "bean_tag_assignments_owner_id_tag_id_bean_tags_owner_id_id_fk" FOREIGN KEY ("owner_id","tag_id") REFERENCES "public"."bean_tags"("owner_id","id") ON DELETE cascade ON UPDATE no action DEFERRABLE INITIALLY DEFERRED;--> statement-breakpoint
ALTER TABLE "beans" ADD CONSTRAINT "beans_rating_check" CHECK ("beans"."rating" between 1 and 5);
--> statement-breakpoint
ALTER TABLE "bean_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bean_tags" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "bean_tags" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
CREATE POLICY instance_control ON "bean_tags" TO CURRENT_USER USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON "bean_tags" TO roastbook_journal;
--> statement-breakpoint
ALTER TABLE "bean_tag_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bean_tag_assignments" FORCE ROW LEVEL SECURITY;
CREATE POLICY journal_owner ON "bean_tag_assignments" TO roastbook_journal USING (owner_id = nullif(current_setting('roastbook.user_id', true), '')) WITH CHECK (owner_id = nullif(current_setting('roastbook.user_id', true), ''));
CREATE POLICY instance_control ON "bean_tag_assignments" TO CURRENT_USER USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON "bean_tag_assignments" TO roastbook_journal;
--> statement-breakpoint
GRANT USAGE, SELECT ON SEQUENCE bean_tags_id_seq TO roastbook_journal;
--> statement-breakpoint
-- Bean library synchronization triggers.
CREATE TRIGGER journal_changed AFTER INSERT OR UPDATE OR DELETE ON "bean_tags" FOR EACH ROW EXECUTE FUNCTION journal_changed('id');
--> statement-breakpoint
CREATE TRIGGER journal_changed AFTER INSERT OR UPDATE OR DELETE ON "bean_tag_assignments" FOR EACH ROW EXECUTE FUNCTION journal_changed('bean_id', 'tag_id');

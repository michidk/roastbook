CREATE TABLE "mcp_audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event" text NOT NULL,
	"outcome" text NOT NULL,
	"tool_name" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mcp_settings" (
	"id" text PRIMARY KEY DEFAULT 'instance' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"disabled_tools" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "mcp_audit_events_created_at_idx" ON "mcp_audit_events" USING btree ("created_at");
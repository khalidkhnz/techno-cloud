ALTER TABLE "deployments" ADD COLUMN "image_uri" text;--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "rolled_back_from" uuid;
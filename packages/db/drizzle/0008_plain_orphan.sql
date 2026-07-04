ALTER TABLE "domains" DROP CONSTRAINT "domains_hostname_unique";--> statement-breakpoint
ALTER TABLE "deployments" ADD COLUMN "ref" text;
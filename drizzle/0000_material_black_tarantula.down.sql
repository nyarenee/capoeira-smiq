DROP TABLE IF EXISTS "public"."graduation_levels" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "public"."languages" CASCADE;--> statement-breakpoint
ALTER TABLE "public"."pending_smiq_submissions" DROP CONSTRAINT "pending_smiq_submissions_segment_segments_code_fk";--> statement-breakpoint
ALTER TABLE "public"."pending_smiq_submissions" DROP CONSTRAINT "pending_smiq_submissions_teaching_role_teaching_roles_code_fk";--> statement-breakpoint
ALTER TABLE "public"."pending_smiq_submissions" DROP CONSTRAINT "pending_smiq_submissions_graduation_level_graduation_levels_code_fk";--> statement-breakpoint
ALTER TABLE "public"."pending_smiq_submissions" DROP CONSTRAINT "pending_smiq_submissions_lang_languages_code_fk";--> statement-breakpoint
DROP TABLE IF EXISTS "public"."pending_smiq_submissions" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "public"."segments" CASCADE;--> statement-breakpoint
ALTER TABLE "public"."smiq_responses" DROP CONSTRAINT "smiq_responses_segment_segments_code_fk";--> statement-breakpoint
ALTER TABLE "public"."smiq_responses" DROP CONSTRAINT "smiq_responses_teaching_role_teaching_roles_code_fk";--> statement-breakpoint
ALTER TABLE "public"."smiq_responses" DROP CONSTRAINT "smiq_responses_graduation_level_graduation_levels_code_fk";--> statement-breakpoint
ALTER TABLE "public"."smiq_responses" DROP CONSTRAINT "smiq_responses_lang_languages_code_fk";--> statement-breakpoint
DROP TABLE IF EXISTS "public"."smiq_responses" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "public"."teaching_roles" CASCADE;

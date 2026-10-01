CREATE TABLE "graduation_levels" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_smiq_submissions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"segment" text NOT NULL,
	"smiq_answer" text NOT NULL,
	"teaching_role" text,
	"graduation_level" text,
	"lang" text,
	CONSTRAINT "pending_smiq_submissions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "segments" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "smiq_responses" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"name" text,
	"email" text,
	"segment" text,
	"smiq_answer" text,
	"teaching_role" text,
	"graduation_level" text,
	"lang" text
);
--> statement-breakpoint
CREATE TABLE "teaching_roles" (
	"code" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pending_smiq_submissions" ADD CONSTRAINT "pending_smiq_submissions_segment_segments_code_fk" FOREIGN KEY ("segment") REFERENCES "public"."segments"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_smiq_submissions" ADD CONSTRAINT "pending_smiq_submissions_teaching_role_teaching_roles_code_fk" FOREIGN KEY ("teaching_role") REFERENCES "public"."teaching_roles"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_smiq_submissions" ADD CONSTRAINT "pending_smiq_submissions_graduation_level_graduation_levels_code_fk" FOREIGN KEY ("graduation_level") REFERENCES "public"."graduation_levels"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_smiq_submissions" ADD CONSTRAINT "pending_smiq_submissions_lang_languages_code_fk" FOREIGN KEY ("lang") REFERENCES "public"."languages"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smiq_responses" ADD CONSTRAINT "smiq_responses_segment_segments_code_fk" FOREIGN KEY ("segment") REFERENCES "public"."segments"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smiq_responses" ADD CONSTRAINT "smiq_responses_teaching_role_teaching_roles_code_fk" FOREIGN KEY ("teaching_role") REFERENCES "public"."teaching_roles"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smiq_responses" ADD CONSTRAINT "smiq_responses_graduation_level_graduation_levels_code_fk" FOREIGN KEY ("graduation_level") REFERENCES "public"."graduation_levels"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smiq_responses" ADD CONSTRAINT "smiq_responses_lang_languages_code_fk" FOREIGN KEY ("lang") REFERENCES "public"."languages"("code") ON DELETE no action ON UPDATE no action;
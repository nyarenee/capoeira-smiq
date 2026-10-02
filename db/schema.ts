import { bigserial, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const segments = pgTable("segments", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
});

export const teachingRoles = pgTable("teaching_roles", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
});

export const graduationLevels = pgTable("graduation_levels", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
});

export const languages = pgTable("languages", {
  code: text("code").primaryKey(),
  label: text("label").notNull(),
});

export const pendingSmiqSubmissions = pgTable("pending_smiq_submissions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  token: text("token").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  segment: text("segment")
    .notNull()
    .references(() => segments.code),
  smiqAnswer: text("smiq_answer").notNull(),
  teachingRole: text("teaching_role").references(() => teachingRoles.code),
  graduationLevel: text("graduation_level").references(() => graduationLevels.code),
  lang: text("lang").references(() => languages.code),
});

export const smiqResponses = pgTable("smiq_responses", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  name: text("name"),
  email: text("email"),
  segment: text("segment").references(() => segments.code),
  smiqAnswer: text("smiq_answer"),
  teachingRole: text("teaching_role").references(() => teachingRoles.code),
  graduationLevel: text("graduation_level").references(() => graduationLevels.code),
  lang: text("lang").references(() => languages.code),
});

export type SmiqResponse = typeof smiqResponses.$inferSelect;
export type NewSmiqResponse = typeof smiqResponses.$inferInsert;
export type PendingSmiqSubmission = typeof pendingSmiqSubmissions.$inferSelect;

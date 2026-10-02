import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "../lib/db";
import { segments, teachingRoles, graduationLevels, languages } from "../db/schema";
import { SEGMENTS, TEACHING_ROLES, GRADUATION_LEVELS, LANGUAGES } from "../lib/reference-data";

async function main() {
  const db = getDb();

  await db
    .insert(segments)
    .values([...SEGMENTS])
    .onConflictDoNothing();
  await db
    .insert(teachingRoles)
    .values([...TEACHING_ROLES])
    .onConflictDoNothing();
  await db
    .insert(graduationLevels)
    .values([...GRADUATION_LEVELS])
    .onConflictDoNothing();
  await db
    .insert(languages)
    .values([...LANGUAGES])
    .onConflictDoNothing();

  console.log("Seeded reference data:", {
    segments: SEGMENTS.length,
    teachingRoles: TEACHING_ROLES.length,
    graduationLevels: GRADUATION_LEVELS.length,
    languages: LANGUAGES.length,
  });
}

main().catch((err) => {
  console.error("Failed to seed reference data", err);
  process.exit(1);
});

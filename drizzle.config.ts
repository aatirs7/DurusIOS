import type { Config } from "drizzle-kit";

/*
  driver: "expo" makes drizzle-kit emit drizzle/migrations.js alongside the
  numbered .sql files, which is the bundle useMigrations() consumes at boot.

  There is no dbCredentials and there must never be a `migrate` or `push`
  script: the database this describes lives on a phone and is not reachable
  from here. Generate only.
*/
export default {
  schema: "./src/data/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  driver: "expo",
} satisfies Config;

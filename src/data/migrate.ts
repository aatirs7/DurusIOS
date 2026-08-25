import { useMigrations } from "drizzle-orm/expo-sqlite/migrator";

import migrations from "../../drizzle/migrations";
import { db } from "./client";

export type MigrationStatus =
  | { phase: "running" }
  | { phase: "ready" }
  | { phase: "failed"; error: Error };

/*
  Thin wrapper over drizzle's migrator so the boot gate reads as one thing.

  The foreign key sequence that has to wrap migrations does NOT live here - it
  lives in bootOnce(), which runs immediately after this reports ready. Keeping
  it there means the whole once-per-process boot is one synchronous function
  rather than a chain of effects setting state.
*/
export function useDurusMigrations(): MigrationStatus {
  const { success, error } = useMigrations(db, migrations);
  if (error) return { phase: "failed", error };
  if (success) return { phase: "ready" };
  return { phase: "running" };
}

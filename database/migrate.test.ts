import { describe, expect, it } from "vitest";

type MigrationModule = {
  pendingMigrationNames?: (available: string[], applied: string[]) => string[];
};

const loadMigrationModule = async (): Promise<MigrationModule> => {
  const entrypoint = "./migrate.js";

  return import(entrypoint).catch(() => ({}));
};

describe("migration planning", () => {
  it("does not attempt to apply an already-recorded migration twice", async () => {
    const migration = await loadMigrationModule();

    expect(migration.pendingMigrationNames?.(["0001_initial.sql"], ["0001_initial.sql"])).toEqual([]);
  });
});

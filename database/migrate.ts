import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";

type QueryResult = { rows: Array<{ name: string }> };

export type MigrationClient = {
  query: (query: string, values?: readonly string[]) => Promise<QueryResult>;
};

export type Migration = {
  name: string;
  sql: string;
};

export const pendingMigrationNames = (available: string[], applied: string[]) => {
  const appliedNames = new Set(applied);

  return available.filter((name) => !appliedNames.has(name));
};

export const loadMigrations = async (directory: string): Promise<Migration[]> => {
  const names = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();

  return Promise.all(
    names.map(async (name) => ({
      name,
      sql: await readFile(path.join(directory, name), "utf8")
    }))
  );
};

export const runMigrations = async (client: MigrationClient, migrations: Migration[]) => {
  await client.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())"
  );

  const applied = await client.query("SELECT name FROM schema_migrations ORDER BY name");
  const pendingNames = pendingMigrationNames(
    migrations.map(({ name }) => name),
    applied.rows.map(({ name }) => name)
  );

  for (const name of pendingNames) {
    const migration = migrations.find((candidate) => candidate.name === name);

    if (!migration) {
      throw new Error(`Migration ${name} was not found`);
    }

    await client.query("BEGIN");
    try {
      await client.query(migration.sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [migration.name]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
};

const run = async () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run migrations");
  }

  const client = new Client({ connectionString });
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

  await client.connect();
  try {
    await runMigrations(client, await loadMigrations(path.join(currentDirectory, "migrations")));
  } finally {
    await client.end();
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}

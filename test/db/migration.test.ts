import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { describe, expect, it } from "vitest";

const requiredTables = [
  "users",
  "assistants",
  "assistant_profiles",
  "arxiv_papers",
  "assistant_runs",
  "run_events",
  "run_candidates",
  "run_scores",
  "digests"
];

describe("core database migration", () => {
  it("applies cleanly and creates required tables", async () => {
    const db = new PGlite();
    const sql = await readFile(
      join(process.cwd(), "migrations", "0001_core_schema.sql"),
      "utf8"
    );

    await db.exec(sql);

    const result = await db.query<{ tablename: string }>(
      "select tablename from pg_tables where schemaname = 'public' order by tablename"
    );
    const tableNames = result.rows.map((row) => row.tablename);

    expect(tableNames).toEqual(expect.arrayContaining(requiredTables));
  });
});

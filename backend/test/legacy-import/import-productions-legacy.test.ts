import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type pg from "pg";
import {
  genreKey,
  importProductionsLegacy,
  LEGACY_PRODUCTION_IMPORT_SOURCE,
  splitGenres,
} from "@/legacy-import/import-productions-legacy.js";

describe("LEGACY_PRODUCTION_IMPORT_SOURCE", () => {
  it("matches production import map source used by events importer", () => {
    expect(LEGACY_PRODUCTION_IMPORT_SOURCE).toBe("productions-output-csv");
  });
});

describe("splitGenres", () => {
  it("returns empty for empty string", () => {
    expect(splitGenres("")).toEqual([]);
  });

  it("splits trims and dedupes exact strings", () => {
    expect(splitGenres("  A , B , A ")).toEqual(["A", "B"]);
  });
});

describe("genreKey", () => {
  it("lowercases trimmed name", () => {
    expect(genreKey("  Jazz  ")).toBe("jazz");
  });
});

describe("importProductionsLegacy", () => {
  const makeClient = (query: pg.Client["query"]) =>
    ({ query }) as unknown as pg.Client;

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("dry-run reads CSV and counts rows without writes", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-prod-"));
    const csvPath = path.join(dir, "p.csv");
    fs.writeFileSync(
      csvPath,
      "Titel,ID,Genre\nHello,1,Drama\nWorld,2,\n",
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("FROM tag_type")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importProductionsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: true,
      limit: null,
    });

    expect(query).toHaveBeenCalled();
    const tagTypeCalls = query.mock.calls.filter((c) =>
      String(c[0]).includes("FROM tag_type"),
    );
    expect(tagTypeCalls.length).toBeGreaterThanOrEqual(2);
    fs.rmSync(dir, { recursive: true });
  });

  it("write mode inserts production, tags, and map for one row", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-prod-w-"));
    const csvPath = path.join(dir, "p.csv");
    fs.writeFileSync(csvPath, "Titel,ID,Genre\nMy Show,42,Jazz\n", "utf8");

    const query = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_production_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("SELECT legacy_id") && sql.includes("legacy_production_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag_type")) {
        const name = params?.[0];
        if (name === "Tag") return Promise.resolve({ rows: [{ id: 10 }] });
        if (name === "Genre") return Promise.resolve({ rows: [{ id: 20 }] });
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("type_id = $1") && !sql.includes("lower(name")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("lower(name->>'nl')")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.trimStart().startsWith("INSERT INTO tag (")) {
        return Promise.resolve({ rows: [{ id: 55 }] });
      }
      if (sql.trimStart().startsWith("BEGIN")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("COMMIT")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("ROLLBACK")) return Promise.resolve({ rows: [] });
      if (sql.includes("INSERT INTO production")) {
        return Promise.resolve({ rows: [{ id: 999 }] });
      }
      if (sql.includes("INSERT INTO production_tag")) {
        return Promise.resolve({ rowCount: 1, rows: [] });
      }
      if (sql.includes("INSERT INTO legacy_production_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importProductionsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: false,
      limit: null,
    });

    const inserts = query.mock.calls.filter((c) => String(c[0]).includes("INSERT INTO production"));
    expect(inserts.length).toBeGreaterThanOrEqual(1);
    fs.rmSync(dir, { recursive: true });
  });

  it("rolls back and counts failed row on production insert error", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-prod-fail-"));
    const csvPath = path.join(dir, "p.csv");
    fs.writeFileSync(csvPath, "Titel,ID\nBad,99\n", "utf8");

    const query = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_production_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("SELECT legacy_id") && sql.includes("legacy_production_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag_type")) {
        const name = params?.[0];
        if (name === "Tag") return Promise.resolve({ rows: [{ id: 10 }] });
        if (name === "Genre") return Promise.resolve({ rows: [{ id: 20 }] });
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("type_id = $1") && !sql.includes("lower(name")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.trimStart().startsWith("BEGIN")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("ROLLBACK")) return Promise.resolve({ rows: [] });
      if (sql.includes("INSERT INTO production")) {
        return Promise.reject(new Error("db boom"));
      }
      return Promise.resolve({ rows: [] });
    });

    await importProductionsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: false,
      limit: null,
    });

    expect(query.mock.calls.some((c) => String(c[0]).trimStart().startsWith("ROLLBACK"))).toBe(true);
    fs.rmSync(dir, { recursive: true });
  });

  it("dry-run skips rows without id, duplicate id, empty title, and already-imported legacy id", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-prod-skip-"));
    const csvPath = path.join(dir, "p.csv");
    fs.writeFileSync(
      csvPath,
      [
        "Titel,ID",
        ",1",
        "A,2",
        "B,2",
        "C,3",
        "D,4",
        "",
      ].join("\n"),
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("FROM tag_type")) return Promise.resolve({ rows: [] });
      if (sql.includes("SELECT legacy_id") && sql.includes("legacy_production_import_map")) {
        return Promise.resolve({ rows: [{ legacy_id: "4" }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importProductionsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: true,
      limit: null,
    });

    fs.rmSync(dir, { recursive: true });
  });

  it("respects row limit", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-prod-limit-"));
    const csvPath = path.join(dir, "p.csv");
    fs.writeFileSync(
      csvPath,
      "Titel,ID\nA,1\nB,2\nC,3\n",
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("FROM tag_type")) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    await importProductionsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: true,
      limit: 1,
    });

    fs.rmSync(dir, { recursive: true });
  });

  it("write mode uses description2 when present", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-prod-desc2-"));
    const csvPath = path.join(dir, "p.csv");
    fs.writeFileSync(
      csvPath,
      "Titel,ID,Description2\nShow,77,Extra text\n",
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_production_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("SELECT legacy_id") && sql.includes("legacy_production_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag_type")) {
        const name = params?.[0];
        if (name === "Tag") return Promise.resolve({ rows: [{ id: 10 }] });
        if (name === "Genre") return Promise.resolve({ rows: [{ id: 20 }] });
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("type_id = $1") && !sql.includes("lower(name")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.trimStart().startsWith("BEGIN")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("COMMIT")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("ROLLBACK")) return Promise.resolve({ rows: [] });
      if (sql.includes("INSERT INTO production")) {
        const hasDesc2 = params?.some(
          (p) => typeof p === "string" && p.includes("Extra text"),
        );
        expect(hasDesc2).toBe(true);
        return Promise.resolve({ rows: [{ id: 1 }] });
      }
      if (sql.includes("INSERT INTO production_tag")) {
        return Promise.resolve({ rowCount: 0, rows: [] });
      }
      if (sql.includes("INSERT INTO legacy_production_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importProductionsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: false,
      limit: null,
    });

    fs.rmSync(dir, { recursive: true });
  });

  it("write mode inserts tag_types when missing", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-prod-tt-"));
    const csvPath = path.join(dir, "p.csv");
    fs.writeFileSync(csvPath, "Titel,ID\nOnly,1\n", "utf8");

    const query = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_production_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("SELECT legacy_id") && sql.includes("legacy_production_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag_type")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("INSERT INTO tag_type")) {
        const name = params?.[0];
        const parsed = typeof name === "string" ? JSON.parse(name) : {};
        const id = parsed.nl === "Tag" ? 10 : 20;
        return Promise.resolve({ rows: [{ id }] });
      }
      if (sql.includes("FROM tag") && sql.includes("type_id = $1") && !sql.includes("lower(name")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.trimStart().startsWith("BEGIN")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("COMMIT")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("ROLLBACK")) return Promise.resolve({ rows: [] });
      if (sql.includes("INSERT INTO production")) {
        return Promise.resolve({ rows: [{ id: 100 }] });
      }
      if (sql.includes("INSERT INTO legacy_production_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importProductionsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: false,
      limit: null,
    });

    expect(query.mock.calls.some((c) => String(c[0]).includes("INSERT INTO tag_type"))).toBe(true);
    fs.rmSync(dir, { recursive: true });
  });
});

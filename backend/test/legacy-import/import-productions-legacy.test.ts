import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import z from "zod";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type pg from "pg";
import { CreateProductionBodySchema } from "@/routes/production/handlers/body-schema.js";
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
      if (sql.includes("FROM production p")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag_type")) {
        const name = params?.[0];
        if (name === "Tag") return Promise.resolve({ rows: [{ id: 10 }] });
        if (name === "Genre") return Promise.resolve({ rows: [{ id: 20 }] });
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("tag_type = $1") && !sql.includes("jsonb_each_text(name)")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("jsonb_each_text(name)")) {
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

  it("write mode inserts new production when multiple rows match title and artist (ambiguous)", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-prod-amb-"));
    const csvPath = path.join(dir, "p.csv");
    fs.writeFileSync(csvPath, "Titel,Ondertitel,ID,Genre\nAmbiguous,A,900,Drama\n", "utf8");

    const query = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_production_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("SELECT legacy_id") && sql.includes("legacy_production_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM production p")) {
        return Promise.resolve({ rows: [{ id: 10 }, { id: 11 }] });
      }
      if (sql.includes("FROM tag_type")) {
        const name = params?.[0];
        if (name === "Tag") return Promise.resolve({ rows: [{ id: 10 }] });
        if (name === "Genre") return Promise.resolve({ rows: [{ id: 20 }] });
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("tag_type = $1") && !sql.includes("jsonb_each_text(name)")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("jsonb_each_text(name)")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.trimStart().startsWith("BEGIN")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("COMMIT")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("ROLLBACK")) return Promise.resolve({ rows: [] });
      if (sql.includes("INSERT INTO production")) {
        return Promise.resolve({ rows: [{ id: 1001 }] });
      }
      if (sql.includes("INSERT INTO production_tag")) {
        return Promise.resolve({ rowCount: 0, rows: [] });
      }
      if (sql.includes("INSERT INTO legacy_production_import_map")) {
        expect(String(sql)).toContain("created_new_production");
        expect(String(sql)).toContain("true");
        expect(params).toEqual(["productions-output-csv", "900", 1001]);
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importProductionsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: false,
      limit: null,
    });

    expect(query.mock.calls.some((c) => String(c[0]).includes("INSERT INTO production"))).toBe(true);
    fs.rmSync(dir, { recursive: true });
  });

  it("write mode maps legacy id to existing production when title and artist match, without inserting production", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-prod-dedupe-"));
    const csvPath = path.join(dir, "p.csv");
    fs.writeFileSync(csvPath, "Titel,ID,Genre\nSame Show,501,Drama\n", "utf8");

    const query = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_production_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("SELECT legacy_id") && sql.includes("legacy_production_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM production p")) {
        return Promise.resolve({ rows: [{ id: 777 }] });
      }
      if (sql.includes("FROM tag_type")) {
        const name = params?.[0];
        if (name === "Tag") return Promise.resolve({ rows: [{ id: 10 }] });
        if (name === "Genre") return Promise.resolve({ rows: [{ id: 20 }] });
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("tag_type = $1") && !sql.includes("jsonb_each_text(name)")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("INSERT INTO legacy_production_import_map")) {
        expect(String(sql)).toContain("false");
        expect(params).toEqual(["productions-output-csv", "501", 777]);
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importProductionsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: false,
      limit: null,
    });

    const prodInserts = query.mock.calls.filter((c) => String(c[0]).includes("INSERT INTO production"));
    expect(prodInserts.length).toBe(0);
    const mapInsert = query.mock.calls.find((c) => String(c[0]).includes("INSERT INTO legacy_production_import_map"));
    expect(mapInsert).toBeDefined();
    expect(mapInsert?.[1]).toEqual(["productions-output-csv", "501", 777]);
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
      if (sql.includes("FROM production p")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag_type")) {
        const name = params?.[0];
        if (name === "Tag") return Promise.resolve({ rows: [{ id: 10 }] });
        if (name === "Genre") return Promise.resolve({ rows: [{ id: 20 }] });
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("tag_type = $1") && !sql.includes("jsonb_each_text(name)")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("jsonb_each_text(name)")) {
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
      if (sql.includes("FROM production p")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag_type")) {
        const name = params?.[0];
        if (name === "Tag") return Promise.resolve({ rows: [{ id: 10 }] });
        if (name === "Genre") return Promise.resolve({ rows: [{ id: 20 }] });
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("tag_type = $1") && !sql.includes("jsonb_each_text(name)")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("jsonb_each_text(name)")) {
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
      if (sql.includes("FROM production p")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("tag_type = $1") && !sql.includes("jsonb_each_text(name)")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("jsonb_each_text(name)")) {
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

  it("dry-run skips when production body validation fails", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-prod-zod-prod"));
    const csvPath = path.join(dir, "p.csv");
    fs.writeFileSync(csvPath, "Titel,ID\nBad,1\n", "utf8");

    const failed = z.string().safeParse(1);
    expect(failed.success).toBe(false);
    if (failed.success) throw new Error("expected fail");
    vi.spyOn(CreateProductionBodySchema, "safeParse").mockReturnValueOnce(
      failed as unknown as ReturnType<typeof CreateProductionBodySchema.safeParse>,
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("FROM tag_type")) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    await importProductionsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: true,
      limit: null,
    });
    fs.rmSync(dir, { recursive: true });
  });

  it("dry-run maps legacy id to existing production when exactly one title+artist match (ln 294-296)", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-prod-drymap-"));
    const csvPath = path.join(dir, "p.csv");
    fs.writeFileSync(csvPath, "Titel,ID,Genre\nExisting Show,77,Drama\n", "utf8");

    const query = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("FROM tag_type")) {
        const name = params?.[0];
        if (name === "Tag") return Promise.resolve({ rows: [{ id: 10 }] });
        if (name === "Genre") return Promise.resolve({ rows: [{ id: 20 }] });
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("tag_type = $1")) return Promise.resolve({ rows: [] });
      // Exactly one matching production → dry-run maps without inserting
      if (sql.includes("FROM production p")) return Promise.resolve({ rows: [{ id: 42 }] });
      return Promise.resolve({ rows: [] });
    });

    await importProductionsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: true,
      limit: null,
    });

    // In dry-run, no INSERT INTO legacy_production_import_map should occur
    expect(query.mock.calls.some((c) => String(c[0]).includes("INSERT INTO legacy_production_import_map"))).toBe(false);
    fs.rmSync(dir, { recursive: true });
  });

  it("dry-run counts createdGenreTags for new genre not in cache (ln 319-321)", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-prod-drygenre-"));
    const csvPath = path.join(dir, "p.csv");
    // Two rows: same genre → second hit is cache hit (ln 319 false branch); first is cache miss
    fs.writeFileSync(csvPath, "Titel,ID,Genre\nShowA,1,Jazz\nShowB,2,Jazz\n", "utf8");

    const query = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("FROM tag_type")) {
        const name = params?.[0];
        if (name === "Tag") return Promise.resolve({ rows: [{ id: 10 }] });
        if (name === "Genre") return Promise.resolve({ rows: [{ id: 20 }] });
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("tag_type = $1")) return Promise.resolve({ rows: [] });
      if (sql.includes("FROM production p")) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    await importProductionsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: true,
      limit: null,
    });

    // No DB writes in dry-run, but both rows should complete
    expect(query.mock.calls.some((c) => String(c[0]).includes("INSERT INTO"))).toBe(false);
    fs.rmSync(dir, { recursive: true });
  });

  it("write mode skips row when genre tag validation fails (ln 277-287)", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-prod-tagzod-"));
    const csvPath = path.join(dir, "p.csv");
    fs.writeFileSync(csvPath, "Titel,ID,Genre\nTagFail,1,BadGenre\n", "utf8");

    const failed = z.string().safeParse(1);
    expect(failed.success).toBe(false);
    if (failed.success) throw new Error("expected fail");

    // Need to import LegacyTagCreateBodySchema to spy on it
    const validate = await import("@/legacy-import/validate-legacy-inserts.js");
    vi.spyOn(validate.LegacyTagCreateBodySchema, "safeParse").mockReturnValueOnce(
      failed as unknown as ReturnType<typeof validate.LegacyTagCreateBodySchema.safeParse>,
    );

    const query = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("FROM tag_type")) {
        const name = params?.[0];
        if (name === "Tag") return Promise.resolve({ rows: [{ id: 10 }] });
        if (name === "Genre") return Promise.resolve({ rows: [{ id: 20 }] });
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("tag_type = $1")) return Promise.resolve({ rows: [] });
      if (sql.includes("FROM production p")) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    await importProductionsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: true,
      limit: null,
    });

    expect(query.mock.calls.some((c) => String(c[0]).includes("INSERT INTO production"))).toBe(false);
    fs.rmSync(dir, { recursive: true });
  });

  it("write mode reuses cached genre tag for second occurrence (ln 117)", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-prod-cachetag-"));
    const csvPath = path.join(dir, "p.csv");
    // Two productions with the same genre → second should hit genreTagCache
    fs.writeFileSync(csvPath, "Titel,ID,Genre\nShowA,1,Jazz\nShowB,2,Jazz\n", "utf8");

    const query = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_production_import_map")) return Promise.resolve({ rows: [] });
      if (sql.includes("SELECT legacy_id") && sql.includes("legacy_production_import_map")) return Promise.resolve({ rows: [] });
      if (sql.includes("FROM tag_type")) {
        const name = params?.[0];
        if (name === "Tag") return Promise.resolve({ rows: [{ id: 10 }] });
        if (name === "Genre") return Promise.resolve({ rows: [{ id: 20 }] });
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("tag_type = $1") && !sql.includes("jsonb_each_text")) return Promise.resolve({ rows: [] });
      if (sql.includes("jsonb_each_text") && sql.includes("FROM tag")) return Promise.resolve({ rows: [] });
      if (sql.includes("FROM production p")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("BEGIN")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("COMMIT")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("ROLLBACK")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("INSERT INTO tag (")) return Promise.resolve({ rows: [{ id: 55 }] });
      if (sql.includes("INSERT INTO production")) return Promise.resolve({ rows: [{ id: 100 }] });
      if (sql.includes("INSERT INTO production_tag")) return Promise.resolve({ rowCount: 1, rows: [] });
      if (sql.includes("INSERT INTO legacy_production_import_map")) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    await importProductionsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: false,
      limit: null,
    });

    // INSERT INTO tag should only happen once — second production reused the cache
    const tagInserts = query.mock.calls.filter((c) => String(c[0]).trimStart().startsWith("INSERT INTO tag ("));
    expect(tagInserts).toHaveLength(1);
    fs.rmSync(dir, { recursive: true });
  });

  it("write mode skips already-imported legacy id (ln 249-251)", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-prod-skipimp-"));
    const csvPath = path.join(dir, "p.csv");
    fs.writeFileSync(csvPath, "Titel,ID\nAlready,1\n", "utf8");

    const query = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_production_import_map")) return Promise.resolve({ rows: [] });
      if (sql.includes("SELECT legacy_id") && sql.includes("legacy_production_import_map")) {
        return Promise.resolve({ rows: [{ legacy_id: "1" }] });
      }
      if (sql.includes("FROM tag_type")) {
        const name = params?.[0];
        if (name === "Tag") return Promise.resolve({ rows: [{ id: 10 }] });
        if (name === "Genre") return Promise.resolve({ rows: [{ id: 20 }] });
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("tag_type = $1")) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    await importProductionsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: false,
      limit: null,
    });

    expect(query.mock.calls.some((c) => String(c[0]).includes("INSERT INTO production"))).toBe(false);
    fs.rmSync(dir, { recursive: true });
  });

  it("write mode skips row with no legacy id (ln 239-241)", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-prod-noid-"));
    const csvPath = path.join(dir, "p.csv");
    fs.writeFileSync(csvPath, "Titel,ID\nNoId,\n", "utf8");

    const query = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_production_import_map")) return Promise.resolve({ rows: [] });
      if (sql.includes("SELECT legacy_id") && sql.includes("legacy_production_import_map")) return Promise.resolve({ rows: [] });
      if (sql.includes("FROM tag_type")) {
        const name = params?.[0];
        if (name === "Tag") return Promise.resolve({ rows: [{ id: 10 }] });
        if (name === "Genre") return Promise.resolve({ rows: [{ id: 20 }] });
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("tag_type = $1")) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    await importProductionsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: false,
      limit: null,
    });

    expect(query.mock.calls.some((c) => String(c[0]).includes("INSERT INTO production"))).toBe(false);
    fs.rmSync(dir, { recursive: true });
  });

  it("write mode catches error when mapping legacy id to existing production fails (ln 308-309)", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-prod-mapfail-"));
    const csvPath = path.join(dir, "p.csv");
    fs.writeFileSync(csvPath, "Titel,ID\nMapFail,1\n", "utf8");

    const query = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_production_import_map")) return Promise.resolve({ rows: [] });
      if (sql.includes("SELECT legacy_id") && sql.includes("legacy_production_import_map")) return Promise.resolve({ rows: [] });
      if (sql.includes("FROM tag_type")) {
        const name = params?.[0];
        if (name === "Tag") return Promise.resolve({ rows: [{ id: 10 }] });
        if (name === "Genre") return Promise.resolve({ rows: [{ id: 20 }] });
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("tag_type = $1")) return Promise.resolve({ rows: [] });
      if (sql.includes("FROM production p")) return Promise.resolve({ rows: [{ id: 42 }] });
      if (sql.includes("INSERT INTO legacy_production_import_map")) return Promise.reject(new Error("map insert failed"));
      return Promise.resolve({ rows: [] });
    });

    await importProductionsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: false,
      limit: null,
    });

    expect(query.mock.calls.some((c) => String(c[0]).includes("INSERT INTO legacy_production_import_map"))).toBe(true);
    fs.rmSync(dir, { recursive: true });
  });

  it("write mode finds genre tag in DB (not cache) and reuses it (ln 124-126)", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-prod-tagdb-"));
    const csvPath = path.join(dir, "p.csv");
    fs.writeFileSync(csvPath, "Titel,ID,Genre\nDbTag,1,Jazz\n", "utf8");

    const query = vi.fn().mockImplementation((sql: string, params?: unknown[]) => {
      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_production_import_map")) return Promise.resolve({ rows: [] });
      if (sql.includes("SELECT legacy_id") && sql.includes("legacy_production_import_map")) return Promise.resolve({ rows: [] });
      if (sql.includes("FROM tag_type")) {
        const name = params?.[0];
        if (name === "Tag") return Promise.resolve({ rows: [{ id: 10 }] });
        if (name === "Genre") return Promise.resolve({ rows: [{ id: 20 }] });
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("FROM tag") && sql.includes("tag_type = $1") && !sql.includes("jsonb_each_text")) return Promise.resolve({ rows: [] });
      if (sql.includes("jsonb_each_text") && sql.includes("FROM tag")) return Promise.resolve({ rows: [{ id: 77 }] });
      if (sql.includes("FROM production p")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("BEGIN")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("COMMIT")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("ROLLBACK")) return Promise.resolve({ rows: [] });
      if (sql.includes("INSERT INTO production")) return Promise.resolve({ rows: [{ id: 100 }] });
      if (sql.includes("INSERT INTO production_tag")) return Promise.resolve({ rowCount: 1, rows: [] });
      if (sql.includes("INSERT INTO legacy_production_import_map")) return Promise.resolve({ rows: [] });
      return Promise.resolve({ rows: [] });
    });

    await importProductionsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: false,
      limit: null,
    });

    // Tag was found in DB so no INSERT INTO tag
    expect(query.mock.calls.some((c) => String(c[0]).trimStart().startsWith("INSERT INTO tag ("))).toBe(false);
    expect(query.mock.calls.some((c) => String(c[0]).includes("INSERT INTO production"))).toBe(true);
    fs.rmSync(dir, { recursive: true });
  });

  it("splitGenres ignores empty parts after splitting on comma (else branch ln 39)", () => {
    expect(splitGenres("Jazz, ")).toEqual(["Jazz"]);
    expect(splitGenres(", Drama")).toEqual(["Drama"]);
  });
});
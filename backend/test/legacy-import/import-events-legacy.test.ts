import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type pg from "pg";
import z from "zod";
import { EventCreateSchema } from "@/routes/event/handlers/helper.js";
import * as validate from "@/legacy-import/validate-legacy-inserts.js";
import {
  calendarDateBrussels,
  hallKey,
  importEventsLegacy,
  LEGACY_EVENT_IMPORT_SOURCE,
  LEGACY_EVENT_PRODUCTION_MAP_SOURCE,
  makeLegacyKey,
  parseCsvDate,
  parseHall,
} from "@/legacy-import/import-events-legacy.js";

describe("LEGACY_EVENT_* constants", () => {
  it("use expected source strings", () => {
    expect(LEGACY_EVENT_IMPORT_SOURCE).toBe("events-voorstellingen-csv");
    expect(LEGACY_EVENT_PRODUCTION_MAP_SOURCE).toBe("productions-output-csv");
  });
});

describe("parseCsvDate", () => {
  it("returns null for empty and sentinels", () => {
    expect(parseCsvDate("")).toBeNull();
    expect(parseCsvDate("0000-00-00 00:00:00")).toBeNull();
    expect(parseCsvDate("1970-01-01 00:00:00")).toBeNull();
  });

  it("parses legacy datetime to UTC", () => {
    const d = parseCsvDate("2024-06-01 14:30:00");
    expect(d).not.toBeNull();
    expect(d!.toISOString()).toContain("2024-06-01");
  });
});

describe("parseHall", () => {
  it("returns null for empty", () => {
    expect(parseHall("")).toBeNull();
  });

  it("parses name only", () => {
    expect(parseHall("  Main hall  ")).toEqual({ name: "Main hall", address: "" });
  });

  it("parses name and address", () => {
    expect(parseHall("Theater, Street 1")).toEqual({ name: "Theater", address: "Street 1" });
  });

  it("returns null when name part empty", () => {
    expect(parseHall(",only address")).toBeNull();
  });
});

describe("makeLegacyKey", () => {
  it("is stable for same row fields", () => {
    const row = {
      starttime: "2024-01-01 10:00:00",
      endtime: "2024-01-01 12:00:00",
      hall: "A,B",
      production: "p1",
    };
    expect(makeLegacyKey(row)).toBe(makeLegacyKey(row));
  });
});

describe("hallKey", () => {
  it("lowercases trimmed name", () => {
    expect(hallKey("  Zaal  ")).toBe("zaal");
  });
});

describe("calendarDateBrussels", () => {
  it("uses Europe/Brussels calendar date for UTC instant", () => {
    const d = new Date("2024-06-01T22:00:00.000Z");
    expect(calendarDateBrussels(d)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("importEventsLegacy", () => {
  const makeClient = (query: pg.Client["query"]) =>
    ({ query }) as unknown as pg.Client;

  function writeProductionsCsv(dir: string, lines: string[]): string {
    const p = path.join(dir, "productions.csv");
    fs.writeFileSync(p, lines.join("\n"), "utf8");
    return p;
  }

  /** Title/artist dedupe + Brussels calendar-day EXISTS (must run before other SQL branches in mocks). */
  function handleProductionDedupeQueries(
    sql: string,
    listProductionRows: { id: number }[],
    duplicateDayExists: boolean,
  ): { rows: unknown[] } | undefined {
    if (sql.includes("FROM production p") && sql.includes("ORDER BY p.id")) {
      return { rows: listProductionRows };
    }
    if (sql.includes("unnest($1::date[])") && sql.includes("FROM event e")) {
      return { rows: [{ exists: duplicateDayExists }] };
    }
    return undefined;
  }

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when legacy_production_import_map table is missing", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ exists: null }] });
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-no-map-"));
    const prodCsv = writeProductionsCsv(dir, ["Titel,ID", "X,p1"]);
    fs.writeFileSync(path.join(dir, "e.csv"), "Starttime,Hall,Production\n", "utf8");
    await expect(
      importEventsLegacy(makeClient(query), {
        filePath: path.join(dir, "e.csv"),
        dryRun: true,
        limit: null,
        productionsFilePath: prodCsv,
      }),
    ).rejects.toThrow("legacy_production_import_map");
    fs.rmSync(dir, { recursive: true });
  });

  it("throws when production map is empty", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-empty-map-"));
    const prodCsv = writeProductionsCsv(dir, ["Titel,ID", "X,p1"]);
    fs.writeFileSync(path.join(dir, "e.csv"), "Starttime,Hall,Production\n2024-01-01 10:00:00,Main,p1\n", "utf8");

    const query = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await expect(
      importEventsLegacy(makeClient(query), {
        filePath: path.join(dir, "e.csv"),
        dryRun: true,
        limit: null,
        productionsFilePath: prodCsv,
      }),
    ).rejects.toThrow("No production mappings");
    fs.rmSync(dir, { recursive: true });
  });

  it("dry-run processes a valid row", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-"));
    const csvPath = path.join(dir, "e.csv");
    const prodCsv = writeProductionsCsv(dir, ["Titel,ID,Ondertitel", "My Show,p1,"]);
    fs.writeFileSync(
      csvPath,
      "Starttime,Endtime,Hall,Production\n2024-01-01 10:00:00,,Main,p1\n",
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({
          rows: [{ legacy_id: "p1", production_id: 1, created_new_production: false }],
        });
      }
      const dedupe = handleProductionDedupeQueries(sql, [{ id: 1 }], false);
      if (dedupe) return Promise.resolve(dedupe);
      if (sql.includes("FROM hall") && sql.includes("SELECT id")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: true,
      limit: null,
      productionsFilePath: prodCsv,
    });

    expect(query).toHaveBeenCalled();
    fs.rmSync(dir, { recursive: true });
  });

  it("write mode inserts event and legacy map", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-w-"));
    const csvPath = path.join(dir, "e.csv");
    const prodCsv = writeProductionsCsv(dir, ["Titel,ID,Ondertitel", "Zaaltje Show,p9,"]);
    fs.writeFileSync(
      csvPath,
      "Starttime,Endtime,Hall,Production\n2024-02-01 20:00:00,,Zaaltje,p9\n",
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      const dedupe = handleProductionDedupeQueries(sql, [{ id: 7 }], false);
      if (dedupe) return Promise.resolve(dedupe);

      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_event_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({
          rows: [{ legacy_id: "p9", production_id: 7, created_new_production: false }],
        });
      }
      if (sql.includes("FROM hall") && sql.includes("SELECT id") && !sql.includes("UPDATE")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("SELECT legacy_key") && sql.includes("legacy_event_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.trimStart().startsWith("BEGIN")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("COMMIT")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("ROLLBACK")) return Promise.resolve({ rows: [] });
      if (sql.includes("INSERT INTO hall")) {
        return Promise.resolve({ rows: [{ id: 3 }] });
      }
      if (sql.includes("INSERT INTO event")) {
        return Promise.resolve({ rows: [{ id: 88 }] });
      }
      if (sql.includes("INSERT INTO legacy_event_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: false,
      limit: null,
      productionsFilePath: prodCsv,
    });

    expect(query.mock.calls.some((c) => String(c[0]).includes("INSERT INTO event"))).toBe(true);
    fs.rmSync(dir, { recursive: true });
  });

  it("rolls back on failure inside transaction", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-fail-"));
    const csvPath = path.join(dir, "e.csv");
    const prodCsv = writeProductionsCsv(dir, ["Titel,ID,Ondertitel", "Fail Show,p9,"]);
    fs.writeFileSync(
      csvPath,
      "Starttime,Hall,Production\n2024-03-01 18:00:00,X,p9\n",
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      const dedupe = handleProductionDedupeQueries(sql, [{ id: 7 }], false);
      if (dedupe) return Promise.resolve(dedupe);

      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_event_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({
          rows: [{ legacy_id: "p9", production_id: 7, created_new_production: false }],
        });
      }
      if (sql.includes("FROM hall") && sql.includes("SELECT id")) {
        return Promise.resolve({ rows: [{ id: 1, name: "X", address: "" }] });
      }
      if (sql.includes("SELECT legacy_key")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.trimStart().startsWith("BEGIN")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("ROLLBACK")) return Promise.resolve({ rows: [] });
      if (sql.includes("INSERT INTO event")) {
        return Promise.reject(new Error("fail event"));
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: false,
      limit: null,
      productionsFilePath: prodCsv,
    });

    expect(query.mock.calls.some((c) => String(c[0]).trimStart().startsWith("ROLLBACK"))).toBe(true);
    fs.rmSync(dir, { recursive: true });
  });

  it("dry-run skips second row when duplicate legacy key in file", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-dup-"));
    const csvPath = path.join(dir, "e.csv");
    const prodCsv = writeProductionsCsv(dir, ["Titel,ID,Ondertitel", "Dup,p1,"]);
    const line = "2024-01-01 10:00:00,,Main,p1\n";
    fs.writeFileSync(csvPath, `Starttime,Endtime,Hall,Production\n${line}${line}`, "utf8");

    const query = vi.fn().mockImplementation((sql: string) => {
      const dedupe = handleProductionDedupeQueries(sql, [{ id: 1 }], false);
      if (dedupe) return Promise.resolve(dedupe);

      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({
          rows: [{ legacy_id: "p1", production_id: 1, created_new_production: false }],
        });
      }
      if (sql.includes("FROM hall") && sql.includes("SELECT id")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: true,
      limit: null,
      productionsFilePath: prodCsv,
    });

    fs.rmSync(dir, { recursive: true });
  });

  it("write mode skips row already in legacy_event_import_map", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-imp-"));
    const csvPath = path.join(dir, "e.csv");
    const prodCsv = writeProductionsCsv(dir, ["Titel,ID,Ondertitel", "Imp,p1,"]);
    fs.writeFileSync(
      csvPath,
      "Starttime,Endtime,Hall,Production\n2024-01-01 10:00:00,,Main,p1\n",
      "utf8",
    );

    const key = makeLegacyKey({
      starttime: "2024-01-01 10:00:00",
      endtime: "",
      hall: "Main",
      production: "p1",
    });

    const query = vi.fn().mockImplementation((sql: string) => {
      const dedupe = handleProductionDedupeQueries(sql, [{ id: 1 }], false);
      if (dedupe) return Promise.resolve(dedupe);

      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_event_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({
          rows: [{ legacy_id: "p1", production_id: 1, created_new_production: false }],
        });
      }
      if (sql.includes("name->>'nl' AS name") && sql.includes("FROM hall")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("SELECT legacy_key") && sql.includes("legacy_event_import_map")) {
        return Promise.resolve({ rows: [{ legacy_key: key }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: false,
      limit: null,
      productionsFilePath: prodCsv,
    });

    expect(
      query.mock.calls.some((c) => String(c[0]).includes("INSERT INTO event")),
    ).toBe(false);

    fs.rmSync(dir, { recursive: true });
  });

  it("dry-run skips row with missing starttime", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-"));
    const csvPath = path.join(dir, "e.csv");
    const prodCsv = writeProductionsCsv(dir, ["Titel,ID,Ondertitel", "Ms,p1,"]);
    fs.writeFileSync(
      csvPath,
      "Starttime,Endtime,Hall,Production\n,,Main,p1\n",
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      const dedupe = handleProductionDedupeQueries(sql, [{ id: 1 }], false);
      if (dedupe) return Promise.resolve(dedupe);

      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({
          rows: [{ legacy_id: "p1", production_id: 1, created_new_production: false }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: true,
      limit: null,
      productionsFilePath: prodCsv,
    });

    fs.rmSync(dir, { recursive: true });
  });

  it("dry-run skips row with missing hall", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-"));
    const csvPath = path.join(dir, "e.csv");
    const prodCsv = writeProductionsCsv(dir, ["Titel,ID,Ondertitel", "Mh,p1,"]);
    fs.writeFileSync(
      csvPath,
      "Starttime,Endtime,Hall,Production\n2024-01-01 10:00:00,,,p1\n",
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      const dedupe = handleProductionDedupeQueries(sql, [{ id: 1 }], false);
      if (dedupe) return Promise.resolve(dedupe);

      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({
          rows: [{ legacy_id: "p1", production_id: 1, created_new_production: false }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: true,
      limit: null,
      productionsFilePath: prodCsv,
    });

    fs.rmSync(dir, { recursive: true });
  });

  it("dry-run skips row with missing production legacy id", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-"));
    const csvPath = path.join(dir, "e.csv");
    const prodCsv = writeProductionsCsv(dir, ["Titel,ID,Ondertitel", "Mp,p1,"]);
    fs.writeFileSync(
      csvPath,
      "Starttime,Endtime,Hall,Production\n2024-01-01 10:00:00,,Main,\n",
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      const dedupe = handleProductionDedupeQueries(sql, [{ id: 1 }], false);
      if (dedupe) return Promise.resolve(dedupe);

      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({
          rows: [{ legacy_id: "p1", production_id: 1, created_new_production: false }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: true,
      limit: null,
      productionsFilePath: prodCsv,
    });

    fs.rmSync(dir, { recursive: true });
  });

  it("dry-run skips row when production mapping is unknown", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-"));
    const csvPath = path.join(dir, "e.csv");
    const prodCsv = writeProductionsCsv(dir, ["Titel,ID,Ondertitel", "Unk,p1,"]);
    fs.writeFileSync(
      csvPath,
      "Starttime,Endtime,Hall,Production\n2024-01-01 10:00:00,,Main,unknown\n",
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      const dedupe = handleProductionDedupeQueries(sql, [{ id: 1 }], false);
      if (dedupe) return Promise.resolve(dedupe);

      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({
          rows: [{ legacy_id: "p1", production_id: 1, created_new_production: false }],
        });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: true,
      limit: null,
      productionsFilePath: prodCsv,
    });

    fs.rmSync(dir, { recursive: true });
  });

  it("dry-run skips row when hall insert schema rejects", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-"));
    const csvPath = path.join(dir, "e.csv");
    const prodCsv = writeProductionsCsv(dir, ["Titel,ID,Ondertitel", "Hallrej,p1,"]);
    fs.writeFileSync(
      csvPath,
      "Starttime,Endtime,Hall,Production\n2024-01-01 10:00:00,,Main,p1\n",
      "utf8",
    );

    const failed = z.string().safeParse(1);
    expect(failed.success).toBe(false);
    if (failed.success) throw new Error("expected fail");
    vi.spyOn(validate.LegacyHallInsertSchema, "safeParse").mockReturnValueOnce(
      failed as unknown as ReturnType<typeof validate.LegacyHallInsertSchema.safeParse>,
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      const dedupe = handleProductionDedupeQueries(sql, [{ id: 1 }], false);
      if (dedupe) return Promise.resolve(dedupe);

      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({
          rows: [{ legacy_id: "p1", production_id: 1, created_new_production: false }],
        });
      }
      if (sql.includes("FROM hall") && sql.includes("SELECT id")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: true,
      limit: null,
      productionsFilePath: prodCsv,
    });

    fs.rmSync(dir, { recursive: true });
  });

  it("dry-run skips row when event create schema rejects", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-"));
    const csvPath = path.join(dir, "e.csv");
    const prodCsv = writeProductionsCsv(dir, ["Titel,ID,Ondertitel", "Evrej,p1,"]);
    fs.writeFileSync(
      csvPath,
      "Starttime,Endtime,Hall,Production\n2024-01-01 10:00:00,,Main,p1\n",
      "utf8",
    );

    const failed = z.string().safeParse(1);
    expect(failed.success).toBe(false);
    if (failed.success) throw new Error("expected fail");
    vi.spyOn(EventCreateSchema, "safeParse").mockReturnValueOnce(
      failed as unknown as ReturnType<typeof EventCreateSchema.safeParse>,
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      const dedupe = handleProductionDedupeQueries(sql, [{ id: 1 }], false);
      if (dedupe) return Promise.resolve(dedupe);

      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({
          rows: [{ legacy_id: "p1", production_id: 1, created_new_production: false }],
        });
      }
      if (sql.includes("FROM hall") && sql.includes("SELECT id")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: true,
      limit: null,
      productionsFilePath: prodCsv,
    });

    fs.rmSync(dir, { recursive: true });
  });

  it("write mode updates hall address when existing hall has none", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-addr-"));
    const csvPath = path.join(dir, "e.csv");
    const prodCsv = writeProductionsCsv(dir, ["Titel,ID,Ondertitel", "Addr,p9,"]);
    fs.writeFileSync(
      csvPath,
      "Starttime,Endtime,Hall,Production\n2024-05-01 19:00:00,,\"Theater, New Street 9\",p9\n",
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      const dedupe = handleProductionDedupeQueries(sql, [{ id: 7 }], false);
      if (dedupe) return Promise.resolve(dedupe);

      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_event_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({
          rows: [{ legacy_id: "p9", production_id: 7, created_new_production: false }],
        });
      }
      if (sql.includes("SELECT id, name FROM hall")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("jsonb_each_text(name)") && sql.includes("FROM hall")) {
        return Promise.resolve({ rows: [{ id: 10, address: null }] });
      }
      if (sql.includes("UPDATE hall SET address")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("SELECT legacy_key") && sql.includes("legacy_event_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.trimStart().startsWith("BEGIN")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("COMMIT")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("ROLLBACK")) return Promise.resolve({ rows: [] });
      if (sql.includes("INSERT INTO event")) {
        return Promise.resolve({ rows: [{ id: 1 }] });
      }
      if (sql.includes("INSERT INTO legacy_event_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: false,
      limit: null,
      productionsFilePath: prodCsv,
    });

    expect(query.mock.calls.some((c) => String(c[0]).includes("UPDATE hall SET address"))).toBe(true);
    fs.rmSync(dir, { recursive: true });
  });

  it("write mode skips events and deletes orphan production when calendar day matches API", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-fulldup-"));
    const csvPath = path.join(dir, "e.csv");
    const prodCsv = writeProductionsCsv(dir, ["Titel,ID,Ondertitel", "Dup Show,leg1,"]);
    fs.writeFileSync(
      csvPath,
      "Starttime,Endtime,Hall,Production\n2024-06-15 20:00:00,,Main,leg1\n",
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      const dedupe = handleProductionDedupeQueries(sql, [{ id: 5 }, { id: 99 }], true);
      if (dedupe) return Promise.resolve(dedupe);

      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_event_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({
          rows: [{ legacy_id: "leg1", production_id: 99, created_new_production: true }],
        });
      }
      if (sql.includes("DELETE FROM production")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("SELECT legacy_key") && sql.includes("legacy_event_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: false,
      limit: null,
      productionsFilePath: prodCsv,
    });

    expect(query.mock.calls.some((c) => String(c[0]).includes("DELETE FROM production"))).toBe(true);
    expect(
      query.mock.calls.some((c) => String(c[0]).includes("INSERT INTO event")),
    ).toBe(false);
    fs.rmSync(dir, { recursive: true });
  });

  it("throws when default productions CSV path does not exist (no productionsFilePath)", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-no-default-prod"));
    const csvPath = path.join(dir, "e.csv");
    fs.writeFileSync(csvPath, "Starttime,Hall,Production\n2024-01-01 10:00:00,Main,p1\n", "utf8");

    const existsSpy = vi.spyOn(fs, "existsSync").mockReturnValue(false);

    const query = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await expect(
      importEventsLegacy(makeClient(query), {
        filePath: csvPath,
        dryRun: true,
        limit: null,
      }),
    ).rejects.toThrow("Productions CSV not found");

    existsSpy.mockRestore();
    fs.rmSync(dir, { recursive: true });
  });

  it("write mode counts failed row when orphan delete rejects", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-del-fail"));
    const csvPath = path.join(dir, "e.csv");
    const prodCsv = writeProductionsCsv(dir, ["Titel,ID,Ondertitel", "Dup2,leg2,"]);
    fs.writeFileSync(
      csvPath,
      "Starttime,Endtime,Hall,Production\n2024-06-15 20:00:00,,Main,leg2\n",
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      const dedupe = handleProductionDedupeQueries(sql, [{ id: 5 }, { id: 99 }], true);
      if (dedupe) return Promise.resolve(dedupe);

      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_event_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({
          rows: [{ legacy_id: "leg2", production_id: 99, created_new_production: true }],
        });
      }
      if (sql.includes("DELETE FROM production")) {
        return Promise.reject(new Error("fk or permission"));
      }
      if (sql.includes("SELECT legacy_key") && sql.includes("legacy_event_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: false,
      limit: null,
      productionsFilePath: prodCsv,
    });

    expect(query.mock.calls.some((c) => String(c[0]).includes("DELETE FROM production"))).toBe(true);
    fs.rmSync(dir, { recursive: true });
  });

  it("write mode rolls back when hall insert returns no id", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-hall-null"));
    const csvPath = path.join(dir, "e.csv");
    const prodCsv = writeProductionsCsv(dir, ["Titel,ID,Ondertitel", "HallNull,pz,"]);
    fs.writeFileSync(
      csvPath,
      "Starttime,Endtime,Hall,Production\n2024-02-01 20:00:00,,Zaaltje,pz\n",
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      const dedupe = handleProductionDedupeQueries(sql, [{ id: 7 }], false);
      if (dedupe) return Promise.resolve(dedupe);

      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_event_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({
          rows: [{ legacy_id: "pz", production_id: 7, created_new_production: false }],
        });
      }
      if (sql.includes("FROM hall") && sql.includes("SELECT id") && !sql.includes("UPDATE")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("jsonb_each_text(name)") && sql.includes("FROM hall")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("SELECT legacy_key") && sql.includes("legacy_event_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.trimStart().startsWith("BEGIN")) return Promise.resolve({ rows: [] });
      if (sql.trimStart().startsWith("ROLLBACK")) return Promise.resolve({ rows: [] });
      if (sql.includes("INSERT INTO hall")) {
        return Promise.resolve({ rows: [{ id: null as unknown as number }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), {
      filePath: csvPath,
      dryRun: false,
      limit: null,
      productionsFilePath: prodCsv,
    });

    expect(query.mock.calls.some((c) => String(c[0]).trimStart().startsWith("ROLLBACK"))).toBe(true);
    fs.rmSync(dir, { recursive: true });
  });
});

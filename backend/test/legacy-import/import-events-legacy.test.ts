import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type pg from "pg";
import z from "zod";
import { EventCreateSchema } from "@/routes/event/handlers/helper.js";
import * as validate from "@/legacy-import/validate-legacy-inserts.js";
import {
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

describe("importEventsLegacy", () => {
  const makeClient = (query: pg.Client["query"]) =>
    ({ query }) as unknown as pg.Client;

  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when legacy_production_import_map table is missing", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ exists: null }] });
    await expect(
      importEventsLegacy(makeClient(query), {
        filePath: "/tmp/x.csv",
        dryRun: true,
        limit: null,
      }),
    ).rejects.toThrow("legacy_production_import_map");
  });

  it("throws when production map is empty", async () => {
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
        filePath: "/tmp/x.csv",
        dryRun: true,
        limit: null,
      }),
    ).rejects.toThrow("No production mappings");
  });

  it("dry-run processes a valid row", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-"));
    const csvPath = path.join(dir, "e.csv");
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
        return Promise.resolve({ rows: [{ legacy_id: "p1", production_id: 1 }] });
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
    });

    expect(query).toHaveBeenCalled();
    fs.rmSync(dir, { recursive: true });
  });

  it("write mode inserts event and legacy map", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-w-"));
    const csvPath = path.join(dir, "e.csv");
    fs.writeFileSync(
      csvPath,
      "Starttime,Endtime,Hall,Production\n2024-02-01 20:00:00,,Zaaltje,p9\n",
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_event_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({ rows: [{ legacy_id: "p9", production_id: 7 }] });
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
    });

    expect(query.mock.calls.some((c) => String(c[0]).includes("INSERT INTO event"))).toBe(true);
    fs.rmSync(dir, { recursive: true });
  });

  it("rolls back on failure inside transaction", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-fail-"));
    const csvPath = path.join(dir, "e.csv");
    fs.writeFileSync(
      csvPath,
      "Starttime,Hall,Production\n2024-03-01 18:00:00,X,p9\n",
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_event_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({ rows: [{ legacy_id: "p9", production_id: 7 }] });
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
    });

    expect(query.mock.calls.some((c) => String(c[0]).trimStart().startsWith("ROLLBACK"))).toBe(true);
    fs.rmSync(dir, { recursive: true });
  });

  it("dry-run skips second row when duplicate legacy key in file", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-dup-"));
    const csvPath = path.join(dir, "e.csv");
    const line = "2024-01-01 10:00:00,,Main,p1\n";
    fs.writeFileSync(csvPath, `Starttime,Endtime,Hall,Production\n${line}${line}`, "utf8");

    const query = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({ rows: [{ legacy_id: "p1", production_id: 1 }] });
      }
      if (sql.includes("FROM hall") && sql.includes("SELECT id")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), { filePath: csvPath, dryRun: true, limit: null });

    fs.rmSync(dir, { recursive: true });
  });

  it("write mode skips row already in legacy_event_import_map", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-imp-"));
    const csvPath = path.join(dir, "e.csv");
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
      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_event_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({ rows: [{ legacy_id: "p1", production_id: 1 }] });
      }
      if (sql.includes("name->>'nl' AS name") && sql.includes("FROM hall")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("SELECT legacy_key") && sql.includes("legacy_event_import_map")) {
        return Promise.resolve({ rows: [{ legacy_key: key }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), { filePath: csvPath, dryRun: false, limit: null });

    expect(
      query.mock.calls.some((c) => String(c[0]).includes("INSERT INTO event")),
    ).toBe(false);

    fs.rmSync(dir, { recursive: true });
  });

  it("dry-run skips row with missing starttime", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-"));
    const csvPath = path.join(dir, "e.csv");
    fs.writeFileSync(
      csvPath,
      "Starttime,Endtime,Hall,Production\n,,Main,p1\n",
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({ rows: [{ legacy_id: "p1", production_id: 1 }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), { filePath: csvPath, dryRun: true, limit: null });

    fs.rmSync(dir, { recursive: true });
  });

  it("dry-run skips row with missing hall", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-"));
    const csvPath = path.join(dir, "e.csv");
    fs.writeFileSync(
      csvPath,
      "Starttime,Endtime,Hall,Production\n2024-01-01 10:00:00,,,p1\n",
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({ rows: [{ legacy_id: "p1", production_id: 1 }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), { filePath: csvPath, dryRun: true, limit: null });

    fs.rmSync(dir, { recursive: true });
  });

  it("dry-run skips row with missing production legacy id", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-"));
    const csvPath = path.join(dir, "e.csv");
    fs.writeFileSync(
      csvPath,
      "Starttime,Endtime,Hall,Production\n2024-01-01 10:00:00,,Main,\n",
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({ rows: [{ legacy_id: "p1", production_id: 1 }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), { filePath: csvPath, dryRun: true, limit: null });

    fs.rmSync(dir, { recursive: true });
  });

  it("dry-run skips row when production mapping is unknown", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-"));
    const csvPath = path.join(dir, "e.csv");
    fs.writeFileSync(
      csvPath,
      "Starttime,Endtime,Hall,Production\n2024-01-01 10:00:00,,Main,unknown\n",
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({ rows: [{ legacy_id: "p1", production_id: 1 }] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), { filePath: csvPath, dryRun: true, limit: null });

    fs.rmSync(dir, { recursive: true });
  });

  it("dry-run skips row when hall insert schema rejects", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-"));
    const csvPath = path.join(dir, "e.csv");
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
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({ rows: [{ legacy_id: "p1", production_id: 1 }] });
      }
      if (sql.includes("FROM hall") && sql.includes("SELECT id")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), { filePath: csvPath, dryRun: true, limit: null });

    fs.rmSync(dir, { recursive: true });
  });

  it("dry-run skips row when event create schema rejects", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-"));
    const csvPath = path.join(dir, "e.csv");
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
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({ rows: [{ legacy_id: "p1", production_id: 1 }] });
      }
      if (sql.includes("FROM hall") && sql.includes("SELECT id")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), { filePath: csvPath, dryRun: true, limit: null });

    fs.rmSync(dir, { recursive: true });
  });

  it("write mode updates hall address when existing hall has none", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-addr-"));
    const csvPath = path.join(dir, "e.csv");
    fs.writeFileSync(
      csvPath,
      "Starttime,Endtime,Hall,Production\n2024-05-01 19:00:00,,\"Theater, New Street 9\",p9\n",
      "utf8",
    );

    const query = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("CREATE TABLE IF NOT EXISTS legacy_event_import_map")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({ rows: [{ legacy_id: "p9", production_id: 7 }] });
      }
      if (sql.includes("name->>'nl' AS name") && sql.includes("FROM hall")) {
        return Promise.resolve({ rows: [] });
      }
      if (sql.includes("WHERE lower(name->>'nl') = lower($1)")) {
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

    await importEventsLegacy(makeClient(query), { filePath: csvPath, dryRun: false, limit: null });

    expect(query.mock.calls.some((c) => String(c[0]).includes("UPDATE hall SET address"))).toBe(true);
    fs.rmSync(dir, { recursive: true });
  });

  it("dry-run logs progress every progress interval", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-ev-500-"));
    const csvPath = path.join(dir, "e.csv");
    const lines = ["Starttime,Endtime,Hall,Production"];
    for (let i = 0; i < 500; i++) {
      lines.push(`2024-01-01 10:00:00,,Hall${i},p1`);
    }
    fs.writeFileSync(csvPath, `${lines.join("\n")}\n`, "utf8");

    const query = vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("to_regclass")) {
        return Promise.resolve({ rows: [{ exists: "legacy_production_import_map" }] });
      }
      if (sql.includes("FROM legacy_production_import_map")) {
        return Promise.resolve({ rows: [{ legacy_id: "p1", production_id: 1 }] });
      }
      if (sql.includes("FROM hall") && sql.includes("SELECT id")) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    await importEventsLegacy(makeClient(query), { filePath: csvPath, dryRun: true, limit: null });

    expect(query).toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining("Progress 500 rows"),
    );
    fs.rmSync(dir, { recursive: true });
  });
});

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertCsvFileExists,
  assertDatabaseUrl,
  cleanValue,
  getRepoRootFromImportMeta,
  LEGACY_IMPORT_PROGRESS_EVERY,
  legacyCsvParseOptions,
  normalizeRow,
  parseImportArgs,
  resolveDefaultLegacyImportFile,
  toLanguageMap,
} from "@/legacy-import/shared.js";

describe("getRepoRootFromImportMeta", () => {
  it("resolves repo root from backend/scripts URL", () => {
    const root = getRepoRootFromImportMeta("file:///repo/backend/scripts/tool.ts");
    expect(root).toBe(path.resolve("/repo"));
  });
});

describe("resolveDefaultLegacyImportFile", () => {
  it("joins segments under repo root", () => {
    const file = resolveDefaultLegacyImportFile("file:///repo/backend/scripts/x.ts", [
      "data",
      "imports",
      "x.csv",
    ]);
    expect(file).toBe(path.join("/repo", "data", "imports", "x.csv"));
  });
});

describe("assertDatabaseUrl", () => {
  it("throws when DATABASE_URL is missing", () => {
    const prev = process.env["DATABASE_URL"];
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- test env cleanup
    delete process.env["DATABASE_URL"];
    expect(() => assertDatabaseUrl()).toThrow("DATABASE_URL is not set");
    if (prev !== undefined) process.env["DATABASE_URL"] = prev;
  });

  it("does not throw when DATABASE_URL is set", () => {
    const prev = process.env["DATABASE_URL"];
    process.env["DATABASE_URL"] = "postgres://localhost/test";
    expect(() => assertDatabaseUrl()).not.toThrow();
    if (prev !== undefined) process.env["DATABASE_URL"] = prev;
    else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete process.env["DATABASE_URL"];
    }
  });
});

describe("assertCsvFileExists", () => {
  it("throws when file is missing", () => {
    expect(() => assertCsvFileExists("/nonexistent/legacy-import-test.csv")).toThrow(
      "CSV file not found:",
    );
  });

  it("does not throw when file exists", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "legacy-import-"));
    const filePath = path.join(dir, "a.csv");
    fs.writeFileSync(filePath, "a", "utf8");
    expect(() => assertCsvFileExists(filePath)).not.toThrow();
    fs.rmSync(dir, { recursive: true });
  });
});

describe("parseImportArgs", () => {
  const defaultFile = "/default/data.csv";

  it("returns defaults for empty argv", () => {
    expect(parseImportArgs([], { defaultFile })).toEqual({
      filePath: defaultFile,
      dryRun: false,
      limit: null,
    });
  });

  it("returns help for --help and -h", () => {
    expect(parseImportArgs(["--help"], { defaultFile })).toBe("help");
    expect(parseImportArgs(["-h"], { defaultFile })).toBe("help");
  });

  it("ignores standalone -- and empty tokens", () => {
    expect(parseImportArgs(["--", "", "--dry-run"], { defaultFile })).toEqual({
      filePath: defaultFile,
      dryRun: true,
      limit: null,
    });
  });

  it("parses positional path", () => {
    const cwd = process.cwd();
    expect(parseImportArgs(["./my.csv"], { defaultFile })).toEqual({
      filePath: path.resolve(cwd, "./my.csv"),
      dryRun: false,
      limit: null,
    });
  });

  it("parses --file", () => {
    const cwd = process.cwd();
    expect(parseImportArgs(["--file", "b.csv"], { defaultFile })).toEqual({
      filePath: path.resolve(cwd, "b.csv"),
      dryRun: false,
      limit: null,
    });
  });

  it("parses --dry-run and --limit", () => {
    expect(parseImportArgs(["--dry-run", "--limit", "3"], { defaultFile })).toEqual({
      filePath: defaultFile,
      dryRun: true,
      limit: 3,
    });
  });

  it("throws on missing --file value", () => {
    expect(() => parseImportArgs(["--file"], { defaultFile })).toThrow("Missing value for --file");
  });

  it("throws on missing --limit value", () => {
    expect(() => parseImportArgs(["--limit"], { defaultFile })).toThrow("Missing value for --limit");
  });

  it("throws on invalid --limit", () => {
    expect(() => parseImportArgs(["--limit", "0"], { defaultFile })).toThrow(
      "--limit must be a positive integer",
    );
    expect(() => parseImportArgs(["--limit", "nope"], { defaultFile })).toThrow(
      "--limit must be a positive integer",
    );
  });

  it("throws on unknown flag", () => {
    expect(() => parseImportArgs(["--nope"], { defaultFile })).toThrow("Unknown argument: --nope");
  });
});

describe("toLanguageMap", () => {
  it("wraps nl", () => {
    expect(toLanguageMap("x")).toEqual({ nl: "x" });
  });
});

describe("cleanValue", () => {
  it("returns empty for undefined and empty string", () => {
    expect(cleanValue(undefined)).toBe("");
    expect(cleanValue("")).toBe("");
  });

  it("normalizes CRLF and trims", () => {
    expect(cleanValue("  a\r\nb  ")).toBe("a\nb");
  });

  it("treats sentinels as empty", () => {
    expect(cleanValue("\\n")).toBe("");
    expect(cleanValue("NULL")).toBe("");
    expect(cleanValue("\\null")).toBe("");
  });

  it("returns trimmed content otherwise", () => {
    expect(cleanValue("  hello  ")).toBe("hello");
  });
});

describe("normalizeRow", () => {
  it("lowercases keys and cleans values", () => {
    expect(
      normalizeRow({
        " Titel ": "  x  ",
        Genre: "NULL",
      }),
    ).toEqual({
      titel: "x",
      genre: "",
    });
  });
});

describe("legacyCsvParseOptions", () => {
  it("matches expected legacy importer options", () => {
    expect(legacyCsvParseOptions).toEqual({
      columns: true,
      bom: true,
      relax_quotes: true,
      skip_empty_lines: true,
      trim: false,
    });
  });
});

describe("LEGACY_IMPORT_PROGRESS_EVERY", () => {
  it("is 500", () => {
    expect(LEGACY_IMPORT_PROGRESS_EVERY).toBe(500);
  });
});

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertCsvFileExists,
  assertDatabaseUrl,
  cleanValue,
  expandLegacyImportDatabaseUrlString,
  getRepoRootFromImportMeta,
  LEGACY_IMPORT_PROGRESS_EVERY,
  legacyCsvParseOptions,
  normalizeRow,
  parseImportArgs,
  resolveDefaultLegacyImportFile,
  resolveLegacyImportDatabaseUrl,
  rewriteDockerDbHostInDatabaseUrl,
  toLanguageMap,
} from "@/legacy-import/shared.js";

describe("expandLegacyImportDatabaseUrlString", () => {
  it("replaces ${DB_PORT}", () => {
    expect(expandLegacyImportDatabaseUrlString("postgres://h:${DB_PORT}/x", "5432")).toBe(
      "postgres://h:5432/x",
    );
  });

  it("leaves strings without placeholder unchanged", () => {
    expect(expandLegacyImportDatabaseUrlString("postgres://localhost:5432/x", "9999")).toBe(
      "postgres://localhost:5432/x",
    );
  });
});

describe("resolveLegacyImportDatabaseUrl", () => {
  it("no-ops when DATABASE_URL is missing or empty", () => {
    const missing = { DB_PORT: "5432" } as NodeJS.ProcessEnv;
    resolveLegacyImportDatabaseUrl(missing, { runningInDocker: false });
    expect(missing["DATABASE_URL"]).toBeUndefined();

    const empty = { DATABASE_URL: "" } as NodeJS.ProcessEnv;
    resolveLegacyImportDatabaseUrl(empty, { runningInDocker: false });
    expect(empty["DATABASE_URL"]).toBe("");
  });

  it("does not mutate DATABASE_URL when unknown placeholders remain after DB_PORT expansion", () => {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      DATABASE_URL: "postgres://postgres@db:${DB_PORT}/${OTHER}",
      DB_PORT: "5432",
    };
    resolveLegacyImportDatabaseUrl(env, { runningInDocker: false });
    expect(env["DATABASE_URL"]).toBe("postgres://postgres@db:${DB_PORT}/${OTHER}");
  });

  it("expands ${DB_PORT} with default port then rewrites db host", () => {
    const env = {
      DATABASE_URL: "postgres://postgres@db:${DB_PORT}/postgres",
    } as NodeJS.ProcessEnv;
    resolveLegacyImportDatabaseUrl(env, { runningInDocker: false });
    expect(env["DATABASE_URL"]).toBe("postgres://postgres@127.0.0.1:5432/postgres");
  });

  it("rewrites db host when URL is fully expanded", () => {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      DATABASE_URL: "postgres://postgres@db:5432/postgres",
    };
    resolveLegacyImportDatabaseUrl(env, { runningInDocker: false });
    expect(env["DATABASE_URL"]).toBe("postgres://postgres@127.0.0.1:5432/postgres");
  });

  it("does not rewrite db host when runningInDocker is true", () => {
    const env = { DATABASE_URL: "postgres://postgres@db:5432/postgres" } as NodeJS.ProcessEnv;
    resolveLegacyImportDatabaseUrl(env, { runningInDocker: true });
    expect(env["DATABASE_URL"]).toBe("postgres://postgres@db:5432/postgres");
  });
});

describe("rewriteDockerDbHostInDatabaseUrl", () => {
  it("rewrites host db to 127.0.0.1 when not in Docker", () => {
    expect(
      rewriteDockerDbHostInDatabaseUrl("postgres://postgres@db:5432/postgres", {
        runningInDocker: false,
      }),
    ).toBe("postgres://postgres@127.0.0.1:5432/postgres");
  });

  it("does not rewrite when runningInDocker is true", () => {
    const u = "postgres://postgres@db:5432/postgres";
    expect(rewriteDockerDbHostInDatabaseUrl(u, { runningInDocker: true })).toBe(u);
  });

  it("does not rewrite other hostnames", () => {
    const u = "postgres://postgres@localhost:5432/postgres";
    expect(rewriteDockerDbHostInDatabaseUrl(u, { runningInDocker: false })).toBe(u);
  });

  it("returns original on invalid URL", () => {
    const bad = ":::not-a-url";
    expect(rewriteDockerDbHostInDatabaseUrl(bad, { runningInDocker: false })).toBe(bad);
  });
});

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

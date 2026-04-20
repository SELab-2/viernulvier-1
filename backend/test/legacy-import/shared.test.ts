import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  argvForLegacyImportYargs,
  assertCsvFileExists,
  assertDatabaseUrl,
  cleanValue,
  expandLegacyImportDatabaseUrlString,
  getRepoRootFromImportMeta,
  LEGACY_IMPORT_PROGRESS_EVERY,
  legacyCsvParseOptions,
  normalizeRow,
  parseLegacyImportCli,
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

  it("resolves repo root when given a plain path instead of a file URL", () => {
    const scriptPath = path.resolve("/repo/backend/scripts/tool.ts");
    const root = getRepoRootFromImportMeta(scriptPath);
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
    expect(file).toBe(path.resolve("/repo", "data", "imports", "x.csv"));
  });
});

describe("assertDatabaseUrl", () => {
  it("throws when DATABASE_URL is missing", () => {
    const prev = process.env["DATABASE_URL"];
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
      delete process.env["DATABASE_URL"];
    }
  });
});

describe("argvForLegacyImportYargs", () => {
  it("drops script path and -- when simulating production (not fromTest)", () => {
    expect(argvForLegacyImportYargs(["scripts/tool.ts", "a.csv"], false)).toEqual(["a.csv"]);
    expect(argvForLegacyImportYargs(["scripts/tool.ts", "--", "--help"], false)).toEqual(["--help"]);
  });

  it("does not drop first token when fromTest", () => {
    expect(argvForLegacyImportYargs(["scripts/tool.ts", "a.csv"], true)).toEqual([
      "scripts/tool.ts",
      "a.csv",
    ]);
  });

  it("returns empty when hideBin is empty and not fromTest", () => {
    expect(argvForLegacyImportYargs([], false)).toEqual([]);
  });

  it("copies hideBin when fromTest and empty", () => {
    expect(argvForLegacyImportYargs([], true)).toEqual([]);
  });
});

describe("parseLegacyImportCli", () => {
  const baseOptions = {
    defaultFile: "/default/data.csv",
    scriptForUsage: "import:test",
    description: "Test legacy import CLI.",
  };

  it("uses hideBin(process.argv) when argv is omitted (production path)", () => {
    const prev = process.argv;
    process.argv = ["node", "/virtual/tsx.mjs", "scripts/import-productions-legacy.ts", "--dry-run"];
    try {
      expect(
        parseLegacyImportCli({
          defaultFile: "/default/data.csv",
          scriptForUsage: "import:test",
          description: "Test legacy import CLI.",
        }),
      ).toEqual({
        filePath: "/default/data.csv",
        dryRun: true,
        limit: null,
      });
    } finally {
      process.argv = prev;
    }
  });

  it("returns defaults for empty argv", () => {
    expect(parseLegacyImportCli(baseOptions, [])).toEqual({
      filePath: baseOptions.defaultFile,
      dryRun: false,
      limit: null,
    });
  });

  it("parses positional path", () => {
    const cwd = process.cwd();
    expect(parseLegacyImportCli(baseOptions, ["./my.csv"])).toEqual({
      filePath: path.resolve(cwd, "./my.csv"),
      dryRun: false,
      limit: null,
    });
  });

  it("uses last positional when multiple are given", () => {
    const cwd = process.cwd();
    expect(parseLegacyImportCli(baseOptions, ["a.csv", "b.csv"])).toEqual({
      filePath: path.resolve(cwd, "b.csv"),
      dryRun: false,
      limit: null,
    });
  });

  it("lets --file override a positional path", () => {
    const cwd = process.cwd();
    expect(parseLegacyImportCli(baseOptions, ["ignore.csv", "--file", "b.csv"])).toEqual({
      filePath: path.resolve(cwd, "b.csv"),
      dryRun: false,
      limit: null,
    });
  });

  it("parses --dry-run and --limit", () => {
    expect(parseLegacyImportCli(baseOptions, ["--dry-run", "--limit", "3"])).toEqual({
      filePath: baseOptions.defaultFile,
      dryRun: true,
      limit: 3,
    });
  });

  it("strips pnpm/npm standalone -- so flags are not treated as CSV paths", () => {
    const cwd = process.cwd();
    expect(parseLegacyImportCli(baseOptions, ["--", "./after-pnpm-dash.csv"])).toEqual({
      filePath: path.resolve(cwd, "./after-pnpm-dash.csv"),
      dryRun: false,
      limit: null,
    });
    expect(parseLegacyImportCli(baseOptions, ["--", "", "--dry-run"])).toEqual({
      filePath: baseOptions.defaultFile,
      dryRun: true,
      limit: null,
    });
  });

  it("throws when --file is empty", () => {
    expect(() => parseLegacyImportCli(baseOptions, ["--file", ""])).toThrow("Missing value for --file");
  });

  it("throws on invalid --limit", () => {
    expect(() => parseLegacyImportCli(baseOptions, ["--limit", "0"])).toThrow(
      "--limit must be a positive integer",
    );
    expect(() => parseLegacyImportCli(baseOptions, ["--limit", "nope"])).toThrow(
      "--limit must be a positive integer",
    );
    expect(() => parseLegacyImportCli(baseOptions, ["--limit", "3.5"])).toThrow(
      "--limit must be a positive integer",
    );
  });

  it("throws when --file has no value", () => {
    expect(() => parseLegacyImportCli(baseOptions, ["--file"])).toThrow(/Not enough arguments following: file/);
  });

  it("throws when --limit has no value", () => {
    expect(() => parseLegacyImportCli(baseOptions, ["--limit"])).toThrow(/Not enough arguments following: limit/);
  });

  it("throws on unknown flag", () => {
    expect(() => parseLegacyImportCli(baseOptions, ["--nope"])).toThrow(/Unknown argument/);
  });

  it("throws on unknown flag when events productions default is set", () => {
    expect(() =>
      parseLegacyImportCli(
        { ...baseOptions, eventsProductionsDefault: "/default/prod.csv" },
        ["--nope"],
      ),
    ).toThrow(/Unknown argument/);
  });

  it("events CLI: defaults productionsFilePath to eventsProductionsDefault", () => {
    expect(
      parseLegacyImportCli(
        { ...baseOptions, eventsProductionsDefault: "/repo/data/imports/productions.csv" },
        [],
      ),
    ).toEqual({
      filePath: baseOptions.defaultFile,
      dryRun: false,
      limit: null,
      productionsFilePath: "/repo/data/imports/productions.csv",
    });
  });

  it("events CLI: --productions-file overrides default", () => {
    const cwd = process.cwd();
    expect(
      parseLegacyImportCli(
        { ...baseOptions, eventsProductionsDefault: "/default/prod.csv" },
        ["--productions-file", "./other-prod.csv"],
      ),
    ).toEqual({
      filePath: baseOptions.defaultFile,
      dryRun: false,
      limit: null,
      productionsFilePath: path.resolve(cwd, "./other-prod.csv"),
    });
  });

  it("throws when --productions-file is empty", () => {
    expect(() =>
      parseLegacyImportCli(
        { ...baseOptions, eventsProductionsDefault: "/default/prod.csv" },
        ["--productions-file", ""],
      ),
    ).toThrow("Missing value for --productions-file");
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

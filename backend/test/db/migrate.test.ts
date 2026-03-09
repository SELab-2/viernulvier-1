import { describe, it, expect, vi, beforeEach } from "vitest";
import { migrate } from "@/db/migrate.js";

// mocks
const mockClientInstance = {
  connect: vi.fn().mockResolvedValue(undefined),
  end: vi.fn().mockResolvedValue(undefined),
  query: vi.fn().mockResolvedValue({}),
  database: "test_db",
};

vi.mock("pg", () => ({
  default: {
    Client: vi.fn(function () {
      return mockClientInstance;
    }),
  },
}));

const mockMigrate = vi
  .fn()
  .mockResolvedValue([{ filename: "001.do.init.sql" }]);

vi.mock("postgrator", () => ({
  default: vi.fn(function () {
    return { migrate: mockMigrate };
  }),
}));

describe("migrate()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClientInstance.connect.mockResolvedValue(undefined);
    mockClientInstance.end.mockResolvedValue(undefined);
    mockClientInstance.database = "test_db";
    mockMigrate.mockResolvedValue([{ filename: "001.do.init.sql" }]);
  });

  it("Succesful migration", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await migrate();

    expect(mockClientInstance.connect).toHaveBeenCalled();
    expect(mockMigrate).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith("Migrations applied:", [
      { filename: "001.do.init.sql" },
    ]);
    expect(mockClientInstance.end).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("Logs 'No migrations needed' when result is empty", async () => {
    mockMigrate.mockResolvedValue([]);
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await migrate();

    expect(consoleSpy).toHaveBeenCalledWith("No migrations needed");

    consoleSpy.mockRestore();
  });

  it("Throws if database client wasn't properly instantiated", async () => {
    mockClientInstance.database = undefined as unknown as string;

    await expect(migrate()).rejects.toThrow(
      "Database client wasn't properly instantiated.",
    );
  });

  it("Throws 'Database not ready' if DB never becomes available", async () => {
    mockClientInstance.connect.mockRejectedValue(
      new Error("Connection refused"),
    );
    vi.useFakeTimers();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(
      Promise.all([
        migrate(),
        // Advance through all 10 retry delays concurrently
        (async () => {
          for (let i = 0; i < 10; i++) {
            await vi.advanceTimersByTimeAsync(2000);
          }
        })(),
      ]),
    ).rejects.toThrow("Database not ready");

    consoleSpy.mockRestore();
    vi.useRealTimers();
  });

  it("Passes execQuery that delegates to client.query", async () => {
    const { default: MockPostgrator } = await import("postgrator");

    await migrate();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const postgratorConfig = (MockPostgrator as any).mock.calls[0][0];
    await postgratorConfig.execQuery("SELECT 1");

    expect(mockClientInstance.query).toHaveBeenCalledWith("SELECT 1");
  });
});

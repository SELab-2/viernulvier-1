import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  login,
  logout,
  withAuth,
  getAdmin,
  getAdminWithMeta,
  createAdmin,
  replaceAdmin,
  updateAdmin,
  deleteAdmin,
  ApiError,
} from "@/services/auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockOk(body: unknown = {}, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status,
    statusText: "OK",
    json: vi.fn().mockResolvedValue(body),
  });
}

function mockError(status: number, message: string) {
  return vi.fn().mockResolvedValue({
    ok: false,
    status,
    statusText: message,
    json: vi.fn().mockResolvedValue({ error: message }),
  });
}

/** Returns the RequestInit that was passed to the last fetch call. */
function lastFetchOptions(): RequestInit {
  const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls as [
    string,
    RequestInit,
  ][];
  return calls[calls.length - 1]![1];
}

/** Returns the URL that was passed to the last fetch call. */
function lastFetchUrl(): string {
  const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls as [
    string,
    RequestInit,
  ][];
  return calls[calls.length - 1]![0];
}

// ---------------------------------------------------------------------------
// Session
// ---------------------------------------------------------------------------

describe("login", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockOk()));
  afterEach(() => vi.unstubAllGlobals());

  it("POSTs to /api/v1/auth/login", async () => {
    await login({ username: "admin", password: "secret" });
    expect(lastFetchUrl()).toBe("/api/v1/auth/login");
    expect(lastFetchOptions().method).toBe("POST");
  });

  it("sends credentials as JSON body", async () => {
    await login({ username: "admin", password: "secret" });
    expect(lastFetchOptions().body).toBe(
      JSON.stringify({ username: "admin", password: "secret" }),
    );
  });

  it("resolves to void on success", async () => {
    const result = await login({ username: "a", password: "b" });
    expect(result).toBeUndefined();
  });

  it("throws ApiError on 401", async () => {
    vi.stubGlobal("fetch", mockError(401, "Unauthorized"));
    await expect(
      login({ username: "a", password: "wrong" }),
    ).rejects.toBeInstanceOf(ApiError);
  });
});

describe("logout", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockOk({}, 204)));
  afterEach(() => vi.unstubAllGlobals());

  it("POSTs to /api/v1/auth/logout", async () => {
    await logout();
    expect(lastFetchUrl()).toBe("/api/v1/auth/logout");
    expect(lastFetchOptions().method).toBe("POST");
  });
});

// ---------------------------------------------------------------------------
// withAuth
// ---------------------------------------------------------------------------

describe("withAuth", () => {
  it("returns the result of fn on success", async () => {
    const result = await withAuth(
      async () => 42,
      () => {},
    );
    expect(result).toBe(42);
  });

  it("calls onUnauthorized and re-throws on 401 ApiError", async () => {
    const onUnauthorized = vi.fn();
    const fn = async () => {
      throw new ApiError(401, "Unauthorized");
    };

    await expect(withAuth(fn, onUnauthorized)).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("re-throws non-401 ApiErrors without calling onUnauthorized", async () => {
    const onUnauthorized = vi.fn();
    const fn = async () => {
      throw new ApiError(404, "Not found");
    };

    await expect(withAuth(fn, onUnauthorized)).rejects.toMatchObject({
      status: 404,
    });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it("re-throws generic errors without calling onUnauthorized", async () => {
    const onUnauthorized = vi.fn();
    const fn = async () => {
      throw new Error("Network failure");
    };

    await expect(withAuth(fn, onUnauthorized)).rejects.toThrow(
      "Network failure",
    );
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Admin CRUD
// ---------------------------------------------------------------------------

const adminPayload = { id: 1, username: "admin", profile_picture: null };

describe("getAdmin", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockOk(adminPayload)));
  afterEach(() => vi.unstubAllGlobals());

  it("GETs /api/v1/auth/:id", async () => {
    await getAdmin(1);
    expect(lastFetchUrl()).toBe("/api/v1/auth/1");
    expect(lastFetchOptions().method).toBeUndefined();
  });

  it("returns the admin", async () => {
    const result = await getAdmin(1);
    expect(result).toEqual(adminPayload);
  });
});

describe("getAdminWithMeta", () => {
  beforeEach(() =>
    vi.stubGlobal(
      "fetch",
      mockOk({ ...adminPayload, created_at: "2024-01-01" }),
    ),
  );
  afterEach(() => vi.unstubAllGlobals());

  it("GETs /api/v1/auth/:id/meta", async () => {
    await getAdminWithMeta(1);
    expect(lastFetchUrl()).toBe("/api/v1/auth/1/meta");
  });
});

describe("createAdmin", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockOk(adminPayload, 201)));
  afterEach(() => vi.unstubAllGlobals());

  it("POSTs to /api/v1/auth", async () => {
    await createAdmin({ username: "newuser", password: "pass" });
    expect(lastFetchUrl()).toBe("/api/v1/auth");
    expect(lastFetchOptions().method).toBe("POST");
  });

  it("sends the payload as the request body", async () => {
    const input = {
      username: "newuser",
      password: "pass",
      profile_picture: null,
    };
    await createAdmin(input);
    expect(lastFetchOptions().body).toBe(JSON.stringify(input));
  });
});

describe("replaceAdmin", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockOk(adminPayload)));
  afterEach(() => vi.unstubAllGlobals());

  it("PUTs to /api/v1/auth/:id", async () => {
    await replaceAdmin(1, {
      username: "admin",
      password: "newpass",
      profile_picture: null,
    });
    expect(lastFetchUrl()).toBe("/api/v1/auth/1");
    expect(lastFetchOptions().method).toBe("PUT");
  });
});

describe("updateAdmin", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockOk(adminPayload)));
  afterEach(() => vi.unstubAllGlobals());

  it("PATCHes /api/v1/auth/:id", async () => {
    await updateAdmin(1, { username: "newname" });
    expect(lastFetchUrl()).toBe("/api/v1/auth/1");
    expect(lastFetchOptions().method).toBe("PATCH");
  });
});

describe("deleteAdmin", () => {
  beforeEach(() => vi.stubGlobal("fetch", mockOk({}, 204)));
  afterEach(() => vi.unstubAllGlobals());

  it("DELETEs /api/v1/auth/:id", async () => {
    await deleteAdmin(1);
    expect(lastFetchUrl()).toBe("/api/v1/auth/1");
    expect(lastFetchOptions().method).toBe("DELETE");
  });
});

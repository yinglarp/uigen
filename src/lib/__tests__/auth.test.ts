// @vitest-environment node
//
// auth.ts is server-only: running it under jsdom causes a cross-realm
// Uint8Array mismatch inside jose (the encoded secret is a jsdom-realm
// Uint8Array, but jose's `instanceof Uint8Array` check uses the node realm).
import {
  test,
  expect,
  vi,
  beforeEach,
  afterEach,
  describe,
} from "vitest";
import { jwtVerify } from "jose";

// `server-only` throws if imported outside a server bundle — neutralize it so
// the module can be loaded under vitest.
vi.mock("server-only", () => ({}));

// Capture what createSession writes to the cookie store.
const setMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: setMock,
    get: vi.fn(),
    delete: vi.fn(),
  })),
}));

// Imported after the mocks above are registered.
import { createSession } from "../auth";

// auth.ts falls back to this secret when JWT_SECRET is unset (the test env).
const SECRET = new TextEncoder().encode("development-secret-key");
const COOKIE_NAME = "auth-token";

// A fixed point in time so the 7-day expiry math is deterministic.
const NOW = new Date("2026-06-14T00:00:00.000Z");
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

beforeEach(() => {
  setMock.mockClear();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createSession", () => {
  test("writes the token under the auth-token cookie", async () => {
    await createSession("user-123", "alice@example.com");

    expect(setMock).toHaveBeenCalledTimes(1);
    const [name, token] = setMock.mock.calls[0];
    expect(name).toBe(COOKIE_NAME);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  test("emits a verifiable JWT carrying the userId and email", async () => {
    await createSession("user-123", "alice@example.com");

    const [, token] = setMock.mock.calls[0];
    const { payload } = await jwtVerify(token, SECRET);

    expect(payload.userId).toBe("user-123");
    expect(payload.email).toBe("alice@example.com");
  });

  test("sets the JWT to expire seven days out", async () => {
    await createSession("user-123", "alice@example.com");

    const [, token] = setMock.mock.calls[0];
    const { payload } = await jwtVerify(token, SECRET);

    // jose stores exp/iat as seconds since the epoch.
    expect(payload.iat).toBe(Math.floor(NOW.getTime() / 1000));
    expect(payload.exp).toBe(
      Math.floor((NOW.getTime() + SEVEN_DAYS_MS) / 1000)
    );
  });

  test("applies hardened cookie options", async () => {
    await createSession("user-123", "alice@example.com");

    const options = setMock.mock.calls[0][2];
    expect(options).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    // expires is the 7-day-out Date used for the cookie itself.
    expect(options.expires).toBeInstanceOf(Date);
    expect((options.expires as Date).getTime()).toBe(
      NOW.getTime() + SEVEN_DAYS_MS
    );
  });

  test("does not mark the cookie secure outside production", async () => {
    // NODE_ENV is "test" under vitest, so secure should be false.
    await createSession("user-123", "alice@example.com");

    const options = setMock.mock.calls[0][2];
    expect(options.secure).toBe(false);
  });

  test("marks the cookie secure in production", async () => {
    const original = process.env.NODE_ENV;
    // NODE_ENV is read at call time, not import time, so overriding it here works.
    vi.stubEnv("NODE_ENV", "production");

    await createSession("user-123", "alice@example.com");

    const options = setMock.mock.calls[0][2];
    expect(options.secure).toBe(true);

    vi.unstubAllEnvs();
    process.env.NODE_ENV = original;
  });
});

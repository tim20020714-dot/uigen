// @vitest-environment node
import { test, expect, vi, beforeEach } from "vitest";
import { jwtVerify, SignJWT } from "jose";

const { mockSet, mockGet } = vi.hoisted(() => ({
  mockSet: vi.fn(),
  mockGet: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ set: mockSet, get: mockGet, delete: vi.fn() }),
}));

import { createSession, getSession } from "../auth";

const SECRET = new TextEncoder().encode("development-secret-key");

beforeEach(() => {
  vi.clearAllMocks();
});

async function makeToken(
  payload: object,
  expiresAt: number | string = "7d"
) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresAt)
    .setIssuedAt()
    .sign(SECRET);
}

// --- createSession ---

test("createSession sets the auth-token cookie", async () => {
  await createSession("user-1", "a@b.com");
  expect(mockSet).toHaveBeenCalledOnce();
  expect(mockSet.mock.calls[0][0]).toBe("auth-token");
});

test("createSession cookie value is a valid JWT with userId and email", async () => {
  await createSession("user-1", "a@b.com");
  const token = mockSet.mock.calls[0][1];
  const { payload } = await jwtVerify(token, SECRET);
  expect(payload.userId).toBe("user-1");
  expect(payload.email).toBe("a@b.com");
});

test("createSession JWT uses HS256", async () => {
  await createSession("user-1", "a@b.com");
  const token = mockSet.mock.calls[0][1];
  const header = JSON.parse(atob(token.split(".")[0]));
  expect(header.alg).toBe("HS256");
});

test("createSession cookie expires in ~7 days", async () => {
  const before = Date.now();
  await createSession("user-1", "a@b.com");
  const after = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  const { expires } = mockSet.mock.calls[0][2];
  expect(expires.getTime()).toBeGreaterThanOrEqual(before + sevenDays);
  expect(expires.getTime()).toBeLessThanOrEqual(after + sevenDays + 100);
});

test("createSession sets httpOnly, sameSite lax, path /", async () => {
  await createSession("user-1", "a@b.com");
  const opts = mockSet.mock.calls[0][2];
  expect(opts.httpOnly).toBe(true);
  expect(opts.sameSite).toBe("lax");
  expect(opts.path).toBe("/");
});

test("createSession sets secure: false outside production", async () => {
  await createSession("user-1", "a@b.com");
  expect(mockSet.mock.calls[0][2].secure).toBe(false);
});

test("createSession sets secure: true in production", async () => {
  vi.stubEnv("NODE_ENV", "production");
  await createSession("user-1", "a@b.com");
  expect(mockSet.mock.calls[0][2].secure).toBe(true);
  vi.unstubAllEnvs();
});

// --- getSession ---

test("getSession returns null when no cookie exists", async () => {
  mockGet.mockReturnValue(undefined);
  expect(await getSession()).toBeNull();
});

test("getSession returns the session payload for a valid token", async () => {
  const token = await makeToken({ userId: "user-1", email: "a@b.com" });
  mockGet.mockReturnValue({ value: token });

  const session = await getSession();
  expect(session?.userId).toBe("user-1");
  expect(session?.email).toBe("a@b.com");
});

test("getSession returns null for a malformed token", async () => {
  mockGet.mockReturnValue({ value: "not.a.valid.jwt" });
  expect(await getSession()).toBeNull();
});

test("getSession returns null for an expired token", async () => {
  const expiredAt = Math.floor(Date.now() / 1000) - 60;
  const token = await makeToken({ userId: "user-1", email: "a@b.com" }, expiredAt);
  mockGet.mockReturnValue({ value: token });
  expect(await getSession()).toBeNull();
});

test("getSession returns null for a token signed with a different secret", async () => {
  const wrongSecret = new TextEncoder().encode("wrong-secret");
  const token = await new SignJWT({ userId: "user-1", email: "a@b.com" })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(wrongSecret);
  mockGet.mockReturnValue({ value: token });
  expect(await getSession()).toBeNull();
});

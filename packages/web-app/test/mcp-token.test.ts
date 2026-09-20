import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
vi.mock("../lib/auth/repository", () => ({ loadUserWithRoles: vi.fn() }));
import { loadUserWithRoles } from "../lib/auth/repository";
import { mintMcpToken, verifyMcpToken } from "../lib/mcp/token";
const secret = Buffer.alloc(32, 7).toString("base64");
const user = {
  id: "u",
  status: "active",
  deletedAt: null,
  coach: {},
  coachee: null,
};
beforeEach(() => {
  vi.stubEnv("MCP_TOKEN_SECRET", secret);
  vi.mocked(loadUserWithRoles).mockResolvedValue(
    user as Awaited<ReturnType<typeof loadUserWithRoles>>,
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
it("mints trusted role scopes without exposing a browser endpoint", async () => {
  const token = await mintMcpToken("u");
  const auth = await verifyMcpToken(token);
  expect(auth).toMatchObject({
    clientId: "holpro-agent",
    scopes: ["plans:read", "plans:publish"],
    extra: { userId: "u", role: "coach" },
  });
});
it("rejects tokens after role revocation or blocking", async () => {
  const token = await mintMcpToken("u");
  for (const change of [
    { coach: null, coachee: {} },
    { status: "suspended" },
    { deletedAt: new Date() },
    { coach: null, coachee: null },
  ]) {
    vi.mocked(loadUserWithRoles).mockResolvedValue({
      ...user,
      ...change,
    } as Awaited<ReturnType<typeof loadUserWithRoles>>);
    expect(await verifyMcpToken(token)).toBeUndefined();
  }
});
it("rejects expiry and wrong signature", async () => {
  const token = await mintMcpToken("u");
  vi.stubEnv("MCP_TOKEN_SECRET", Buffer.alloc(32, 8).toString("base64"));
  expect(await verifyMcpToken(token)).toBeUndefined();
  vi.stubEnv("MCP_TOKEN_SECRET", secret);
  vi.useFakeTimers();
  vi.setSystemTime(Date.now() + 3601_000);
  expect(await verifyMcpToken(token)).toBeUndefined();
});
it.each(["wrong-audience", "missing-claims", "too-long"])(
  "rejects %s",
  async (kind) => {
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      sub: "u",
      role: "coach",
      jti: "j",
      iat: now,
      exp: now + (kind === "too-long" ? 7200 : 3600),
      aud: kind === "wrong-audience" ? "other" : "holpro-mcp",
      iss: "holpro",
    };
    const token = await new SignJWT(
      kind === "missing-claims" ? { sub: "u" } : claims,
    )
      .setProtectedHeader({ alg: "HS256" })
      .sign(Buffer.from(secret, "base64"));
    expect(await verifyMcpToken(token)).toBeUndefined();
  },
);
it("rejects malformed secrets and no-role mint requests", async () => {
  vi.stubEnv("MCP_TOKEN_SECRET", "short");
  await expect(mintMcpToken("u")).rejects.toThrow();
  vi.stubEnv("MCP_TOKEN_SECRET", secret);
  vi.mocked(loadUserWithRoles).mockResolvedValue({
    ...user,
    coach: null,
  } as Awaited<ReturnType<typeof loadUserWithRoles>>);
  await expect(mintMcpToken("u")).rejects.toThrow();
});
it("grants coachees only read access", async () => {
  vi.mocked(loadUserWithRoles).mockResolvedValue({
    ...user,
    coach: null,
    coachee: {},
  } as Awaited<ReturnType<typeof loadUserWithRoles>>);
  expect(
    await verifyMcpToken(await mintMcpToken("u")),
  ).toMatchObject({ scopes: ["plans:read"], extra: { role: "coachee" } });
});
it("rejects a different signing algorithm", async () => {
  const now = Math.floor(Date.now() / 1000);
  const token = await new SignJWT({
    sub: "u",
    role: "coach",
    jti: "j",
    iat: now,
    exp: now + 3600,
    aud: "holpro-mcp",
    iss: "holpro",
  })
    .setProtectedHeader({ alg: "HS384" })
    .sign(Buffer.from(secret, "base64"));
  expect(await verifyMcpToken(token)).toBeUndefined();
});

it("preserves a dual-role user's selected coachee role and revokes it independently", async () => {
  vi.mocked(loadUserWithRoles).mockResolvedValue({ ...user, coachee: {} } as Awaited<ReturnType<typeof loadUserWithRoles>>);
  const token = await mintMcpToken("u", "coachee");
  expect(await verifyMcpToken(token)).toMatchObject({ scopes: ["plans:read"], extra: { role: "coachee" } });
  vi.mocked(loadUserWithRoles).mockResolvedValue(user as Awaited<ReturnType<typeof loadUserWithRoles>>);
  expect(await verifyMcpToken(token)).toBeUndefined();
  await expect(mintMcpToken("u", "coachee")).rejects.toThrow();
});

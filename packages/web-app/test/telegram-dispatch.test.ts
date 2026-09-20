import { beforeEach, expect, it, vi } from "vitest";
import type { Agent } from "@mastra/core/agent";
import { RequestContext } from "@mastra/core/request-context";
const mock = vi.hoisted(() => ({
  link: vi.fn(),
  user: vi.fn(),
  pending: vi.fn(),
  consume: vi.fn(),
  clean: vi.fn(),
  verify: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("../lib/telegram/links", () => ({
  findTelegramLink: mock.link,
  pendingLink: mock.pending,
  consumeLink: mock.consume,
}));
vi.mock("../lib/auth/repository", () => ({ loadUserWithRoles: mock.user }));
vi.mock("../lib/assistant/onboarding", () => ({
  loadOnboardingState: async () => ({ onboarding: true, goalsSaved: false }),
}));
vi.mock("../mastra/telegram-memory", () => ({
  cleanTelegramMemory: mock.clean,
  verifyTelegramMemory: mock.verify,
}));
vi.mock("../lib/telegram/runtime", () => ({ removeLink: mock.remove }));
import { handleTelegram } from "../lib/telegram/handlers";
import { limits } from "../lib/assistant/limits";
const link = {
  id: "l",
  userId: "u",
  telegramUserId: 7,
  telegramChatId: 7,
  role: "coachee",
  linkedAt: new Date(),
  revokedAt: null,
};
const envelope = {
  userId: 7,
  chatId: 7,
  username: null,
  locale: "en" as const,
  text: "/unknown hi",
  supported: true,
};
const agent = {} as Agent;
beforeEach(() => {
  vi.clearAllMocks();
  mock.link.mockResolvedValue(link);
  mock.user.mockResolvedValue({
    id: "u",
    name: "Alex",
    timezone: "Europe/Malta",
    locale: "it",
    status: "active",
    deletedAt: null,
    coachee: {},
    coach: null,
  });
});
it("stamps all assistant context for unknown commands before dispatch", async () => {
  const request = new RequestContext(),
    dispatch = vi.fn(async () => {});
  await handleTelegram(envelope, request, agent, vi.fn(), dispatch);
  expect(request.get("assistant")).toMatchObject({
    userId: "u",
    role: "coachee",
    locale: "it",
    surface: "telegram",
    onboarding: true,
  });
  expect(dispatch).toHaveBeenCalledWith("/unknown hi");
});
it.each([
  "unlinked",
  "revoked",
  "blocked",
  "lostRole",
  "wrongChat",
  "tooLong",
  "caption",
])("does not dispatch %s input", async (kind) => {
  const dispatch = vi.fn(async () => {}),
    post = vi.fn(async () => {});
  if (kind === "unlinked") mock.link.mockResolvedValue(undefined);
  if (kind === "revoked")
    mock.link.mockResolvedValue({ ...link, revokedAt: new Date() });
  if (kind === "wrongChat")
    mock.link.mockResolvedValue({ ...link, telegramChatId: 8 });
  if (kind === "blocked") mock.user.mockResolvedValue({ status: "suspended" });
  if (kind === "lostRole")
    mock.user.mockResolvedValue({
      status: "active",
      deletedAt: null,
      coachee: null,
    });
  await handleTelegram(
    {
      ...envelope,
      text:
        kind === "tooLong"
          ? "a".repeat(limits.chatTextChars + 1)
          : envelope.text,
      supported: kind !== "caption",
    },
    new RequestContext(),
    agent,
    post,
    dispatch,
  );
  expect(dispatch).not.toHaveBeenCalled();
  expect(post).toHaveBeenCalled();
});
it("allows stop after role loss without running the assistant", async () => {
  mock.user.mockResolvedValue({ status: "suspended" });
  const dispatch = vi.fn(async () => {});
  await handleTelegram(
    { ...envelope, text: "/stop" },
    new RequestContext(),
    agent,
    vi.fn(),
    dispatch,
  );
  expect(mock.remove).toHaveBeenCalledWith("u", "l");
  expect(dispatch).not.toHaveBeenCalled();
});
it("rejects a link when the issuing account lost the role", async () => {
  mock.pending.mockResolvedValue({ ...link, linkedAt: null });
  mock.user.mockResolvedValue({
    status: "active",
    deletedAt: null,
    coachee: null,
  });
  await handleTelegram(
    { ...envelope, text: "/start token" },
    new RequestContext(),
    agent,
    vi.fn(async () => {}),
    vi.fn(async () => {}),
  );
  expect(mock.consume).not.toHaveBeenCalled();
  expect(mock.clean).not.toHaveBeenCalled();
});
it("acknowledges dispatch while a long task is still running so polling can continue", async () => {
  let finish!: () => void;
  const job = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const dispatch = vi.fn(() => job);
  try {
    await handleTelegram(
      { ...envelope, text: "Start a long task" },
      new RequestContext(),
      agent,
      vi.fn(async () => {}),
      dispatch,
    );
    expect(dispatch).toHaveBeenCalled();
    await handleTelegram(
      { ...envelope, text: "/stop" },
      new RequestContext(),
      agent,
      vi.fn(async () => {}),
      dispatch,
    );
    expect(mock.remove).toHaveBeenCalledWith("u", "l");
  } finally {
    finish();
  }
});
it("uses the stored account locale for unsupported-media notices", async () => {
  const post = vi.fn(async () => {});
  await handleTelegram(
    { ...envelope, text: "", supported: false },
    new RequestContext(),
    agent,
    post,
    vi.fn(async () => {}),
  );
  expect(post).toHaveBeenCalledWith(
    "Invia un messaggio di testo. Gli allegati e gli altri tipi di messaggio non sono supportati.",
  );
});

const query = new URLSearchParams(location.search);
let state = query.get("state") ?? "disconnected";
export async function getTelegramLink() {
  if (state === "connected")
    return {
      state,
      username: query.get("username"),
      role: query.get("role") ?? "coachee",
      linkedAt: "2026-09-20T10:00:00Z",
      timezone: "Europe/Malta",
    };
  if (state === "pending")
    return {
      state,
      id: "pending",
      expiresAt: new Date(Date.now() + 900000).toISOString(),
      timezone: "Europe/Malta",
    };
  return { state };
}
export async function requestTelegramLink() {
  state = "pending";
  return {
    ...(await getTelegramLink()),
    url: "https://t.me/holpro_bot?start=test",
  };
}
export async function cancelTelegramLink() {
  state = "disconnected";
  return getTelegramLink();
}
export async function removeTelegramLink() {
  state = "disconnected";
  return getTelegramLink();
}
export async function signOut() {}
export async function chooseLocale() {}

export async function updateCoachProfile() {
  return { ok: true };
}

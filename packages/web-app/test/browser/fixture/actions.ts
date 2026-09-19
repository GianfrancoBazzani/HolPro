export async function saveAgendaEvent() {
  await new Promise((r) => setTimeout(r, 1000));
  return new URLSearchParams(location.search).has("success")
    ? { ok: true }
    : { ok: false, error: "Database unavailable" };
}
export const savePlanItem = saveAgendaEvent,
  savePlanCheckpoint = saveAgendaEvent,
  savePlanPeriod = saveAgendaEvent;
export async function deleteAgendaEvent() {
  document.documentElement.dataset.deleteRequests = String(
    Number(document.documentElement.dataset.deleteRequests ?? 0) + 1,
  );
  await new Promise((r) => setTimeout(r, 1000));
  return new URLSearchParams(location.search).has("success")
    ? { ok: true }
    : { ok: false, error: "Database unavailable" };
}
export const deletePlanItem = deleteAgendaEvent,
  deletePlanCheckpoint = deleteAgendaEvent,
  deletePlanPeriod = deleteAgendaEvent;

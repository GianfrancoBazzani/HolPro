/* Notification copy is localized by the server in the recipient's locale. */
self.addEventListener("push", (event) => {
  if (!event.data) return;
  let message;
  try {
    message = event.data.json();
  } catch {
    return;
  }
  if (typeof message.title !== "string" || typeof message.body !== "string")
    return;
  event.waitUntil(
    self.registration.showNotification(message.title, {
      body: message.body,
      tag: message.tag,
      data: { href: message.href },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(
    event.notification.data?.href || "/app",
    self.location.origin,
  );
  if (
    url.origin !== self.location.origin ||
    (!["/app", "/pro"].includes(url.pathname) &&
      !/^\/pro\/clients\/[a-zA-Z0-9-]+$/.test(url.pathname))
  )
    return;
  event.waitUntil(self.clients.openWindow(url.href));
});

// Service worker: recibe las notificaciones push aunque la página esté cerrada.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Vitery Barber", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Vitery Barber";

  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/badge-96.png",
      tag: data.tag,            // misma cita = no se duplica
      renotify: Boolean(data.tag),
      vibrate: [200, 100, 200],
      data: { url: data.url || "/" }
    })
  );
});

// Al tocar la notificación: abre (o enfoca) la app en la página de citas
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const target = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          return client.navigate(target).then((c) => (c || client).focus()).catch(() => client.focus());
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

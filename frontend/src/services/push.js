import api from "./api";

export const isPushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

// iPhone/iPad solo permiten push si la web está instalada en la pantalla de inicio
export const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent);

export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

const urlBase64ToUint8Array = (base64) => {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

const getRegistration = async () => {
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
};

// ¿Este dispositivo ya está suscrito?
export const getCurrentSubscription = async () => {
  if (!isPushSupported()) return null;
  const registration = await getRegistration();
  return registration.pushManager.getSubscription();
};

// Pide permiso, se suscribe y guarda el dispositivo en el servidor
export const enablePush = async () => {
  if (!isPushSupported()) throw new Error("UNSUPPORTED");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("DENIED");

  const registration = await getRegistration();

  // Siempre pedimos la clave actual del servidor: si cambió (o la suscripción
  // vieja se hizo con otra clave), hay que volver a suscribir o no llegará nada.
  const { data } = await api.get("/notifications/vapid-public-key");
  const serverKey = urlBase64ToUint8Array(data.publicKey);

  let subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    const current = subscription.options?.applicationServerKey;
    const same =
      current &&
      new Uint8Array(current).length === serverKey.length &&
      new Uint8Array(current).every((byte, i) => byte === serverKey[i]);

    if (!same) {
      await subscription.unsubscribe();
      subscription = null;
    }
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: serverKey
    });
  }

  await api.post("/notifications/subscribe", {
    subscription: subscription.toJSON()
  });

  return subscription;
};

export const disablePush = async () => {
  const subscription = await getCurrentSubscription();
  if (!subscription) return;

  await api.post("/notifications/unsubscribe", { endpoint: subscription.endpoint });
  await subscription.unsubscribe();
};

export const sendTestPush = () => api.post("/notifications/test");

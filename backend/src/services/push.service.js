import webpush from "web-push";
import pool from "../config/db.js";

let configured = false;

// Se configura la primera vez que se usa (así ya está cargado el .env)
const configure = () => {
  if (configured) return true;

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, EMAIL_FROM, EMAIL_USER, FRONTEND_URL } =
    process.env;

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;

  // Apple/Google exigen un "subject" válido: mailto: con un correo real o una URL https
  const firstFrontend = (FRONTEND_URL || "").split(",")[0].trim();
  const subject =
    (VAPID_SUBJECT || "").trim() ||
    (EMAIL_FROM && `mailto:${EMAIL_FROM.trim()}`) ||
    (EMAIL_USER && `mailto:${EMAIL_USER.trim()}`) ||
    (firstFrontend.startsWith("https://") ? firstFrontend : "") ||
    "mailto:admin@example.com";

  webpush.setVapidDetails(subject, VAPID_PUBLIC_KEY.trim(), VAPID_PRIVATE_KEY.trim());
  configured = true;
  return true;
};

export const isPushConfigured = () => configure();

// Envía una notificación a TODOS los dispositivos suscritos de un usuario.
// Devuelve cuántas se enviaron bien. Nunca lanza error.
export const sendPushToUser = async (idUsuario, payload) => {
  if (!configure()) {
    console.warn("[PUSH] Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY, no se envía push");
    return 0;
  }

  const { rows } = await pool.query(
    `SELECT id_suscripcion, endpoint, p256dh, auth
     FROM push_suscripciones
     WHERE id_usuario = $1`,
    [idUsuario]
  );

  if (rows.length === 0) return 0;

  const body = JSON.stringify(payload);
  let sent = 0;

  await Promise.all(
    rows.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          { TTL: 60 * 60 * 24, urgency: "high" }
        );
        sent += 1;
      } catch (error) {
        // 404 / 410 = el dispositivo ya no existe (desinstaló o revocó permiso)
        if (error.statusCode === 404 || error.statusCode === 410) {
          await pool.query(
            "DELETE FROM push_suscripciones WHERE id_suscripcion = $1",
            [sub.id_suscripcion]
          );
        } else {
          console.error("[PUSH] Error enviando:", error.statusCode, error.body || error.message);
        }
      }
    })
  );

  return sent;
};

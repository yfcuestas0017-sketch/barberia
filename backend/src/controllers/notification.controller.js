import pool from "../config/db.js";
import { isPushConfigured, sendPushToUser } from "../services/push.service.js";

// Clave pública (la necesita el navegador para suscribirse)
export const getVapidPublicKey = (req, res) => {
  if (!isPushConfigured()) {
    return res.status(503).json({
      message: "Las notificaciones push no están configuradas en el servidor"
    });
  }

  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
};

// Guarda el dispositivo del barbero
export const subscribe = async (req, res) => {
  try {
    const { endpoint, keys } = req.body?.subscription || req.body || {};

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: "Suscripción inválida" });
    }

    // Si el mismo dispositivo ya estaba con otro usuario, se reasigna al actual
    await pool.query(
      `
      INSERT INTO push_suscripciones (id_usuario, endpoint, p256dh, auth, user_agent)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (endpoint) DO UPDATE
      SET id_usuario = EXCLUDED.id_usuario,
          p256dh = EXCLUDED.p256dh,
          auth = EXCLUDED.auth,
          user_agent = EXCLUDED.user_agent
      `,
      [
        req.user.id_usuario,
        endpoint,
        keys.p256dh,
        keys.auth,
        (req.headers["user-agent"] || "").slice(0, 300)
      ]
    );

    res.status(201).json({ message: "Notificaciones activadas" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al activar las notificaciones" });
  }
};

// Quita el dispositivo
export const unsubscribe = async (req, res) => {
  try {
    const { endpoint } = req.body || {};

    if (!endpoint) {
      return res.status(400).json({ message: "Falta el endpoint" });
    }

    await pool.query(
      "DELETE FROM push_suscripciones WHERE endpoint = $1 AND id_usuario = $2",
      [endpoint, req.user.id_usuario]
    );

    res.json({ message: "Notificaciones desactivadas" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al desactivar las notificaciones" });
  }
};

// Notificación de prueba para el usuario actual
export const sendTest = async (req, res) => {
  try {
    const sent = await sendPushToUser(req.user.id_usuario, {
      title: "🔔 Notificación de prueba",
      body: "¡Funciona! Así te avisaremos cuando te agenden una cita.",
      url: "/barbero/citas",
      tag: "prueba"
    });

    if (sent === 0) {
      return res.status(404).json({
        message: "No hay dispositivos activos. Activa las notificaciones primero."
      });
    }

    res.json({ message: "Prueba enviada", dispositivos: sent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al enviar la prueba" });
  }
};


// Diagnóstico (solo ADMIN): muestra qué falta configurar. Nunca devuelve claves.
export const diagnostics = async (req, res) => {
  try {
    const env = process.env;

    let suscripciones = null;
    let tablaPush = true;

    try {
      const r = await pool.query(
        "SELECT COUNT(*)::int AS total FROM push_suscripciones"
      );
      suscripciones = r.rows[0].total;
    } catch {
      tablaPush = false;
    }

    const problemas = [];

    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY)
      problemas.push("Faltan VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en las variables de entorno del backend.");
    if (!tablaPush)
      problemas.push("No existe la tabla push_suscripciones: ejecuta backend/database/006_notificaciones_push.sql.");
    if (tablaPush && suscripciones === 0)
      problemas.push("Ningún dispositivo está suscrito: el barbero debe tocar la campana y 'Activar notificaciones'.");
    if (!env.BREVO_API_KEY && !env.APPS_SCRIPT_URL && !(env.EMAIL_USER && env.EMAIL_PASS))
      problemas.push("No hay proveedor de correo configurado (BREVO_API_KEY).");
    if (env.BREVO_API_KEY && !env.EMAIL_FROM)
      problemas.push("Falta EMAIL_FROM (remitente verificado en Brevo).");

    res.json({
      push_configurado: Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY),
      tabla_push_suscripciones: tablaPush,
      dispositivos_suscritos: suscripciones,
      correo: {
        brevo_api_key: Boolean(env.BREVO_API_KEY),
        email_from: Boolean(env.EMAIL_FROM),
        gmail_smtp: Boolean(env.EMAIL_USER && env.EMAIL_PASS)
      },
      problemas
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error en el diagnóstico" });
  }
};

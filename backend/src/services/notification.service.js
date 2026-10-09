import pool from "../config/db.js";
import { sendPushToUser } from "./push.service.js";
import { sendNewAppointmentEmail } from "./email.service.js";

const formatMoney = (value) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  }).format(Number(value) || 0);

// Avisa al barbero que le agendaron una cita (push + correo).
// Se llama SIN await desde el controlador: si algo falla aquí,
// la cita ya quedó guardada y el cliente no se entera del error.
export const notifyNewAppointment = async (idCita) => {
  try {
    const { rows } = await pool.query(
      `
      SELECT
        ub.id_usuario  AS barbero_id_usuario,
        ub.nombre      AS barbero_nombre,
        ub.email       AS barbero_email,
        uc.nombre      AS cliente_nombre,
        uc.apellido    AS cliente_apellido,
        uc.telefono    AS cliente_telefono,
        COALESCE(p.nombre, s.nombre) AS servicio_nombre,
        c.precio,
        to_char(c.fecha, 'DD/MM/YYYY')       AS fecha_txt,
        to_char(c.hora_inicio, 'HH12:MI AM') AS hora_txt
      FROM citas c
      INNER JOIN barberos b   ON b.id_barbero = c.id_barbero
      INNER JOIN usuarios ub  ON ub.id_usuario = b.id_usuario
      INNER JOIN usuarios uc  ON uc.id_usuario = c.id_cliente
      LEFT JOIN servicios s   ON s.id_servicio = c.id_servicio
      LEFT JOIN promociones p ON p.id_promocion = c.id_promocion
      WHERE c.id_cita = $1
      `,
      [idCita]
    );

    if (rows.length === 0) return;

    const r = rows[0];
    const cliente = `${r.cliente_nombre} ${r.cliente_apellido}`.trim();
    const servicio = r.servicio_nombre || "Servicio";

    // 1) Notificación push (celular / PC)
    const pushPromise = sendPushToUser(r.barbero_id_usuario, {
      title: "✂️ Nueva cita agendada",
      body: `${cliente} · ${servicio}\n${r.fecha_txt} a las ${r.hora_txt}`,
      url: "/barbero/citas",
      tag: `cita-${idCita}`
    }).catch((error) => console.error("[PUSH] Falló:", error.message));

    // 2) Correo (respaldo)
    const emailPromise = sendNewAppointmentEmail(r.barbero_email, r.barbero_nombre, {
      cliente,
      telefono: r.cliente_telefono,
      servicio,
      fecha: r.fecha_txt,
      hora: r.hora_txt,
      precio: formatMoney(r.precio)
    }).catch((error) => console.error("[EMAIL] Error avisando al barbero:", error.message));

    await Promise.all([pushPromise, emailPromise]);
  } catch (error) {
    console.error("[NOTIFICACIONES] Error:", error.message);
  }
};

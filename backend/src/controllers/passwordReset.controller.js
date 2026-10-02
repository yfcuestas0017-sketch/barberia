import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { sendResetCode } from "../services/email.service.js";

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

// Límite de solicitudes por número (en memoria): aplica también a
// números no registrados, para no revelar cuáles existen.
const COOLDOWN_MS = 60 * 1000;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 3;
const requestLog = new Map();

const throttle = (key) => {
  const now = Date.now();
  const recent = (requestLog.get(key) || []).filter(
    (t) => now - t < WINDOW_MS
  );

  if (recent.length > 0 && now - recent[recent.length - 1] < COOLDOWN_MS) {
    return Math.ceil(
      (COOLDOWN_MS - (now - recent[recent.length - 1])) / 1000
    );
  }

  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    return Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
  }

  recent.push(now);
  requestLog.set(key, recent);

  return 0;
};

// El token de reseteo usa OTRO secreto: así nunca sirve como token de sesión.
const resetSecret = () => `${process.env.JWT_SECRET}:password-reset`;

const GENERIC_MESSAGE =
  "Si el correo está registrado, te enviamos un código.";

// Busca un usuario activo por correo (el email es único)
const normalizeEmail = (email) => String(email || "").trim().toLowerCase();

const findUser = async (email) => {
  const result = await pool.query(
    `
    SELECT id_usuario, nombre, email
    FROM usuarios
    WHERE activo = TRUE
    AND LOWER(email) = $1
    LIMIT 1
    `,
    [normalizeEmail(email)]
  );

  return result.rows[0] || null;
};


// =====================================================
// 1) Pedir código
// =====================================================
export const forgotPassword = async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({
        message: "Ingresa un correo válido."
      });
    }

    const wait = throttle(email);

    if (wait > 0) {
      return res.status(429).json({
        message: `Espera ${wait} segundos antes de pedir otro código.`,
        retry_after: wait
      });
    }

    const user = await findUser(email);

    // Sin coincidencia: misma respuesta que si existiera
    if (!user) {
      return res.json({ message: GENERIC_MESSAGE });
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const hash = await bcrypt.hash(code, 8);

    // Invalida códigos anteriores y crea el nuevo
    await pool.query(
      "UPDATE codigos_recuperacion SET usado = TRUE WHERE id_usuario = $1 AND usado = FALSE",
      [user.id_usuario]
    );

    const inserted = await pool.query(
      `
      INSERT INTO codigos_recuperacion
        (id_usuario, codigo_hash, expira_en)
      VALUES
        ($1, $2, NOW() + ($3 || ' minutes')::INTERVAL)
      RETURNING id_codigo
      `,
      [user.id_usuario, hash, String(CODE_TTL_MINUTES)]
    );

    try {
      await sendResetCode(user.email, user.nombre, code);
    } catch (sendError) {
      console.error("Error enviando correo:", sendError);

      await pool.query(
        "DELETE FROM codigos_recuperacion WHERE id_codigo = $1",
        [inserted.rows[0].id_codigo]
      );

      return res.status(502).json({
        message: "No pudimos enviar el correo. Intenta de nuevo en unos minutos."
      });
    }

    res.json({ message: GENERIC_MESSAGE });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error al solicitar el código"
    });
  }
};


// =====================================================
// 2) Verificar código -> devuelve token de un solo uso
// =====================================================
export const verifyResetCode = async (req, res) => {
  try {
    const { email, codigo } = req.body;

    const invalid = () =>
      res.status(400).json({
        message: "Código incorrecto o vencido."
      });

    if (!/^\d{6}$/.test(String(codigo || ""))) {
      return res.status(400).json({
        message: "El código debe tener 6 dígitos."
      });
    }

    const user = await findUser(email);

    if (!user) return invalid();

    const row = await pool.query(
      `
      SELECT id_codigo, codigo_hash, intentos
      FROM codigos_recuperacion
      WHERE id_usuario = $1
      AND usado = FALSE
      AND expira_en > NOW()
      ORDER BY creado_en DESC
      LIMIT 1
      `,
      [user.id_usuario]
    );

    if (row.rows.length === 0) return invalid();

    const record = row.rows[0];

    if (record.intentos >= MAX_ATTEMPTS) {
      await pool.query(
        "UPDATE codigos_recuperacion SET usado = TRUE WHERE id_codigo = $1",
        [record.id_codigo]
      );

      return res.status(429).json({
        message: "Demasiados intentos. Solicita un código nuevo."
      });
    }

    const match = await bcrypt.compare(String(codigo), record.codigo_hash);

    if (!match) {
      await pool.query(
        "UPDATE codigos_recuperacion SET intentos = intentos + 1 WHERE id_codigo = $1",
        [record.id_codigo]
      );

      return invalid();
    }

    await pool.query(
      "UPDATE codigos_recuperacion SET verificado = TRUE WHERE id_codigo = $1",
      [record.id_codigo]
    );

    const reset_token = jwt.sign(
      {
        purpose: "password_reset",
        id_codigo: record.id_codigo,
        id_usuario: user.id_usuario
      },
      resetSecret(),
      { expiresIn: `${CODE_TTL_MINUTES}m` }
    );

    res.json({
      message: "Código verificado",
      reset_token
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error al verificar el código"
    });
  }
};


// =====================================================
// 3) Guardar nueva contraseña
// =====================================================
export const resetPassword = async (req, res) => {
  try {
    const { reset_token, password } = req.body;

    if (!reset_token || !password) {
      return res.status(400).json({
        message: "Faltan datos para cambiar la contraseña"
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        message: "La contraseña debe tener al menos 6 caracteres"
      });
    }

    let payload;

    try {
      payload = jwt.verify(reset_token, resetSecret());
    } catch {
      return res.status(400).json({
        message: "El enlace de recuperación venció. Empieza de nuevo."
      });
    }

    if (payload.purpose !== "password_reset") {
      return res.status(400).json({
        message: "Token inválido"
      });
    }

    // Uso único: solo se consume si estaba verificado y sin usar
    const consumed = await pool.query(
      `
      UPDATE codigos_recuperacion
      SET usado = TRUE
      WHERE id_codigo = $1
      AND id_usuario = $2
      AND verificado = TRUE
      AND usado = FALSE
      AND expira_en > NOW()
      RETURNING id_usuario
      `,
      [payload.id_codigo, payload.id_usuario]
    );

    if (consumed.rows.length === 0) {
      return res.status(400).json({
        message: "Este código ya fue usado o venció. Empieza de nuevo."
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    await pool.query(
      "UPDATE usuarios SET password = $1 WHERE id_usuario = $2",
      [hashed, payload.id_usuario]
    );

    // Cualquier otro código pendiente queda inválido
    await pool.query(
      "UPDATE codigos_recuperacion SET usado = TRUE WHERE id_usuario = $1",
      [payload.id_usuario]
    );

    res.json({
      message: "Contraseña actualizada correctamente"
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error al cambiar la contraseña"
    });
  }
};

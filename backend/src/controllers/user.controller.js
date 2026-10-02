import pool from "../config/db.js";

export const getMyProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id_usuario,
        nombre,
        apellido,
        email,
        telefono,
        foto,
        activo,
        created_at,
        updated_at
      FROM usuarios
      WHERE id_usuario = $1
      `,
      [req.user.id_usuario]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error obteniendo perfil:", error);

    res.status(500).json({
      message: "Error al obtener el perfil"
    });
  }
};

export const updateMyProfile = async (req, res) => {
  const {
    nombre,
    apellido,
    telefono,
    foto
  } = req.body;

  if (!nombre || !apellido) {
    return res.status(400).json({
      message: "El nombre y apellido son obligatorios"
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE usuarios
      SET
        nombre = $1,
        apellido = $2,
        telefono = $3,
        foto = $4,
        updated_at = CURRENT_TIMESTAMP
      WHERE id_usuario = $5
      RETURNING
        id_usuario,
        nombre,
        apellido,
        email,
        telefono,
        foto,
        activo,
        updated_at
      `,
      [
        nombre.trim(),
        apellido.trim(),
        telefono?.trim() || null,
        foto?.trim() || null,
        req.user.id_usuario
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    res.json({
      message: "Perfil actualizado correctamente",
      user: result.rows[0]
    });
  } catch (error) {
    console.error("Error actualizando perfil:", error);

    res.status(500).json({
      message: "Error al actualizar el perfil"
    });
  }
};

import bcrypt from "bcryptjs";

export const updatePassword = async (req, res) => {
  const { password_actual, password_nuevo } = req.body;
  if (!password_actual || !password_nuevo) {
    return res.status(400).json({ message: "Se requieren las contraseñas" });
  }

  try {
    const result = await pool.query(
      `SELECT password FROM usuarios WHERE id_usuario = $1`,
      [req.user.id_usuario]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const match = await bcrypt.compare(password_actual, result.rows[0].password);
    if (!match) {
      return res.status(401).json({ message: "La contraseña actual es incorrecta" });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password_nuevo, salt);

    await pool.query(
      `UPDATE usuarios SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id_usuario = $2`,
      [hash, req.user.id_usuario]
    );

    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Error actualizando contraseña:", error);
    res.status(500).json({ message: "Error al actualizar la contraseña" });
  }
};
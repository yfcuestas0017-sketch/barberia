import pool from "../config/db.js";

const PROMOTION_SELECT = `
  SELECT
    p.*,
    p.fecha_inicio::text AS fecha_inicio,
    p.fecha_fin::text AS fecha_fin
  FROM promociones p
`;

// ADMIN: todas las promociones (activas e inactivas)
export const getPromotions = async (req, res) => {
  try {
    const result = await pool.query(`
      ${PROMOTION_SELECT}
      ORDER BY p.fecha_inicio DESC, p.id_promocion DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener promociones" });
  }
};


// CLIENTE: solo promociones que se pueden reservar hoy
// (activas y dentro de su rango de fechas)
export const getAvailablePromotions = async (req, res) => {
  try {
    const result = await pool.query(`
      ${PROMOTION_SELECT}
      WHERE p.activo = TRUE
        AND CURRENT_DATE BETWEEN p.fecha_inicio AND p.fecha_fin
      ORDER BY p.fecha_fin ASC, p.id_promocion DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener promociones disponibles" });
  }
};


export const getPromotionById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `${PROMOTION_SELECT} WHERE p.id_promocion = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Promoción no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener promoción" });
  }
};


const validatePromotionBody = ({
  nombre,
  precio,
  duracion_minutos,
  fecha_inicio,
  fecha_fin
}) => {
  if (
    !nombre ||
    precio === undefined ||
    precio === "" ||
    !duracion_minutos ||
    !fecha_inicio ||
    !fecha_fin
  ) {
    return "Nombre, precio, duración y fechas son obligatorios";
  }

  if (Number(precio) < 0) {
    return "El precio no puede ser negativo";
  }

  if (Number(duracion_minutos) <= 0) {
    return "La duración debe ser mayor que cero";
  }

  if (fecha_fin < fecha_inicio) {
    return "La fecha final no puede ser anterior a la inicial";
  }

  return null;
};


export const createPromotion = async (req, res) => {
  try {
    const {
      nombre,
      descripcion,
      precio,
      duracion_minutos,
      foto,
      fecha_inicio,
      fecha_fin
    } = req.body;

    const validationError = validatePromotionBody(req.body);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const result = await pool.query(
      `
      INSERT INTO promociones
        (nombre, descripcion, precio, duracion_minutos, foto, fecha_inicio, fecha_fin)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        nombre.trim(),
        descripcion || null,
        Number(precio),
        Number(duracion_minutos),
        foto || null,
        fecha_inicio,
        fecha_fin
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear promoción" });
  }
};


export const updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      nombre,
      descripcion,
      precio,
      duracion_minutos,
      foto,
      fecha_inicio,
      fecha_fin,
      activo
    } = req.body;

    const validationError = validatePromotionBody(req.body);

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const result = await pool.query(
      `
      UPDATE promociones
      SET
        nombre = $1,
        descripcion = $2,
        precio = $3,
        duracion_minutos = $4,
        foto = COALESCE($5, foto),
        fecha_inicio = $6,
        fecha_fin = $7,
        activo = COALESCE($8, activo),
        updated_at = CURRENT_TIMESTAMP
      WHERE id_promocion = $9
      RETURNING *
      `,
      [
        nombre.trim(),
        descripcion || null,
        Number(precio),
        Number(duracion_minutos),
        foto || null,
        fecha_inicio,
        fecha_fin,
        activo !== undefined ? activo : null,
        id
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Promoción no encontrada" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar promoción" });
  }
};


// ADMIN: activar / desactivar
export const setPromotionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { activo } = req.body;

    if (typeof activo !== "boolean") {
      return res.status(400).json({
        message: "El campo 'activo' debe ser verdadero o falso"
      });
    }

    const result = await pool.query(
      `
      UPDATE promociones
      SET activo = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id_promocion = $2
      RETURNING *
      `,
      [activo, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Promoción no encontrada" });
    }

    res.json({
      message: activo
        ? "Promoción activada correctamente"
        : "Promoción desactivada correctamente",
      promocion: result.rows[0]
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al cambiar el estado de la promoción" });
  }
};


// ADMIN: eliminar. Si ya tiene citas, no se puede borrar (hay que desactivarla)
export const deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM promociones WHERE id_promocion = $1 RETURNING id_promocion",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Promoción no encontrada" });
    }

    res.json({ message: "Promoción eliminada correctamente" });
  } catch (error) {
    // 23503 = violación de llave foránea (la promoción tiene citas)
    if (error.code === "23503") {
      return res.status(409).json({
        message:
          "Esta promoción ya tiene citas registradas y no se puede eliminar. Desactívala para que deje de mostrarse."
      });
    }

    console.error(error);
    res.status(500).json({ message: "Error al eliminar promoción" });
  }
};

import pool from "../config/db.js";

export const getServices = async (req, res) => {
  try {

    // ?solo_activos=true -> uso del cliente; sin parámetro -> admin ve todos
    const onlyActive = req.query.solo_activos === "true";

    const result = await pool.query(`
      SELECT *
      FROM servicios
      ${onlyActive ? "WHERE activo = TRUE" : ""}
      ORDER BY id_servicio DESC
    `);

    res.json(result.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error al obtener servicios",
    });
  }
};


export const getServiceById = async (req, res) => {

  try {

    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT *
      FROM servicios
      WHERE id_servicio = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Servicio no encontrado",
      });
    }

    res.json(result.rows[0]);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error al obtener servicio",
    });
  }
};


export const createService = async (req, res) => {

  try {

    const {
      nombre,
      descripcion,
      precio,
      duracion_minutos,
      foto,
    } = req.body;

    if (
      !nombre ||
      precio === undefined ||
      !duracion_minutos
    ) {
      return res.status(400).json({
        message: "Faltan datos obligatorios",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO servicios
      (
        nombre,
        descripcion,
        precio,
        duracion_minutos,
        foto
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        nombre,
        descripcion || null,
        precio,
        duracion_minutos,
        foto || null,
      ]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error al crear servicio",
    });
  }
};


export const updateService = async (req, res) => {

  try {

    const { id } = req.params;

    const {
      nombre,
      descripcion,
      precio,
      duracion_minutos,
      foto,
      activo,
    } = req.body;

    const result = await pool.query(
      `
      UPDATE servicios
      SET
        nombre = $1,
        descripcion = $2,
        precio = $3,
        duracion_minutos = $4,
        foto = COALESCE($5, foto),
        activo = COALESCE($6, activo),
        updated_at = CURRENT_TIMESTAMP
      WHERE id_servicio = $7
      RETURNING *
      `,
      [
        nombre,
        descripcion,
        precio,
        duracion_minutos,
        foto || null,
        activo !== undefined ? activo : null,
        id,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Servicio no encontrado",
      });
    }

    res.json(result.rows[0]);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error al actualizar servicio",
    });
  }
};


// ADMIN: activar / desactivar
export const setServiceStatus = async (req, res) => {

  try {

    const { id } = req.params;
    const { activo } = req.body;

    if (typeof activo !== "boolean") {
      return res.status(400).json({
        message: "El campo 'activo' debe ser verdadero o falso",
      });
    }

    const result = await pool.query(
      `
      UPDATE servicios
      SET
        activo = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id_servicio = $2
      RETURNING *
      `,
      [activo, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Servicio no encontrado",
      });
    }

    res.json({
      message: activo
        ? "Servicio activado correctamente"
        : "Servicio desactivado correctamente",
      servicio: result.rows[0],
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error al cambiar el estado del servicio",
    });
  }
};


// ADMIN: eliminar definitivamente
// Sus promociones se eliminan con él. Si ya tiene citas, no se puede borrar.
export const deleteService = async (req, res) => {

  try {

    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM servicios
      WHERE id_servicio = $1
      RETURNING id_servicio
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Servicio no encontrado",
      });
    }

    res.json({
      message: "Servicio eliminado correctamente",
    });

  } catch (error) {

    // 23503 = violación de llave foránea (tiene citas asociadas)
    if (error.code === "23503") {
      return res.status(409).json({
        message:
          "No se puede eliminar: el servicio tiene citas registradas. Puedes desactivarlo en su lugar.",
      });
    }

    console.error(error);

    res.status(500).json({
      message: "Error al eliminar servicio",
    });
  }
};

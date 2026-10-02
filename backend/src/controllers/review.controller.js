import pool from "../config/db.js";

export const createReview = async (req, res) => {
  try {
    const { id_cita, estrellas, comentario } = req.body;

    if (!id_cita || !estrellas) {
      return res.status(400).json({
        message: "La cita y las estrellas son obligatorias"
      });
    }

    if (estrellas < 1 || estrellas > 5) {
      return res.status(400).json({
        message: "Las estrellas deben estar entre 1 y 5"
      });
    }

    // Buscar la cita perteneciente al cliente autenticado
    const appointmentResult = await pool.query(
      `
      SELECT
        c.id_cita,
        c.id_barbero,
        c.id_cliente,
        c.estado
      FROM citas c
      WHERE c.id_cita = $1
      AND c.id_cliente = $2
      `,
      [id_cita, req.user.id_usuario]
    );

    if (appointmentResult.rows.length === 0) {
      return res.status(404).json({
        message: "Cita no encontrada"
      });
    }

    const cita = appointmentResult.rows[0];

    if (cita.estado !== "COMPLETADA") {
      return res.status(400).json({
        message: "Solo puedes reseñar citas completadas"
      });
    }

    // Evitar dos reseñas para la misma cita
    const existingReview = await pool.query(
      `
      SELECT id_resena
      FROM resenas
      WHERE id_cita = $1
      `,
      [id_cita]
    );

    if (existingReview.rows.length > 0) {
      return res.status(400).json({
        message: "Esta cita ya tiene una reseña"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO resenas (
        id_cita,
        id_cliente,
        id_barbero,
        estrellas,
        comentario
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        id_cita,
        req.user.id_usuario,
        cita.id_barbero,
        estrellas,
        comentario || null
      ]
    );

    res.status(201).json({
      message: "Reseña creada correctamente",
      resena: result.rows[0]
    });

  } catch (error) {
    console.error("Error creando reseña:", error);

    res.status(500).json({
      message: "Error al crear la reseña"
    });
  }
};

export const getBarberReviews = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        r.id_resena,
        r.estrellas,
        r.comentario,
        r.created_at,
        u.nombre,
        u.apellido
      FROM resenas r
      INNER JOIN usuarios u
        ON u.id_usuario = r.id_cliente
      WHERE r.id_barbero = $1
      ORDER BY r.created_at DESC
      `,
      [id]
    );

    res.json(result.rows);

  } catch (error) {
    console.error("Error obteniendo reseñas:", error);

    res.status(500).json({
      message: "Error al obtener reseñas"
    });
  }
};

export const getMyReviews = async (req, res) => {
  try {
    const barberResult = await pool.query(
      `
      SELECT id_barbero
      FROM barberos
      WHERE id_usuario = $1
      AND activo = TRUE
      `,
      [req.user.id_usuario]
    );

    if (barberResult.rows.length === 0) {
      return res.status(404).json({
        message: "Barbero no encontrado"
      });
    }

    const idBarbero = barberResult.rows[0].id_barbero;

    const result = await pool.query(
      `
      SELECT
        r.id_resena,
        r.estrellas,
        r.comentario,
        r.created_at,
        u.nombre,
        u.apellido
      FROM resenas r
      INNER JOIN usuarios u
        ON u.id_usuario = r.id_cliente
      WHERE r.id_barbero = $1
      ORDER BY r.created_at DESC
      `,
      [idBarbero]
    );

    res.json(result.rows);

  } catch (error) {
    console.error("Error obteniendo mis reseñas:", error);

    res.status(500).json({
      message: "Error al obtener reseñas"
    });
  }
};
export const getAllReviews = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        r.id_resena,
        r.id_cita,
        r.id_cliente,
        r.id_barbero,
        r.estrellas,
        r.comentario,
        r.created_at,

        cliente.nombre AS cliente_nombre,
        cliente.apellido AS cliente_apellido,

        barbero.nombre AS barbero_nombre,
        barbero.apellido AS barbero_apellido,

        COALESCE(pr.nombre, s.nombre) AS servicio_nombre,

        c.fecha AS cita_fecha,
        c.hora_inicio AS cita_hora

      FROM resenas r

      INNER JOIN usuarios cliente
        ON cliente.id_usuario = r.id_cliente

      INNER JOIN barberos b
        ON b.id_barbero = r.id_barbero

      INNER JOIN usuarios barbero
        ON barbero.id_usuario = b.id_usuario

      INNER JOIN citas c
        ON c.id_cita = r.id_cita

      LEFT JOIN servicios s
        ON s.id_servicio = c.id_servicio

      LEFT JOIN promociones pr
        ON pr.id_promocion = c.id_promocion

      ORDER BY r.created_at DESC
    `);

    res.json(result.rows);

  } catch (error) {
    console.error("Error obteniendo todas las reseñas:", error);

    res.status(500).json({
      message: "Error al obtener las reseñas"
    });
  }
};
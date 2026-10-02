import pool from "../config/db.js";


export const getMySchedules = async (req, res) => {
  try {

    const idUsuario = req.user.id_usuario;

    const barberResult = await pool.query(
      `
      SELECT id_barbero
      FROM barberos
      WHERE id_usuario = $1
      `,
      [idUsuario]
    );

    if (barberResult.rows.length === 0) {
      return res.status(404).json({
        message: "El usuario no es un barbero"
      });
    }

    const idBarbero =
      barberResult.rows[0].id_barbero;

    const result = await pool.query(
      `
      SELECT *
      FROM horarios_barbero
      WHERE id_barbero = $1
      ORDER BY fecha, hora_inicio
      `,
      [idBarbero]
    );

    res.json(result.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error al obtener horarios"
    });
  }
};


export const createSchedule = async (req, res) => {
  try {

    const idUsuario = req.user.id_usuario;

    const {
      fecha,
      hora_inicio,
      hora_fin,
      duracion_corte
    } = req.body;

    if (
      !fecha ||
      !hora_inicio ||
      !hora_fin
    ) {
      return res.status(400).json({
        message: "Fecha y horario son obligatorios"
      });
    }

    if (hora_inicio >= hora_fin) {
      return res.status(400).json({
        message: "La hora de salida debe ser posterior a la de ingreso"
      });
    }

    // Minutos por corte (opcional). Debe caber al menos un corte.
    let minutosCorte = null;

    if (
      duracion_corte !== undefined &&
      duracion_corte !== null &&
      duracion_corte !== ""
    ) {
      minutosCorte = Number(duracion_corte);

      const toMin = (t) => {
        const [h, m] = String(t).slice(0, 5).split(":").map(Number);
        return h * 60 + m;
      };

      if (
        !Number.isInteger(minutosCorte) ||
        minutosCorte < 5 ||
        minutosCorte > 240
      ) {
        return res.status(400).json({
          message: "Los minutos por corte deben estar entre 5 y 240"
        });
      }

      if (minutosCorte > toMin(hora_fin) - toMin(hora_inicio)) {
        return res.status(400).json({
          message: "El corte dura más que el horario seleccionado"
        });
      }
    }

    const barberResult = await pool.query(
      `
      SELECT id_barbero
      FROM barberos
      WHERE id_usuario = $1
      AND activo = TRUE
      `,
      [idUsuario]
    );

    if (barberResult.rows.length === 0) {
      return res.status(404).json({
        message: "Barbero no encontrado"
      });
    }

    const idBarbero =
      barberResult.rows[0].id_barbero;

    /*
      Verificamos que el nuevo horario
      no se cruce con otro horario
      del mismo barbero.
    */

    const overlap = await pool.query(
      `
      SELECT id_horario
      FROM horarios_barbero
      WHERE id_barbero = $1
      AND fecha = $2
      AND hora_inicio < $4
      AND hora_fin > $3
      `,
      [
        idBarbero,
        fecha,
        hora_inicio,
        hora_fin
      ]
    );

    if (overlap.rows.length > 0) {
      return res.status(409).json({
        message: "El horario se cruza con otro horario existente"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO horarios_barbero
      (
        id_barbero,
        fecha,
        hora_inicio,
        hora_fin,
        duracion_corte
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [
        idBarbero,
        fecha,
        hora_inicio,
        hora_fin,
        minutosCorte
      ]
    );

    res.status(201).json({
      message: "Horario creado correctamente",
      horario: result.rows[0]
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error al crear horario"
    });
  }
};


export const deleteSchedule = async (req, res) => {
  try {

    const idUsuario = req.user.id_usuario;
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM horarios_barbero h
      USING barberos b
      WHERE h.id_horario = $1
      AND h.id_barbero = b.id_barbero
      AND b.id_usuario = $2
      RETURNING h.*
      `,
      [
        id,
        idUsuario
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Horario no encontrado"
      });
    }

    res.json({
      message: "Horario eliminado correctamente"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message: "Error al eliminar horario"
    });
  }
};
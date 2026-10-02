import pool from "../config/db.js";


// =====================================================
// Resuelve qué se está reservando: un SERVICIO normal o una PROMOCIÓN.
// Devuelve { ok, ... } con precio y duración, o { ok:false, status, message }
// =====================================================
const resolveOffer = async (db, { id_servicio, id_promocion, fecha }) => {

  if (id_promocion) {

    const promo = await db.query(
      `
      SELECT id_promocion, nombre, precio, duracion_minutos
      FROM promociones
      WHERE id_promocion = $1
      AND activo = TRUE
      AND $2::DATE BETWEEN fecha_inicio AND fecha_fin
      `,
      [id_promocion, fecha]
    );

    if (promo.rows.length === 0) {
      return {
        ok: false,
        status: 400,
        message:
          "La promoción no está disponible para la fecha elegida"
      };
    }

    return {
      ok: true,
      id_servicio: null,
      id_promocion: promo.rows[0].id_promocion,
      nombre: promo.rows[0].nombre,
      precio: promo.rows[0].precio,
      duracion_minutos: Number(promo.rows[0].duracion_minutos)
    };
  }

  const service = await db.query(
    `
    SELECT id_servicio, nombre, precio, duracion_minutos
    FROM servicios
    WHERE id_servicio = $1
    AND activo = TRUE
    `,
    [id_servicio]
  );

  if (service.rows.length === 0) {
    return {
      ok: false,
      status: 404,
      message: "Servicio no encontrado"
    };
  }

  return {
    ok: true,
    id_servicio: service.rows[0].id_servicio,
    id_promocion: null,
    nombre: service.rows[0].nombre,
    precio: service.rows[0].precio,
    duracion_minutos: Number(service.rows[0].duracion_minutos)
  };
};


// =====================================================
// OBTENER HORARIOS DISPONIBLES
// =====================================================

export const getAvailableSlots = async (req, res) => {

  try {

    const {
      id_barbero,
      id_servicio,
      id_promocion,
      fecha
    } = req.query;

    if (
      !id_barbero ||
      (!id_servicio && !id_promocion) ||
      !fecha
    ) {
      return res.status(400).json({
        message:
          "Barbero, servicio o promoción y fecha son obligatorios"
      });
    }


    // ---------------------------------------------
    // Duración del servicio o de la promoción
    // ---------------------------------------------

    const offer = await resolveOffer(pool, {
      id_servicio,
      id_promocion,
      fecha
    });

    if (!offer.ok) {
      return res.status(offer.status).json({
        message: offer.message
      });
    }

    const duration = offer.duracion_minutos;


    // ---------------------------------------------
    // Obtener horarios del barbero
    // ---------------------------------------------

    const scheduleResult = await pool.query(
      `
      SELECT
        hora_inicio,
        hora_fin,
        duracion_corte
      FROM horarios_barbero
      WHERE id_barbero = $1
      AND fecha = $2
      ORDER BY hora_inicio
      `,
      [
        id_barbero,
        fecha
      ]
    );

    if (scheduleResult.rows.length === 0) {
      return res.json({
        disponibles: []
      });
    }


    // ---------------------------------------------
    // Obtener citas existentes
    // ---------------------------------------------

    const appointmentsResult = await pool.query(
      `
      SELECT
        hora_inicio,
        hora_fin
      FROM citas
      WHERE id_barbero = $1
      AND fecha = $2
      AND estado IN (
        'PENDIENTE',
        'CONFIRMADA'
      )
      ORDER BY hora_inicio
      `,
      [
        id_barbero,
        fecha
      ]
    );


    const appointments =
      appointmentsResult.rows;


    // ---------------------------------------------
    // Funciones auxiliares
    // ---------------------------------------------

    const timeToMinutes = (time) => {

      const [hours, minutes] =
        time.substring(0, 5)
          .split(":")
          .map(Number);

      return hours * 60 + minutes;
    };


    const minutesToTime = (minutes) => {

      const hours =
        Math.floor(minutes / 60);

      const mins =
        minutes % 60;

      return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
    };


    // ---------------------------------------------
    // Generar disponibilidad
    // ---------------------------------------------

    const disponibles = [];

    for (const schedule of scheduleResult.rows) {

      const start =
        timeToMinutes(
          schedule.hora_inicio
        );

      const end =
        timeToMinutes(
          schedule.hora_fin
        );


      // Si el barbero definió minutos por corte, cada turno dura
      // exactamente ese tiempo y la cita ocupa los turnos completos
      // que necesite el servicio (ej.: servicio de 45 min con cortes
      // de 30 min ocupa 2 turnos = 60 min). Sin minutos por corte
      // se usa la duración del servicio, como antes.
      const cut =
        Number(schedule.duracion_corte) > 0
          ? Number(schedule.duracion_corte)
          : 0;

      const step = cut || duration;

      const length =
        cut
          ? Math.ceil(duration / cut) * cut
          : duration;

      for (
        let current = start;
        current + length <= end;
        current += step
      ) {

        const slotStart = current;

        const slotEnd =
          current + length;


        const occupied =
          appointments.some((appointment) => {

            const appointmentStart =
              timeToMinutes(
                appointment.hora_inicio
              );

            const appointmentEnd =
              timeToMinutes(
                appointment.hora_fin
              );

            return (
              slotStart < appointmentEnd &&
              slotEnd > appointmentStart
            );
          });


        if (!occupied) {

          disponibles.push({
            hora_inicio:
              minutesToTime(slotStart),

            hora_fin:
              minutesToTime(slotEnd)
          });

        }
      }
    }


    res.json({
      id_barbero: Number(id_barbero),
      id_servicio: id_servicio ? Number(id_servicio) : null,
      id_promocion: id_promocion ? Number(id_promocion) : null,
      fecha,
      duracion_minutos: duration,
      disponibles
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        "Error al obtener disponibilidad"
    });
  }
};

export const createAppointment = async (req, res) => {

  const client = await pool.connect();

  try {

    const idCliente =
      req.user.id_usuario;

    const {
      id_barbero,
      id_servicio,
      id_promocion,
      fecha,
      hora_inicio
    } = req.body;


    if (
      !id_barbero ||
      (!id_servicio && !id_promocion) ||
      !fecha ||
      !hora_inicio
    ) {
      return res.status(400).json({
        message:
          "Faltan datos para crear la cita"
      });
    }


    await client.query("BEGIN");


    // ---------------------------------------------
    // Servicio normal o promoción (define precio y duración)
    // ---------------------------------------------

    const offer = await resolveOffer(client, {
      id_servicio,
      id_promocion,
      fecha
    });

    if (!offer.ok) {

      await client.query("ROLLBACK");

      return res.status(offer.status).json({
        message: offer.message
      });
    }


    // ---------------------------------------------
    // Validar que el barbero esté activo
    // ---------------------------------------------

    const barberActive = await client.query(
      `
      SELECT id_barbero
      FROM barberos
      WHERE id_barbero = $1
      AND activo = TRUE
      `,
      [id_barbero]
    );

    if (barberActive.rows.length === 0) {

      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "El barbero seleccionado no está disponible"
      });
    }


    // ---------------------------------------------
    // Ubicar el bloque de horario del barbero y calcular
    // la hora final según sus turnos
    // ---------------------------------------------

    const [hours, minutes] =
      hora_inicio
        .substring(0, 5)
        .split(":")
        .map(Number);

    const startMinutes =
      hours * 60 + minutes;

    const blockResult =
      await client.query(
        `
        SELECT hora_inicio, hora_fin, duracion_corte
        FROM horarios_barbero
        WHERE id_barbero = $1
        AND fecha = $2
        AND hora_inicio <= $3::TIME
        AND hora_fin > $3::TIME
        `,
        [
          id_barbero,
          fecha,
          hora_inicio
        ]
      );

    if (blockResult.rows.length === 0) {

      await client.query("ROLLBACK");

      return res.status(409).json({
        message:
          "El horario seleccionado está fuera del horario del barbero"
      });
    }

    const block = blockResult.rows[0];

    const toMin = (t) => {
      const [h, m] = String(t).substring(0, 5).split(":").map(Number);
      return h * 60 + m;
    };

    const blockStart = toMin(block.hora_inicio);
    const blockEnd = toMin(block.hora_fin);

    const cut =
      Number(block.duracion_corte) > 0
        ? Number(block.duracion_corte)
        : 0;

    const length =
      cut
        ? Math.ceil(offer.duracion_minutos / cut) * cut
        : offer.duracion_minutos;

    // Con minutos por corte, la cita debe iniciar en un turno exacto
    if (cut && (startMinutes - blockStart) % cut !== 0) {

      await client.query("ROLLBACK");

      return res.status(409).json({
        message:
          "El horario seleccionado no corresponde a un turno del barbero"
      });
    }

    const endMinutes =
      startMinutes + length;

    if (endMinutes > blockEnd) {

      await client.query("ROLLBACK");

      return res.status(409).json({
        message:
          "El horario seleccionado está fuera del horario del barbero"
      });
    }

    const hora_fin =
      `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;


    // ---------------------------------------------
    // Verificar que no exista otra cita cruzada
    // ---------------------------------------------

    const conflictResult =
      await client.query(
        `
        SELECT id_cita
        FROM citas
        WHERE id_barbero = $1
        AND fecha = $2
        AND estado IN (
          'PENDIENTE',
          'CONFIRMADA'
        )
        AND hora_inicio < $4::TIME
        AND hora_fin > $3::TIME
        FOR UPDATE
        `,
        [
          id_barbero,
          fecha,
          hora_inicio,
          hora_fin
        ]
      );


    if (conflictResult.rows.length > 0) {

      await client.query("ROLLBACK");

      return res.status(409).json({
        message:
          "El horario acaba de ser ocupado"
      });
    }


    // ---------------------------------------------
    // Crear cita
    // ---------------------------------------------

    const appointmentResult =
      await client.query(
        `
        INSERT INTO citas
        (
          id_cliente,
          id_barbero,
          id_servicio,
          fecha,
          hora_inicio,
          hora_fin,
          precio,
          estado,
          id_promocion
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7,
          'CONFIRMADA',
          $8
        )
        RETURNING *
        `,
        [
          idCliente,
          id_barbero,
          offer.id_servicio,
          fecha,
          hora_inicio,
          hora_fin,
          offer.precio,
          offer.id_promocion
        ]
      );


    await client.query("COMMIT");


    res.status(201).json({
      message:
        "Cita agendada correctamente",

      cita:
        appointmentResult.rows[0]
    });


  } catch (error) {

    await client.query("ROLLBACK");

    console.error(error);

    res.status(500).json({
      message:
        "Error al crear cita"
    });

  } finally {

    client.release();
  }
};

export const getMyAppointments = async (req, res) => {

  try {

    const idCliente =
      req.user.id_usuario;

    const result =
      await pool.query(
        `
        SELECT
          c.*,

          COALESCE(p.nombre, s.nombre) AS servicio_nombre,
          COALESCE(p.duracion_minutos, s.duracion_minutos) AS duracion_minutos,
          (c.id_promocion IS NOT NULL) AS es_promocion,

          b.id_barbero,

          u.nombre AS barbero_nombre,
          u.apellido AS barbero_apellido,
          u.foto AS barbero_foto

        FROM citas c

        LEFT JOIN servicios s
          ON s.id_servicio = c.id_servicio

        LEFT JOIN promociones p
          ON p.id_promocion = c.id_promocion

        INNER JOIN barberos b
          ON b.id_barbero = c.id_barbero

        INNER JOIN usuarios u
          ON u.id_usuario = b.id_usuario

        WHERE c.id_cliente = $1

        ORDER BY
          c.fecha DESC,
          c.hora_inicio DESC
        `,
        [idCliente]
      );


    res.json(result.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        "Error al obtener tus citas"
    });
  }
};

export const getMyBarberAppointments = async (req, res) => {

  try {

    const idUsuario =
      req.user.id_usuario;


    const barberResult =
      await pool.query(
        `
        SELECT id_barbero
        FROM barberos
        WHERE id_usuario = $1
        `,
        [idUsuario]
      );


    if (barberResult.rows.length === 0) {

      return res.status(404).json({
        message:
          "Barbero no encontrado"
      });
    }


    const idBarbero =
      barberResult.rows[0].id_barbero;


    const result =
      await pool.query(
        `
        SELECT
          c.*,

          COALESCE(p.nombre, s.nombre) AS servicio_nombre,
          (c.id_promocion IS NOT NULL) AS es_promocion,

          u.nombre AS cliente_nombre,
          u.apellido AS cliente_apellido,
          u.telefono AS cliente_telefono

        FROM citas c

        LEFT JOIN servicios s
          ON s.id_servicio = c.id_servicio

        LEFT JOIN promociones p
          ON p.id_promocion = c.id_promocion

        INNER JOIN usuarios u
          ON u.id_usuario = c.id_cliente

        WHERE c.id_barbero = $1

        ORDER BY
          c.fecha DESC,
          c.hora_inicio DESC
        `,
        [idBarbero]
      );


    res.json(result.rows);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      message:
        "Error al obtener citas"
    });
  }
};

export const updateAppointmentStatus = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { estado } = req.body;

    const validStatuses = ["PENDIENTE", "CONFIRMADA", "COMPLETADA", "CANCELADA"];
    if (!validStatuses.includes(estado)) {
      client.release();
      return res.status(400).json({ message: "Estado no válido" });
    }

    await client.query("BEGIN");

    // Bloqueamos la fila para saber el estado anterior y evitar condiciones de carrera
    const currentResult = await client.query(
      `
      SELECT c.estado, c.id_servicio, c.id_promocion, c.precio, c.fecha
      FROM citas c
      INNER JOIN barberos b ON b.id_barbero = c.id_barbero
      WHERE c.id_cita = $1
      AND b.id_usuario = $2
      FOR UPDATE OF c
      `,
      [id, req.user.id_usuario]
    );

    if (currentResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Cita no encontrada" });
    }

    const estadoAnterior = currentResult.rows[0].estado;

    const result = await client.query(
      `
      UPDATE citas
      SET estado = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id_cita = $2
      RETURNING *
      `,
      [estado, id]
    );

    const cita = result.rows[0];

    // Al completar una cita por primera vez, registramos el ingreso correspondiente
    if (estado === "COMPLETADA" && estadoAnterior !== "COMPLETADA") {
      let concepto = "Servicio";

      if (cita.id_promocion) {
        const promoResult = await client.query(
          `SELECT nombre FROM promociones WHERE id_promocion = $1`,
          [cita.id_promocion]
        );

        concepto = `Promoción: ${promoResult.rows[0]?.nombre || "Promoción"}`;
      } else {
        const serviceResult = await client.query(
          `SELECT nombre FROM servicios WHERE id_servicio = $1`,
          [cita.id_servicio]
        );

        concepto = `Servicio: ${serviceResult.rows[0]?.nombre || "Servicio"}`;
      }

      await client.query(
        `
        INSERT INTO movimientos
          (tipo, concepto, monto, fecha, id_usuario, id_cita, observacion)
        VALUES
          ('INGRESO', $1, $2, $3, $4, $5, $6)
        `,
        [
          concepto,
          cita.precio,
          cita.fecha,
          req.user.id_usuario,
          cita.id_cita,
          "Generado automáticamente al completar la cita"
        ]
      );
    }

    await client.query("COMMIT");

    res.json({ message: "Estado actualizado", cita });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating status:", error);
    res.status(500).json({ message: "Error al actualizar la cita" });
  } finally {
    client.release();
  }
};

export const getAdminAppointments = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id_cita,
        c.id_cliente,
        c.id_barbero,
        c.id_servicio,
        c.fecha,
        c.hora_inicio,
        c.hora_fin,
        c.precio,
        c.estado,
        c.observacion,

        cliente.nombre AS cliente_nombre,
        cliente.apellido AS cliente_apellido,
        cliente.email AS cliente_email,
        cliente.telefono AS cliente_telefono,

        u_barbero.nombre AS barbero_nombre,
        u_barbero.apellido AS barbero_apellido,

        b.especialidad,

        COALESCE(p.nombre, s.nombre) AS servicio_nombre,
        (c.id_promocion IS NOT NULL) AS es_promocion

      FROM citas c

      INNER JOIN usuarios cliente
        ON cliente.id_usuario = c.id_cliente

      INNER JOIN barberos b
        ON b.id_barbero = c.id_barbero

      INNER JOIN usuarios u_barbero
        ON u_barbero.id_usuario = b.id_usuario

      LEFT JOIN servicios s
        ON s.id_servicio = c.id_servicio

      LEFT JOIN promociones p
        ON p.id_promocion = c.id_promocion

      ORDER BY
        c.fecha DESC,
        c.hora_inicio DESC
    `);

    res.json(result.rows);

  } catch (error) {
    console.error(
      "Error obteniendo citas del administrador:",
      error
    );

    res.status(500).json({
      message: "Error al obtener las citas"
    });
  }
};

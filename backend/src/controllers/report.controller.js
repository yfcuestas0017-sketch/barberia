import pool from "../config/db.js";

// Porcentaje de los ingresos por servicios que se considera utilidad del barbero.
// Configurable con COMISION_BARBERO en el .env (por defecto 50).
const COMISION_BARBERO = Number(process.env.COMISION_BARBERO ?? 50);

const calcularUtilidadBarbero = (ingresos) =>
  Math.round((Number(ingresos || 0) * COMISION_BARBERO) / 100);

// Fecha local (YYYY-MM-DD). Evita el desfase de toISOString() que usa UTC.
const localDate = (date = new Date()) => date.toLocaleDateString("en-CA");

// Si no llega un período, se usa el mes en curso (del día 1 a hoy)
const resolvePeriod = (fecha_inicio, fecha_fin) => {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  return {
    fechaInicio: fecha_inicio || localDate(monthStart),
    fechaFin: fecha_fin || localDate(today)
  };
};

// Detalle de cada servicio / promoción completado en el período
const DETAIL_SELECT = `
  SELECT
    c.id_cita,
    c.fecha::text AS fecha,
    c.hora_inicio,
    c.precio,
    COALESCE(p.nombre, s.nombre) AS servicio_nombre,
    (c.id_promocion IS NOT NULL) AS es_promocion,
    cli.nombre AS cliente_nombre,
    cli.apellido AS cliente_apellido,
    ub.nombre AS barbero_nombre,
    ub.apellido AS barbero_apellido
  FROM citas c
  LEFT JOIN servicios s ON s.id_servicio = c.id_servicio
  LEFT JOIN promociones p ON p.id_promocion = c.id_promocion
  INNER JOIN usuarios cli ON cli.id_usuario = c.id_cliente
  INNER JOIN barberos b ON b.id_barbero = c.id_barbero
  INNER JOIN usuarios ub ON ub.id_usuario = b.id_usuario
  WHERE c.estado = 'COMPLETADA'
    AND c.fecha BETWEEN $1 AND $2
`;

const withUtility = (rows) =>
  rows.map((row) => ({
    ...row,
    utilidad: calcularUtilidadBarbero(row.precio)
  }));

// ==========================================
// REPORTES DEL ADMINISTRADOR
// ==========================================
export const getAdminReport = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = resolvePeriod(
      req.query.fecha_inicio,
      req.query.fecha_fin
    );

    // ------------------------------------------
    // RESUMEN DE INGRESOS Y EGRESOS
    // ------------------------------------------
    const summaryResult = await pool.query(
      `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN tipo = 'INGRESO' THEN monto
              ELSE 0
            END
          ),
          0
        ) AS ingresos,

        COALESCE(
          SUM(
            CASE
              WHEN tipo = 'EGRESO' THEN monto
              ELSE 0
            END
          ),
          0
        ) AS egresos

      FROM movimientos
      WHERE fecha BETWEEN $1 AND $2
      `,
      [fechaInicio, fechaFin]
    );

    const ingresos = Number(summaryResult.rows[0].ingresos);
    const egresos = Number(summaryResult.rows[0].egresos);
    const utilidad = ingresos - egresos;

    // ------------------------------------------
    // RESUMEN DE CITAS
    // ------------------------------------------
    const appointmentsResult = await pool.query(
      `
      SELECT
        COUNT(*) AS total,

        COUNT(*) FILTER (
          WHERE estado = 'COMPLETADA'
        ) AS completadas,

        COUNT(*) FILTER (
          WHERE estado = 'CANCELADA'
        ) AS canceladas,

        COUNT(*) FILTER (
          WHERE estado = 'PENDIENTE'
        ) AS pendientes,

        COUNT(*) FILTER (
          WHERE estado = 'CONFIRMADA'
        ) AS confirmadas

      FROM citas
      WHERE fecha BETWEEN $1 AND $2
      `,
      [fechaInicio, fechaFin]
    );

    // ------------------------------------------
    // SERVICIOS REALIZADOS POR BARBERO
    // ------------------------------------------
    const barberResult = await pool.query(
      `
      SELECT
        b.id_barbero,
        u.nombre,
        u.apellido,
        u.foto,

        COUNT(c.id_cita) AS total_citas,

        COUNT(c.id_cita) FILTER (
          WHERE c.estado = 'COMPLETADA'
        ) AS servicios_realizados,

        COALESCE(
          SUM(c.precio) FILTER (
            WHERE c.estado = 'COMPLETADA'
          ),
          0
        ) AS ingresos

      FROM barberos b

      INNER JOIN usuarios u
        ON u.id_usuario = b.id_usuario

      LEFT JOIN citas c
        ON c.id_barbero = b.id_barbero
        AND c.fecha BETWEEN $1 AND $2

      WHERE b.activo = TRUE

      GROUP BY
        b.id_barbero,
        u.nombre,
        u.apellido,
        u.foto

      ORDER BY ingresos DESC, servicios_realizados DESC
      `,
      [fechaInicio, fechaFin]
    );

    const barberos = barberResult.rows.map((row) => ({
      ...row,
      utilidad: calcularUtilidadBarbero(row.ingresos)
    }));

    // ------------------------------------------
    // INGRESOS POR DÍA
    // ------------------------------------------
    const dailyResult = await pool.query(
      `
      SELECT
        fecha,
        COALESCE(
          SUM(
            CASE
              WHEN tipo = 'INGRESO'
              THEN monto
              ELSE 0
            END
          ),
          0
        ) AS ingresos,

        COALESCE(
          SUM(
            CASE
              WHEN tipo = 'EGRESO'
              THEN monto
              ELSE 0
            END
          ),
          0
        ) AS egresos

      FROM movimientos

      WHERE fecha BETWEEN $1 AND $2

      GROUP BY fecha

      ORDER BY fecha ASC
      `,
      [fechaInicio, fechaFin]
    );

    // ------------------------------------------
    // GANANCIAS MES A MES (últimos 12 meses)
    // ------------------------------------------
    const monthlyResult = await pool.query(
      `
      WITH meses AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE) - INTERVAL '11 months',
          date_trunc('month', CURRENT_DATE),
          INTERVAL '1 month'
        )::date AS mes
      )
      SELECT
        TO_CHAR(m.mes, 'YYYY-MM') AS mes,

        COALESCE(
          SUM(mov.monto) FILTER (WHERE mov.tipo = 'INGRESO'),
          0
        ) AS ingresos,

        COALESCE(
          SUM(mov.monto) FILTER (WHERE mov.tipo = 'EGRESO'),
          0
        ) AS egresos,

        COALESCE(
          SUM(mov.monto) FILTER (WHERE mov.tipo = 'INGRESO'),
          0
        ) - COALESCE(
          SUM(mov.monto) FILTER (WHERE mov.tipo = 'EGRESO'),
          0
        ) AS utilidad

      FROM meses m

      LEFT JOIN movimientos mov
        ON mov.fecha >= m.mes
        AND mov.fecha < (m.mes + INTERVAL '1 month')

      GROUP BY m.mes

      ORDER BY m.mes ASC
      `
    );

    // ------------------------------------------
    // DETALLE DE INGRESOS (cada servicio / promoción completado)
    // ------------------------------------------
    const detailResult = await pool.query(
      `${DETAIL_SELECT} ORDER BY c.fecha DESC, c.hora_inicio DESC`,
      [fechaInicio, fechaFin]
    );

    res.json({
      periodo: {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
      },

      resumen: {
        ingresos,
        egresos,
        utilidad
      },

      detalle: detailResult.rows,

      citas: appointmentsResult.rows[0],

      barberos,

      ingresos_por_dia: dailyResult.rows,

      ingresos_por_mes: monthlyResult.rows
    });

  } catch (error) {
    console.error("Error obteniendo reporte administrativo:", error);

    res.status(500).json({
      message: "Error al obtener el reporte"
    });
  }
};


// ==========================================
// REPORTES DEL BARBERO
// ==========================================
export const getBarberReport = async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = resolvePeriod(
      req.query.fecha_inicio,
      req.query.fecha_fin
    );

    // Buscar barbero
    const barberResult = await pool.query(
      `
      SELECT
        b.id_barbero,
        b.especialidad,
        u.nombre,
        u.apellido,
        u.foto
      FROM barberos b
      INNER JOIN usuarios u
        ON u.id_usuario = b.id_usuario
      WHERE b.id_usuario = $1
      AND b.activo = TRUE
      `,
      [req.user.id_usuario]
    );

    if (barberResult.rows.length === 0) {
      return res.status(404).json({
        message: "Barbero no encontrado"
      });
    }

    const barber = barberResult.rows[0];

    // ------------------------------------------
    // RESUMEN
    // ------------------------------------------
    const summaryResult = await pool.query(
      `
      SELECT
        COUNT(*) AS total_citas,

        COUNT(*) FILTER (
          WHERE estado = 'COMPLETADA'
        ) AS servicios_completados,

        COALESCE(
          SUM(
            CASE
              WHEN estado = 'COMPLETADA'
              THEN precio
              ELSE 0
            END
          ),
          0
        ) AS ingresos,

        COUNT(*) FILTER (
          WHERE estado = 'CANCELADA'
        ) AS citas_canceladas

      FROM citas

      WHERE id_barbero = $1
      AND fecha BETWEEN $2 AND $3
      `,
      [
        barber.id_barbero,
        fechaInicio,
        fechaFin
      ]
    );

    // ------------------------------------------
    // SERVICIOS REALIZADOS
    // ------------------------------------------
    const servicesResult = await pool.query(
      `
      SELECT
        CASE
          WHEN c.id_promocion IS NOT NULL THEN 'P' || c.id_promocion
          ELSE 'S' || c.id_servicio
        END AS id_servicio,
        COALESCE(p.nombre, s.nombre) AS servicio_nombre,
        (c.id_promocion IS NOT NULL) AS es_promocion,
        COUNT(c.id_cita) AS cantidad,
        COALESCE(
          SUM(c.precio),
          0
        ) AS ingresos

      FROM citas c

      LEFT JOIN servicios s
        ON s.id_servicio = c.id_servicio

      LEFT JOIN promociones p
        ON p.id_promocion = c.id_promocion

      WHERE c.id_barbero = $1
      AND c.estado = 'COMPLETADA'
      AND c.fecha BETWEEN $2 AND $3

      GROUP BY
        c.id_promocion,
        c.id_servicio,
        p.nombre,
        s.nombre

      ORDER BY cantidad DESC
      `,
      [
        barber.id_barbero,
        fechaInicio,
        fechaFin
      ]
    );

    // ------------------------------------------
    // CALIFICACIÓN
    // ------------------------------------------
    const ratingResult = await pool.query(
      `
      SELECT
        COALESCE(
          ROUND(
            AVG(estrellas)::numeric,
            2
          ),
          0
        ) AS promedio,

        COUNT(*) AS total_resenas

      FROM resenas

      WHERE id_barbero = $1
      `,
      [barber.id_barbero]
    );

    // ------------------------------------------
    // INGRESOS POR DÍA
    // ------------------------------------------
    const dailyResult = await pool.query(
      `
      SELECT
        fecha,
        COUNT(*) AS servicios,
        COALESCE(
          SUM(precio),
          0
        ) AS ingresos

      FROM citas

      WHERE id_barbero = $1
      AND estado = 'COMPLETADA'
      AND fecha BETWEEN $2 AND $3

      GROUP BY fecha

      ORDER BY fecha ASC
      `,
      [
        barber.id_barbero,
        fechaInicio,
        fechaFin
      ]
    );

    // ------------------------------------------
    // INGRESOS MES A MES (últimos 12 meses)
    // ------------------------------------------
    const monthlyResult = await pool.query(
      `
      WITH meses AS (
        SELECT generate_series(
          date_trunc('month', CURRENT_DATE) - INTERVAL '11 months',
          date_trunc('month', CURRENT_DATE),
          INTERVAL '1 month'
        )::date AS mes
      )
      SELECT
        TO_CHAR(m.mes, 'YYYY-MM') AS mes,
        COALESCE(SUM(c.precio), 0) AS ingresos

      FROM meses m

      LEFT JOIN citas c
        ON c.id_barbero = $1
        AND c.estado = 'COMPLETADA'
        AND c.fecha >= m.mes
        AND c.fecha < (m.mes + INTERVAL '1 month')

      GROUP BY m.mes

      ORDER BY m.mes ASC
      `,
      [barber.id_barbero]
    );

    // ------------------------------------------
    // DETALLE DE INGRESOS (cada servicio / promoción completado)
    // ------------------------------------------
    const detailResult = await pool.query(
      `${DETAIL_SELECT} AND c.id_barbero = $3 ORDER BY c.fecha DESC, c.hora_inicio DESC`,
      [fechaInicio, fechaFin, barber.id_barbero]
    );

    res.json({
      barbero: barber,

      detalle: withUtility(detailResult.rows),

      periodo: {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin
      },

      resumen: {
        ...summaryResult.rows[0],
        utilidad: calcularUtilidadBarbero(summaryResult.rows[0].ingresos),
        comision: COMISION_BARBERO,
        promedio_estrellas: ratingResult.rows[0].promedio,
        total_resenas: ratingResult.rows[0].total_resenas
      },

      servicios: servicesResult.rows,

      calificacion: ratingResult.rows[0],

      ingresos_por_dia: dailyResult.rows,

      ingresos_por_mes: monthlyResult.rows
    });

  } catch (error) {
    console.error("Error obteniendo reporte del barbero:", error);

    res.status(500).json({
      message: "Error al obtener el reporte"
    });
  }
};
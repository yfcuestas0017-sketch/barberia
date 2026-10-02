import pool from "../config/db.js";

export const getMovements = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin, tipo } = req.query;

    let query = `
      SELECT
        m.id_movimiento,
        m.tipo,
        m.concepto,
        m.monto,
        m.fecha,
        m.id_usuario,
        m.id_cita,
        m.observacion,
        m.created_at,

        u.nombre AS usuario_nombre,
        u.apellido AS usuario_apellido,

        c.fecha AS cita_fecha

      FROM movimientos m

      LEFT JOIN usuarios u
        ON u.id_usuario = m.id_usuario

      LEFT JOIN citas c
        ON c.id_cita = m.id_cita

      WHERE 1 = 1
    `;

    const values = [];
    let parameter = 1;

    if (fecha_inicio) {
      query += ` AND m.fecha >= $${parameter}`;
      values.push(fecha_inicio);
      parameter++;
    }

    if (fecha_fin) {
      query += ` AND m.fecha <= $${parameter}`;
      values.push(fecha_fin);
      parameter++;
    }

    if (tipo) {
      query += ` AND m.tipo = $${parameter}`;
      values.push(tipo);
      parameter++;
    }

    query += `
      ORDER BY
        m.fecha DESC,
        m.created_at DESC
    `;

    const result = await pool.query(query, values);

    res.json(result.rows);

  } catch (error) {
    console.error("Error obteniendo movimientos:", error);

    res.status(500).json({
      message: "Error al obtener los movimientos"
    });
  }
};


export const createMovement = async (req, res) => {
  try {
    const {
      tipo,
      concepto,
      monto,
      fecha,
      observacion
    } = req.body;

    if (!tipo || !concepto || !monto || !fecha) {
      return res.status(400).json({
        message: "Tipo, concepto, monto y fecha son obligatorios"
      });
    }

    if (!["INGRESO", "EGRESO"].includes(tipo)) {
      return res.status(400).json({
        message: "El tipo de movimiento no es válido"
      });
    }

    if (Number(monto) <= 0) {
      return res.status(400).json({
        message: "El monto debe ser mayor que cero"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO movimientos (
        tipo,
        concepto,
        monto,
        fecha,
        id_usuario,
        observacion
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        tipo,
        concepto,
        Number(monto),
        fecha,
        req.user.id_usuario,
        observacion || null
      ]
    );

    res.status(201).json({
      message: "Movimiento registrado correctamente",
      movement: result.rows[0]
    });

  } catch (error) {
    console.error("Error creando movimiento:", error);

    res.status(500).json({
      message: "Error al registrar el movimiento"
    });
  }
};

export const getMyBarberProfile = async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.email,
        u.telefono,
        u.foto,
        u.activo,
        b.id_barbero,
        b.descripcion,
        b.especialidad
      FROM usuarios u
      INNER JOIN barberos b
        ON b.id_usuario = u.id_usuario
      WHERE u.id_usuario = $1
      `,
      [req.user.id_usuario]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Perfil de barbero no encontrado"
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error obteniendo perfil del barbero:", error);

    res.status(500).json({
      message: "Error al obtener el perfil"
    });
  }
};


export const updateMyBarberProfile = async (req, res) => {
  const {
    nombre,
    apellido,
    telefono,
    foto,
    descripcion,
    especialidad
  } = req.body;

  if (!nombre || !apellido) {
    return res.status(400).json({
      message: "El nombre y apellido son obligatorios"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
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
        activo
      `,
      [
        nombre.trim(),
        apellido.trim(),
        telefono?.trim() || null,
        foto?.trim() || null,
        req.user.id_usuario
      ]
    );

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    const barberResult = await client.query(
      `
      UPDATE barberos
      SET
        descripcion = $1,
        especialidad = $2
      WHERE id_usuario = $3
      RETURNING
        id_barbero,
        descripcion,
        especialidad
      `,
      [
        descripcion?.trim() || null,
        especialidad?.trim() || null,
        req.user.id_usuario
      ]
    );

    if (barberResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Registro de barbero no encontrado"
      });
    }

    await client.query("COMMIT");

    res.json({
      message: "Perfil actualizado correctamente",
      ...userResult.rows[0],
      ...barberResult.rows[0]
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Error actualizando perfil del barbero:", error);

    res.status(500).json({
      message: "Error al actualizar el perfil"
    });
  } finally {
    client.release();
  }
};
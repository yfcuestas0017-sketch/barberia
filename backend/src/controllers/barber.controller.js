import bcrypt from "bcryptjs";
import pool from "../config/db.js";

export const getBarbers = async (req, res) => {
  try {
    // ?solo_activos=true -> uso del cliente; sin parámetro -> admin ve todos
    const onlyActive = req.query.solo_activos === "true";

    const result = await pool.query(`
      SELECT
        b.id_barbero,
        b.descripcion,
        b.especialidad,
        b.activo,
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.email,
        u.telefono,
        u.foto
      FROM barberos b
      INNER JOIN usuarios u
        ON u.id_usuario = b.id_usuario
      ${onlyActive ? "WHERE b.activo = TRUE" : ""}
      ORDER BY b.id_barbero DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error al obtener barberos"
    });
  }
};


export const getBarberById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      SELECT
        b.id_barbero,
        b.descripcion,
        b.especialidad,
        b.activo,
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.email,
        u.telefono,
        u.foto
      FROM barberos b
      INNER JOIN usuarios u
        ON u.id_usuario = b.id_usuario
      WHERE b.id_barbero = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Barbero no encontrado"
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error al obtener barbero"
    });
  }
};


export const createBarber = async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      nombre,
      apellido,
      email,
      telefono,
      password,
      foto,
      descripcion,
      especialidad
    } = req.body;

    if (
      !nombre ||
      !apellido ||
      !email ||
      !password
    ) {
      return res.status(400).json({
        message: "Nombre, apellido, email y contraseña son obligatorios"
      });
    }

    await client.query("BEGIN");

    const existing = await client.query(
      `
      SELECT id_usuario
      FROM usuarios
      WHERE email = $1
      `,
      [email]
    );

    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        message: "El correo ya está registrado"
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const userResult = await client.query(
      `
      INSERT INTO usuarios
      (
        nombre,
        apellido,
        email,
        telefono,
        password,
        foto
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id_usuario
      `,
      [
        nombre,
        apellido,
        email,
        telefono || null,
        hashedPassword,
        foto || null
      ]
    );

    const idUsuario =
      userResult.rows[0].id_usuario;

    const roleResult = await client.query(
      `
      SELECT id_rol
      FROM roles
      WHERE nombre = 'BARBERO'
      `
    );

    if (roleResult.rows.length === 0) {
      throw new Error("Rol BARBERO no existe");
    }

    await client.query(
      `
      INSERT INTO usuario_roles
      (
        id_usuario,
        id_rol
      )
      VALUES ($1, $2)
      `,
      [
        idUsuario,
        roleResult.rows[0].id_rol
      ]
    );

    const barberResult = await client.query(
      `
      INSERT INTO barberos
      (
        id_usuario,
        descripcion,
        especialidad
      )
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [
        idUsuario,
        descripcion || null,
        especialidad || null
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Barbero creado correctamente",
      barbero: barberResult.rows[0]
    });

  } catch (error) {

    await client.query("ROLLBACK");

    console.error(error);

    res.status(500).json({
      message: "Error al crear barbero"
    });

  } finally {
    client.release();
  }
};


export const updateBarber = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const {
      nombre,
      apellido,
      email,
      telefono,
      foto,
      descripcion,
      especialidad,
      activo
    } = req.body;

    await client.query("BEGIN");

    const barberResult = await client.query(
      `
      SELECT id_usuario
      FROM barberos
      WHERE id_barbero = $1
      `,
      [id]
    );

    if (barberResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Barbero no encontrado"
      });
    }

    const idUsuario =
      barberResult.rows[0].id_usuario;

    await client.query(
      `
      UPDATE usuarios
      SET
        nombre = $1,
        apellido = $2,
        email = $3,
        telefono = $4,
        foto = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id_usuario = $6
      `,
      [
        nombre,
        apellido,
        email,
        telefono || null,
        foto || null,
        idUsuario
      ]
    );

    const result = await client.query(
      `
      UPDATE barberos
      SET
        descripcion = $1,
        especialidad = $2,
        activo = $3
      WHERE id_barbero = $4
      RETURNING *
      `,
      [
        descripcion || null,
        especialidad || null,
        activo ?? true,
        id
      ]
    );

    await client.query("COMMIT");

    res.json({
      message: "Barbero actualizado correctamente",
      barbero: result.rows[0]
    });

  } catch (error) {

    await client.query("ROLLBACK");

    console.error(error);

    res.status(500).json({
      message: "Error al actualizar barbero"
    });

  } finally {
    client.release();
  }
};


// ADMIN: activar / desactivar
export const setBarberStatus = async (req, res) => {
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
      UPDATE barberos
      SET activo = $1
      WHERE id_barbero = $2
      RETURNING *
      `,
      [activo, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Barbero no encontrado"
      });
    }

    res.json({
      message: activo
        ? "Barbero activado correctamente"
        : "Barbero desactivado correctamente",
      barbero: result.rows[0]
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error al cambiar el estado del barbero"
    });
  }
};


// ADMIN: eliminar definitivamente (barbero + su usuario + su horario).
// Si ya tiene citas o movimientos registrados, no se puede borrar.
export const deleteBarber = async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    await client.query("BEGIN");

    const barberResult = await client.query(
      "SELECT id_usuario FROM barberos WHERE id_barbero = $1",
      [id]
    );

    if (barberResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Barbero no encontrado"
      });
    }

    const idUsuario = barberResult.rows[0].id_usuario;

    await client.query(
      "DELETE FROM horarios_barbero WHERE id_barbero = $1",
      [id]
    );

    await client.query(
      "DELETE FROM barberos WHERE id_barbero = $1",
      [id]
    );

    await client.query(
      "DELETE FROM usuario_roles WHERE id_usuario = $1",
      [idUsuario]
    );

    await client.query(
      "DELETE FROM usuarios WHERE id_usuario = $1",
      [idUsuario]
    );

    await client.query("COMMIT");

    res.json({
      message: "Barbero eliminado correctamente"
    });

  } catch (error) {
    await client.query("ROLLBACK");

    // 23503 = violación de llave foránea (tiene citas o movimientos)
    if (error.code === "23503") {
      return res.status(409).json({
        message:
          "No se puede eliminar: el barbero tiene citas o movimientos registrados. Puedes desactivarlo en su lugar."
      });
    }

    console.error(error);

    res.status(500).json({
      message: "Error al eliminar barbero"
    });

  } finally {
    client.release();
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
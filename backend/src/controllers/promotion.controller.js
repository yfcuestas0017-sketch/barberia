import pool from "../config/db.js";

// =====================================================
// SELECT base. Incluye:
//  - barberos: lista de barberos que atienden la promoción
//  - id_barbero_creador / creador_nombre: quién la creó (NULL = admin)
// $onlyActive = true  -> solo barberos activos (vista del cliente)
// =====================================================
const promotionSelect = ({
  onlyActiveBarbers = false,
  extraColumns = ""
} = {}) => `
  SELECT
    ${extraColumns}
    p.*,
    p.fecha_inicio::text AS fecha_inicio,
    p.fecha_fin::text AS fecha_fin,
    (p.id_barbero_creador IS NOT NULL) AS creada_por_barbero,
    TRIM(CONCAT(cu.nombre, ' ', cu.apellido)) AS creador_nombre,
    COALESCE((
      SELECT json_agg(
        json_build_object(
          'id_barbero', b.id_barbero,
          'nombre', u.nombre,
          'apellido', u.apellido,
          'foto', u.foto,
          'activo', b.activo
        )
        ORDER BY u.nombre, u.apellido
      )
      FROM promocion_barberos pb
      INNER JOIN barberos b ON b.id_barbero = pb.id_barbero
      INNER JOIN usuarios u ON u.id_usuario = b.id_usuario
      WHERE pb.id_promocion = p.id_promocion
      ${onlyActiveBarbers ? "AND b.activo = TRUE" : ""}
    ), '[]'::json) AS barberos
  FROM promociones p
  LEFT JOIN barberos cb ON cb.id_barbero = p.id_barbero_creador
  LEFT JOIN usuarios cu ON cu.id_usuario = cb.id_usuario
`;


// -----------------------------------------------------
// Utilidades
// -----------------------------------------------------

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

// Normaliza una lista de ids de barberos (sin repetidos ni inválidos)
const parseBarberIds = (value) => {
  if (!Array.isArray(value)) return null;

  return [
    ...new Set(
      value
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  ];
};

// Reemplaza los barberos asignados a una promoción
const replaceAssignments = async (db, idPromocion, barberIds) => {
  await db.query(
    "DELETE FROM promocion_barberos WHERE id_promocion = $1",
    [idPromocion]
  );

  if (barberIds.length > 0) {
    await db.query(
      `
      INSERT INTO promocion_barberos (id_promocion, id_barbero)
      SELECT $1, UNNEST($2::BIGINT[])
      `,
      [idPromocion, barberIds]
    );
  }
};

// Verifica que todos los ids pertenezcan a barberos existentes
const allBarbersExist = async (db, barberIds) => {
  const result = await db.query(
    "SELECT COUNT(*)::int AS total FROM barberos WHERE id_barbero = ANY($1::BIGINT[])",
    [barberIds]
  );

  return result.rows[0].total === barberIds.length;
};

const getPromotionFull = async (db, id) => {
  const result = await db.query(
    `${promotionSelect()} WHERE p.id_promocion = $1`,
    [id]
  );

  return result.rows[0] || null;
};

// Barbero (de barberos) del usuario autenticado
const getMyBarberId = async (req) => {
  const result = await pool.query(
    "SELECT id_barbero FROM barberos WHERE id_usuario = $1",
    [req.user.id_usuario]
  );

  return result.rows[0]?.id_barbero || null;
};


// =====================================================
// ADMIN
// =====================================================

// ADMIN: todas las promociones (activas e inactivas)
export const getPromotions = async (req, res) => {
  try {
    const result = await pool.query(`
      ${promotionSelect()}
      ORDER BY p.fecha_inicio DESC, p.id_promocion DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener promociones" });
  }
};


// CLIENTE: promociones reservables hoy (activas, vigentes y con
// al menos un barbero activo que la atienda).
// ?id_barbero=ID -> solo las que atiende ese barbero.
export const getAvailablePromotions = async (req, res) => {
  try {
    const { id_barbero } = req.query;

    const params = [];
    let barberFilter = "";

    if (id_barbero) {
      params.push(id_barbero);
      barberFilter = `
        AND EXISTS (
          SELECT 1 FROM promocion_barberos x
          WHERE x.id_promocion = p.id_promocion
          AND x.id_barbero = $1
        )
      `;
    }

    const result = await pool.query(
      `
      ${promotionSelect({ onlyActiveBarbers: true })}
      WHERE p.activo = TRUE
        AND CURRENT_DATE BETWEEN p.fecha_inicio AND p.fecha_fin
        AND EXISTS (
          SELECT 1
          FROM promocion_barberos pb
          INNER JOIN barberos b ON b.id_barbero = pb.id_barbero
          WHERE pb.id_promocion = p.id_promocion
          AND b.activo = TRUE
        )
        ${barberFilter}
      ORDER BY p.fecha_fin ASC, p.id_promocion DESC
      `,
      params
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener promociones disponibles" });
  }
};


export const getPromotionById = async (req, res) => {
  try {
    const { id } = req.params;

    const promotion = await getPromotionFull(pool, id);

    if (!promotion) {
      return res.status(404).json({ message: "Promoción no encontrada" });
    }

    res.json(promotion);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener promoción" });
  }
};


// ADMIN: crear promoción y elegir qué barberos la atienden
export const createPromotion = async (req, res) => {
  const client = await pool.connect();

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

    const barberIds = parseBarberIds(req.body.barberos);

    if (!barberIds || barberIds.length === 0) {
      return res.status(400).json({
        message: "Selecciona al menos un barbero que atienda esta promoción"
      });
    }

    if (!(await allBarbersExist(client, barberIds))) {
      return res.status(400).json({
        message: "Alguno de los barberos seleccionados no existe"
      });
    }

    await client.query("BEGIN");

    const result = await client.query(
      `
      INSERT INTO promociones
        (nombre, descripcion, precio, duracion_minutos, foto, fecha_inicio, fecha_fin)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id_promocion
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

    const idPromocion = result.rows[0].id_promocion;

    await replaceAssignments(client, idPromocion, barberIds);

    await client.query("COMMIT");

    res.status(201).json(await getPromotionFull(pool, idPromocion));
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Error al crear promoción" });
  } finally {
    client.release();
  }
};


// ADMIN: editar promoción (cualquiera) y reasignar barberos
export const updatePromotion = async (req, res) => {
  const client = await pool.connect();

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

    // barberos es opcional al editar: si no viene, no se tocan las asignaciones
    const barberIds =
      req.body.barberos !== undefined
        ? parseBarberIds(req.body.barberos)
        : undefined;

    if (barberIds !== undefined) {
      if (!barberIds || barberIds.length === 0) {
        return res.status(400).json({
          message: "Selecciona al menos un barbero que atienda esta promoción"
        });
      }

      if (!(await allBarbersExist(client, barberIds))) {
        return res.status(400).json({
          message: "Alguno de los barberos seleccionados no existe"
        });
      }
    }

    await client.query("BEGIN");

    const result = await client.query(
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
      RETURNING id_promocion
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
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Promoción no encontrada" });
    }

    if (barberIds !== undefined) {
      await replaceAssignments(client, id, barberIds);
    }

    await client.query("COMMIT");

    res.json(await getPromotionFull(pool, id));
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Error al actualizar promoción" });
  } finally {
    client.release();
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


// =====================================================
// BARBERO: sus propias promociones
// =====================================================

// Promociones que creó el barbero + las que el admin le asignó
export const getMyPromotions = async (req, res) => {
  try {
    const idBarbero = await getMyBarberId(req);

    if (!idBarbero) {
      return res.status(404).json({ message: "Barbero no encontrado" });
    }

    const result = await pool.query(
      `
      ${promotionSelect({
        extraColumns: "(p.id_barbero_creador = $1) AS es_propia,"
      })}
      WHERE p.id_barbero_creador = $1
         OR EXISTS (
           SELECT 1 FROM promocion_barberos x
           WHERE x.id_promocion = p.id_promocion
           AND x.id_barbero = $1
         )
      ORDER BY p.fecha_inicio DESC, p.id_promocion DESC
      `,
      [idBarbero]
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener tus promociones" });
  }
};


// BARBERO: crear promoción. Queda asignada solo a él.
export const createMyPromotion = async (req, res) => {
  const client = await pool.connect();

  try {
    const idBarbero = await getMyBarberId(req);

    if (!idBarbero) {
      return res.status(404).json({ message: "Barbero no encontrado" });
    }

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

    await client.query("BEGIN");

    const result = await client.query(
      `
      INSERT INTO promociones
        (nombre, descripcion, precio, duracion_minutos, foto,
         fecha_inicio, fecha_fin, id_barbero_creador)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id_promocion
      `,
      [
        nombre.trim(),
        descripcion || null,
        Number(precio),
        Number(duracion_minutos),
        foto || null,
        fecha_inicio,
        fecha_fin,
        idBarbero
      ]
    );

    const idPromocion = result.rows[0].id_promocion;

    await replaceAssignments(client, idPromocion, [idBarbero]);

    await client.query("COMMIT");

    res.status(201).json(await getPromotionFull(pool, idPromocion));
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Error al crear la promoción" });
  } finally {
    client.release();
  }
};


// BARBERO: editar solo promociones que él creó
export const updateMyPromotion = async (req, res) => {
  try {
    const idBarbero = await getMyBarberId(req);

    if (!idBarbero) {
      return res.status(404).json({ message: "Barbero no encontrado" });
    }

    const { id } = req.params;

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
      UPDATE promociones
      SET
        nombre = $1,
        descripcion = $2,
        precio = $3,
        duracion_minutos = $4,
        foto = COALESCE($5, foto),
        fecha_inicio = $6,
        fecha_fin = $7,
        updated_at = CURRENT_TIMESTAMP
      WHERE id_promocion = $8
      AND id_barbero_creador = $9
      RETURNING id_promocion
      `,
      [
        nombre.trim(),
        descripcion || null,
        Number(precio),
        Number(duracion_minutos),
        foto || null,
        fecha_inicio,
        fecha_fin,
        id,
        idBarbero
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Promoción no encontrada o no te pertenece"
      });
    }

    res.json(await getPromotionFull(pool, id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar la promoción" });
  }
};


// BARBERO: activar / desactivar sus promociones
export const setMyPromotionStatus = async (req, res) => {
  try {
    const idBarbero = await getMyBarberId(req);

    if (!idBarbero) {
      return res.status(404).json({ message: "Barbero no encontrado" });
    }

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
      AND id_barbero_creador = $3
      RETURNING id_promocion
      `,
      [activo, id, idBarbero]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Promoción no encontrada o no te pertenece"
      });
    }

    res.json({
      message: activo
        ? "Promoción activada correctamente"
        : "Promoción desactivada correctamente"
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al cambiar el estado de la promoción" });
  }
};


// BARBERO: eliminar sus promociones (si ya tienen citas, solo desactivar)
export const deleteMyPromotion = async (req, res) => {
  try {
    const idBarbero = await getMyBarberId(req);

    if (!idBarbero) {
      return res.status(404).json({ message: "Barbero no encontrado" });
    }

    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM promociones
      WHERE id_promocion = $1
      AND id_barbero_creador = $2
      RETURNING id_promocion
      `,
      [id, idBarbero]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Promoción no encontrada o no te pertenece"
      });
    }

    res.json({ message: "Promoción eliminada correctamente" });
  } catch (error) {
    if (error.code === "23503") {
      return res.status(409).json({
        message:
          "Esta promoción ya tiene citas registradas y no se puede eliminar. Desactívala para que deje de mostrarse."
      });
    }

    console.error(error);
    res.status(500).json({ message: "Error al eliminar la promoción" });
  }
};

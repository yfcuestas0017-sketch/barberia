import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";

export const register = async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      email,
      telefono,
      password,
    } = req.body;

    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({
        message: "Nombre, apellido, email y contraseña son obligatorios",
      });
    }

    const existingUser = await pool.query(
      "SELECT id_usuario FROM usuarios WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message: "El correo ya está registrado",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO usuarios
      (
        nombre,
        apellido,
        email,
        telefono,
        password
      )
      VALUES ($1, $2, $3, $4, $5)
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
        nombre,
        apellido,
        email,
        telefono || null,
        hashedPassword,
      ]
    );

    const user = result.rows[0];

    const clientRole = await pool.query(
      "SELECT id_rol FROM roles WHERE nombre = 'CLIENTE'"
    );

    if (clientRole.rows.length === 0) {
      return res.status(500).json({
        message: "El rol CLIENTE no existe",
      });
    }

    await pool.query(
      `
      INSERT INTO usuario_roles
      (
        id_usuario,
        id_rol
      )
      VALUES ($1, $2)
      `,
      [
        user.id_usuario,
        clientRole.rows[0].id_rol,
      ]
    );

    res.status(201).json({
      message: "Usuario registrado correctamente",
      user,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error al registrar usuario",
    });
  }
};


export const login = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email y contraseña son obligatorios",
      });
    }

    const result = await pool.query(
      `
      SELECT
        u.id_usuario,
        u.nombre,
        u.apellido,
        u.email,
        u.telefono,
        u.foto,
        u.password,
        u.activo,
        COALESCE(
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id_rol', r.id_rol,
              'nombre', r.nombre
            )
          ) FILTER (WHERE r.id_rol IS NOT NULL),
          '[]'
        ) AS roles
      FROM usuarios u

      LEFT JOIN usuario_roles ur
        ON ur.id_usuario = u.id_usuario

      LEFT JOIN roles r
        ON r.id_rol = ur.id_rol

      WHERE u.email = $1

      GROUP BY u.id_usuario
      `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Credenciales incorrectas",
      });
    }

    const user = result.rows[0];

    if (!user.activo) {
      return res.status(403).json({
        message: "El usuario está inactivo",
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(401).json({
        message: "Credenciales incorrectas",
      });
    }

    const token = jwt.sign(
      {
        id_usuario: user.id_usuario,
        roles: user.roles,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h",
      }
    );

    delete user.password;

    res.json({
      message: "Inicio de sesión exitoso",
      token,
      user,
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Error al iniciar sesión",
    });
  }
};
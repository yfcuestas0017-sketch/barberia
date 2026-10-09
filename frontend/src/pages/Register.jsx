
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../services/api";

import "./Auth.css";
import logo from "../assets/logo.png";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    password: "",
    confirmPassword: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !form.nombre.trim() ||
      !form.apellido.trim() ||
      !form.email.trim() ||
      !form.password
    ) {
      setError(
        "Completa todos los campos obligatorios."
      );

      return;
    }

    if (form.password.length < 6) {
      setError(
        "La contraseña debe tener al menos 6 caracteres."
      );

      return;
    }

    if (
      form.password !==
      form.confirmPassword
    ) {
      setError(
        "Las contraseñas no coinciden."
      );

      return;
    }

    try {
      setLoading(true);

      const response = await api.post(
        "/auth/register",
        {
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          email: form.email.trim().toLowerCase(),
          telefono: form.telefono.trim(),
          password: form.password
        }
      );

      setSuccess(
        response.data?.message ||
          "Cuenta creada correctamente."
      );

      setTimeout(() => {
        navigate("/login");
      }, 1500);

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
          "No se pudo crear la cuenta. Inténtalo nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      <div className="auth-visual">
        <div className="auth-visual-overlay" />
        <Link to="/" className="auth-brand">
          <img src={logo} alt="Vitery Barber" className="auth-brand-mark" />
          <span>VITERY <em>BARBER</em></span>
        </Link>

        <div className="auth-visual-text">
          <span className="section-eyebrow">Cuenta de cliente</span>
          <h2>Únete y reserva tu estilo</h2>
          <p>
            Crea tu cuenta de cliente para agendar citas, ver promociones
            y llevar el control de tu historial de cortes.
          </p>
        </div>
      </div>

      <div className="auth-form-side">

        <Link to="/" className="auth-back">← Volver al inicio</Link>

        <div className="auth-card auth-card-wide">

          <span className="section-eyebrow">Crear cuenta</span>

          <h1>
            Regístrate
          </h1>

          <p className="auth-subtitle">
            Crea tu cuenta de cliente para reservar tus
            servicios.
          </p>

          {error && (
            <div className="auth-alert error">
              {error}
            </div>
          )}

          {success && (
            <div className="auth-alert success">
              {success}
            </div>
          )}

          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >

            <div className="auth-row">

              <div className="auth-field">

                <label htmlFor="nombre">
                  Nombre *
                </label>

                <input
                  id="nombre"
                  name="nombre"
                  type="text"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Tu nombre"
                  autoComplete="given-name"
                  disabled={loading}
                />

              </div>

              <div className="auth-field">

                <label htmlFor="apellido">
                  Apellido *
                </label>

                <input
                  id="apellido"
                  name="apellido"
                  type="text"
                  value={form.apellido}
                  onChange={handleChange}
                  placeholder="Tu apellido"
                  autoComplete="family-name"
                  disabled={loading}
                />

              </div>

            </div>

            <div className="auth-field">

              <label htmlFor="email">
                Correo electrónico *
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="correo@ejemplo.com"
                autoComplete="email"
                disabled={loading}
              />

            </div>

            <div className="auth-field">

              <label htmlFor="telefono">
                Teléfono
              </label>

              <input
                id="telefono"
                name="telefono"
                type="tel"
                value={form.telefono}
                onChange={handleChange}
                placeholder="300 000 0000"
                autoComplete="tel"
                disabled={loading}
              />

            </div>

            <div className="auth-row">

              <div className="auth-field">

                <label htmlFor="password">
                  Contraseña *
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  disabled={loading}
                />

              </div>

              <div className="auth-field">

                <label htmlFor="confirmPassword">
                  Confirmar contraseña *
                </label>

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Repite tu contraseña"
                  autoComplete="new-password"
                  disabled={loading}
                />

              </div>

            </div>

            <div className="auth-info">
              Al registrarte crearás una cuenta de
              cliente para reservar servicios.
            </div>

            <button
              type="submit"
              className="btn btn-gold btn-block"
              disabled={loading}
            >
              {loading && <span className="btn-spinner" aria-hidden="true" />}
              {loading
                ? "Creando cuenta..."
                : "Crear cuenta"}
            </button>

          </form>

          <div className="auth-switch">
            <span>¿Ya tienes una cuenta?</span>
            <Link to="/login">Iniciar sesión</Link>
          </div>

        </div>

      </div>

    </div>
  );
}

export default Register;


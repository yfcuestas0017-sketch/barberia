import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

import "./Auth.css";
import "./ForgotPassword.css";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message;
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const user = await login(email, password);

      const roles = (user.roles || []).map((role) =>
        typeof role === "string" ? role : role.nombre
      );

      if (roles.includes("ADMIN")) {
        navigate("/admin");
      } else if (roles.includes("BARBERO")) {
        navigate("/barbero");
      } else {
        navigate("/cliente");
      }
    } catch (error) {
      setError(
        error.response?.data?.message || "Error al iniciar sesión"
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
          <span className="auth-brand-mark">B</span>
          BARBERÍA <em>BITERY BARBER</em>
        </Link>

        <div className="auth-visual-text">
          <span className="section-eyebrow">Acceso al panel</span>
          <h2>Bienvenido de nuevo</h2>
          <p>
            Accede a tu panel para gestionar tus citas, tu agenda o la
            barbería, según tu rol.
          </p>
        </div>
      </div>

      <div className="auth-form-side">

        <Link to="/" className="auth-back">← Volver al inicio</Link>

        <div className="auth-card">

          <span className="section-eyebrow">Acceso a tu cuenta</span>
          <h1>Iniciar sesión</h1>
          <p className="auth-subtitle">
            Ingresa tus credenciales para continuar.
          </p>

          {successMessage && !error && (
            <div className="auth-alert success">{successMessage}</div>
          )}

          {error && <div className="auth-alert error">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>

            <div className="auth-field">
              <label htmlFor="email">Correo electrónico</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                autoComplete="email"
                disabled={loading}
                required
              />
            </div>

            <div className="auth-field">
              <label htmlFor="password">Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                autoComplete="current-password"
                disabled={loading}
                required
              />
            </div>

            <div className="auth-forgot">
              <Link to="/recuperar">¿Olvidaste tu contraseña?</Link>
            </div>

            <button type="submit" className="btn btn-gold btn-block" disabled={loading}>
              {loading && <span className="btn-spinner" aria-hidden="true" />}
              {loading ? "Ingresando..." : "Iniciar sesión"}
            </button>

          </form>

          <div className="auth-switch">
            <span>¿Aún no tienes cuenta?</span>
            <Link to="/register">Regístrate como cliente</Link>
          </div>

        </div>

      </div>

    </div>
  );
};

export default Login;

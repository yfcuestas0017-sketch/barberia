import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../services/api";

import "./Auth.css";
import "./ForgotPassword.css";
import logo from "../assets/logo.png";

const RESEND_SECONDS = 60;

const ForgotPassword = () => {
  const navigate = useNavigate();

  // "phone" -> "code" -> "password"
  const [step, setStep] = useState("phone");

  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [info, setInfo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;

    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const requestCode = async () => {
    setError("");
    setInfo("");

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Ingresa un correo válido.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/forgot-password", { email: email.trim() });

      setStep("code");
      setCodigo("");
      setCooldown(RESEND_SECONDS);
      setInfo(
        "Si el correo está registrado, te enviamos un código de 6 dígitos. Revisa también spam."
      );
    } catch (err) {
      if (err.response?.data?.retry_after) {
        setCooldown(err.response.data.retry_after);
      }

      setError(
        err.response?.data?.message ||
          "No se pudo enviar el código. Intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = (e) => {
    e.preventDefault();
    requestCode();
  };

  const handleCodeSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!/^\d{6}$/.test(codigo)) {
      setError("El código tiene 6 dígitos.");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post("/auth/verify-reset-code", {
        email: email.trim(),
        codigo
      });

      setResetToken(data.reset_token);
      setInfo("");
      setStep("password");
    } catch (err) {
      setError(
        err.response?.data?.message || "No se pudo verificar el código."
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/reset-password", {
        reset_token: resetToken,
        password
      });

      navigate("/login", {
        state: {
          message:
            "Contraseña actualizada. Ya puedes iniciar sesión con la nueva."
        }
      });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "No se pudo cambiar la contraseña."
      );
    } finally {
      setLoading(false);
    }
  };

  const stepNumber = step === "phone" ? 1 : step === "code" ? 2 : 3;

  return (
    <div className="auth-page">

      <div className="auth-visual">
        <div className="auth-visual-overlay" />
        <Link to="/" className="auth-brand">
          <img src={logo} alt="Vitery Barber" className="auth-brand-mark" />
          <span>VITERY <em>BARBER</em></span>
        </Link>

        <div className="auth-visual-text">
          <span className="section-eyebrow">Recuperar acceso</span>
          <h2>¿Olvidaste tu contraseña?</h2>
          <p>
            Te enviamos un código al correo que registraste
            para que puedas crear una contraseña nueva.
          </p>
        </div>
      </div>

      <div className="auth-form-side">

        <Link to="/login" className="auth-back">← Volver a iniciar sesión</Link>

        <div className="auth-card">

          <div className="reset-steps" aria-label={`Paso ${stepNumber} de 3`}>
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className={
                  "reset-step" +
                  (n === stepNumber ? " active" : "") +
                  (n < stepNumber ? " done" : "")
                }
              />
            ))}
          </div>

          {step === "phone" && (
            <>
              <span className="section-eyebrow">Paso 1 de 3</span>
              <h1>Recuperar contraseña</h1>
              <p className="auth-subtitle">
                Ingresa el correo con el que te registraste. Sirve para
                clientes, barberos y administradores.
              </p>

              {error && <div className="auth-alert error">{error}</div>}
              {info && <div className="auth-alert success">{info}</div>}

              <form className="auth-form" onSubmit={handlePhoneSubmit}>
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

                <button
                  type="submit"
                  className="btn btn-gold btn-block"
                  disabled={loading}
                >
                  {loading && <span className="btn-spinner" aria-hidden="true" />}
                  {loading ? "Enviando..." : "Enviar código al correo"}
                </button>
              </form>
            </>
          )}

          {step === "code" && (
            <>
              <span className="section-eyebrow">Paso 2 de 3</span>
              <h1>Ingresa el código</h1>
              <p className="auth-subtitle">
                Revisa tu correo (y la carpeta de spam). El código vence en 10 minutos.
              </p>

              {error && <div className="auth-alert error">{error}</div>}
              {info && <div className="auth-alert success">{info}</div>}

              <form className="auth-form" onSubmit={handleCodeSubmit}>
                <div className="auth-field">
                  <label htmlFor="codigo">Código de 6 dígitos</label>
                  <input
                    id="codigo"
                    className="reset-code-input"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={codigo}
                    onChange={(e) =>
                      setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="••••••"
                    disabled={loading}
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-gold btn-block"
                  disabled={loading || codigo.length !== 6}
                >
                  {loading && <span className="btn-spinner" aria-hidden="true" />}
                  {loading ? "Verificando..." : "Verificar código"}
                </button>
              </form>

              <div className="reset-actions">
                <button
                  type="button"
                  className="reset-link"
                  onClick={requestCode}
                  disabled={loading || cooldown > 0}
                >
                  {cooldown > 0
                    ? `Reenviar código en ${cooldown}s`
                    : "Reenviar código"}
                </button>

                <button
                  type="button"
                  className="reset-link"
                  onClick={() => {
                    setStep("phone");
                    setError("");
                    setInfo("");
                  }}
                >
                  Cambiar correo
                </button>
              </div>
            </>
          )}

          {step === "password" && (
            <>
              <span className="section-eyebrow">Paso 3 de 3</span>
              <h1>Nueva contraseña</h1>
              <p className="auth-subtitle">
                Elige una contraseña de al menos 6 caracteres.
              </p>

              {error && <div className="auth-alert error">{error}</div>}

              <form className="auth-form" onSubmit={handlePasswordSubmit}>
                <div className="auth-field">
                  <label htmlFor="password">Nueva contraseña</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                    autoFocus
                    required
                  />
                </div>

                <div className="auth-field">
                  <label htmlFor="confirm">Confirmar contraseña</label>
                  <input
                    id="confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    disabled={loading}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-gold btn-block"
                  disabled={loading}
                >
                  {loading && <span className="btn-spinner" aria-hidden="true" />}
                  {loading ? "Guardando..." : "Cambiar contraseña"}
                </button>
              </form>
            </>
          )}

        </div>

      </div>

    </div>
  );
};

export default ForgotPassword;

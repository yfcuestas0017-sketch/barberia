import { useState } from "react";
import api from "../../services/api";

import "./ChangePassword.css";

function ChangePassword() {
  const [form, setForm] = useState({
    password_actual: "",
    password_nuevo: "",
    confirmar_password: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.password_actual || !form.password_nuevo || !form.confirmar_password) {
      setError("Completa todos los campos.");
      return;
    }

    if (form.password_nuevo.length < 6) {
      setError("La nueva contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (form.password_nuevo !== form.confirmar_password) {
      setError("La nueva contraseña y su confirmación no coinciden.");
      return;
    }

    try {
      setSaving(true);
      const response = await api.put("/users/me/password", {
        password_actual: form.password_actual,
        password_nuevo: form.password_nuevo
      });
      setSuccess(response.data.message || "Contraseña actualizada correctamente.");
      setForm({
        password_actual: "",
        password_nuevo: "",
        confirmar_password: ""
      });
    } catch (requestError) {
      console.error("Error actualizando contraseña:", requestError);
      setError(
        requestError.response?.data?.message ||
        "No se pudo actualizar la contraseña."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="change-password-card">
      <header className="change-password-header">
        <h2>Cambiar contraseña</h2>
        <p>Confirma tu contraseña actual para establecer una nueva.</p>
      </header>

      {error && <p className="change-password-message error" role="alert">{error}</p>}
      {success && <p className="change-password-message success" role="status">{success}</p>}

      <form onSubmit={handleSubmit}>
        <div className="change-password-fields">
          <label>
            Contraseña actual
            <input
              type="password"
              name="password_actual"
              value={form.password_actual}
              onChange={handleChange}
              autoComplete="current-password"
              disabled={saving}
            />
          </label>
          <label>
            Nueva contraseña
            <input
              type="password"
              name="password_nuevo"
              value={form.password_nuevo}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={6}
              disabled={saving}
            />
          </label>
          <label>
            Confirmar nueva contraseña
            <input
              type="password"
              name="confirmar_password"
              value={form.confirmar_password}
              onChange={handleChange}
              autoComplete="new-password"
              minLength={6}
              disabled={saving}
            />
          </label>
        </div>

        <div className="change-password-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Actualizando..." : "Actualizar contraseña"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ChangePassword;

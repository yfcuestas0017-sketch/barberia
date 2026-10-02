import { useEffect, useState } from "react";

import api from "../../services/api";

import "./ClientProfile.css";

function ClientProfile() {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    foto: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const response = await api.get("/users/me");

      setForm({
        nombre: response.data.nombre || "",
        apellido: response.data.apellido || "",
        email: response.data.email || "",
        telefono: response.data.telefono || "",
        foto: response.data.foto || ""
      });

      setError("");
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
          "No se pudo cargar tu perfil."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));

    setSuccess("");
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.nombre.trim() || !form.apellido.trim()) {
      setError(
        "El nombre y apellido son obligatorios."
      );

      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const response = await api.put("/users/me", {
        nombre: form.nombre,
        apellido: form.apellido,
        telefono: form.telefono,
        foto: form.foto
      });

      const updatedUser = response.data.user;

      setForm({
        nombre: updatedUser.nombre || "",
        apellido: updatedUser.apellido || "",
        email: updatedUser.email || "",
        telefono: updatedUser.telefono || "",
        foto: updatedUser.foto || ""
      });

      setSuccess(
        "Tu perfil se actualizó correctamente."
      );
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
          "No se pudo actualizar tu perfil."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="client-profile-loading">
        Cargando perfil...
      </div>
    );
  }

  const initials =
    `${form.nombre?.charAt(0) || ""}${form.apellido?.charAt(0) || ""}`
      .toUpperCase();

  return (
    <div className="client-profile-page">

      <div className="client-profile-header">

        <div>
          <span>CUENTA</span>

          <h1>
            Mi perfil
          </h1>

          <p>
            Administra tu información personal.
          </p>
        </div>

      </div>

      {error && (
        <div className="client-profile-alert error">
          {error}
        </div>
      )}

      {success && (
        <div className="client-profile-alert success">
          {success}
        </div>
      )}

      <div className="client-profile-layout">

        <aside className="client-profile-preview">

          <div className="client-profile-avatar">

            {form.foto ? (
              <img
                src={form.foto}
                alt="Foto de perfil"
                onError={(event) => {
                  event.currentTarget.style.display =
                    "none";
                }}
              />
            ) : (
              <span>
                {initials || "C"}
              </span>
            )}

          </div>

          <h2>
            {form.nombre || "Cliente"}{" "}
            {form.apellido || ""}
          </h2>

          <p>
            Cliente
          </p>

          <div className="profile-preview-divider" />

          <span className="profile-email">
            {form.email}
          </span>

        </aside>

        <form
          className="client-profile-form"
          onSubmit={handleSubmit}
        >

          <div className="profile-form-title">
            <h2>
              Información personal
            </h2>

            <p>
              Los cambios se guardarán en tu cuenta.
            </p>
          </div>

          <div className="profile-form-grid">

            <div className="profile-field">

              <label>
                Nombre
              </label>

              <input
                type="text"
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                placeholder="Tu nombre"
              />

            </div>

            <div className="profile-field">

              <label>
                Apellido
              </label>

              <input
                type="text"
                name="apellido"
                value={form.apellido}
                onChange={handleChange}
                placeholder="Tu apellido"
              />

            </div>

            <div className="profile-field">

              <label>
                Correo electrónico
              </label>

              <input
                type="email"
                value={form.email}
                disabled
              />

              <small>
                El correo no puede modificarse desde aquí.
              </small>

            </div>

            <div className="profile-field">

              <label>
                Teléfono
              </label>

              <input
                type="text"
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                placeholder="Tu número de teléfono"
              />

            </div>

            <div className="profile-field full">

              <label>
                Foto de perfil
              </label>

              <input
                type="url"
                name="foto"
                value={form.foto}
                onChange={handleChange}
                placeholder="https://..."
              />

              <small>
                Puedes utilizar la URL de una imagen.
              </small>

            </div>

          </div>

          <div className="profile-form-footer">

            <button
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Guardando..."
                : "Guardar cambios"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}

export default ClientProfile;
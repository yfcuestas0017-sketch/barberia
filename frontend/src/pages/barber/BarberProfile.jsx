import { useEffect, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import ImageUploader from "../../components/ImageUploader/ImageUploader";

import "./BarberProfile.css";

function BarberProfile() {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    foto: "",
    especialidad: "",
    descripcion: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const response = await api.get("/barbers/me");

      setProfile(response.data);

      setForm({
        nombre: response.data.nombre || "",
        apellido: response.data.apellido || "",
        email: response.data.email || "",
        telefono: response.data.telefono || "",
        foto: response.data.foto || "",
        especialidad: response.data.especialidad || "",
        descripcion: response.data.descripcion || ""
      });

      setError("");
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "No se pudo cargar el perfil."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!form.nombre.trim() || !form.apellido.trim()) {
      setError("El nombre y apellido son obligatorios.");
      return;
    }

    try {
      setSaving(true);

      const response = await api.put("/barbers/me", {
        nombre: form.nombre,
        apellido: form.apellido,
        telefono: form.telefono,
        foto: form.foto,
        especialidad: form.especialidad,
        descripcion: form.descripcion
      });

      setProfile(response.data);

      // Refresca nombre y foto en la sesión (barra superior)
      updateUser({
        nombre: response.data.nombre,
        apellido: response.data.apellido,
        telefono: response.data.telefono,
        foto: response.data.foto,
      });

      setMessage(
        response.data.message ||
        "Perfil actualizado correctamente."
      );

      await loadProfile();
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "No se pudo actualizar el perfil."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="barber-loading">
        Cargando perfil...
      </div>
    );
  }

  if (!profile && error) {
    return (
      <div className="barber-error">
        {error}
      </div>
    );
  }

  return (
    <div className="barber-profile">

      <div className="barber-page-title">

        <div>
          <h2>Mi perfil</h2>

          <p>
            Administra la información que verán tus clientes.
          </p>
        </div>

      </div>

      {message && (
        <div className="profile-success">
          {message}
        </div>
      )}

      {error && (
        <div className="barber-error profile-error">
          {error}
        </div>
      )}

      <div className="profile-layout">

        <div className="profile-preview-card">

          <div className="profile-photo">

            {form.foto ? (
              <img
                src={form.foto}
                alt="Foto del barbero"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <span>
                {form.nombre
                  ?.charAt(0)
                  ?.toUpperCase() || "B"}
              </span>
            )}

          </div>

          <h3>
            {form.nombre || "Nombre"}{" "}
            {form.apellido || ""}
          </h3>

          <span className="profile-role">
            BARBERO
          </span>

          {form.especialidad && (
            <div className="profile-specialty">
              {form.especialidad}
            </div>
          )}

          {form.descripcion && (
            <p className="profile-description">
              {form.descripcion}
            </p>
          )}

          <div className="profile-status">
            <span className="status-dot"></span>
            Perfil activo
          </div>

        </div>

        <div className="profile-form-card">

          <div className="profile-card-header">
            <h3>Información personal</h3>

            <p>
              Actualiza los datos de tu perfil.
            </p>
          </div>

          <form onSubmit={handleSubmit}>

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
                  placeholder="Nombre"
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
                  placeholder="Apellido"
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
                  El correo se utiliza para iniciar sesión.
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
                  placeholder="Teléfono"
                />

              </div>

              <div className="profile-field">

                <label>
                  Especialidad
                </label>

                <input
                  type="text"
                  name="especialidad"
                  value={form.especialidad}
                  onChange={handleChange}
                  placeholder="Ej. Barbería clásica"
                />

              </div>

              <div className="profile-field">

                <ImageUploader
                  label="Foto"
                  value={form.foto}
                  onChange={(url) =>
                    setForm((prev) => ({ ...prev, foto: url }))
                  }
                />

              </div>

              <div className="profile-field profile-full">

                <label>
                  Descripción
                </label>

                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  placeholder="Describe tu experiencia o especialidad..."
                  rows="5"
                />

              </div>

            </div>

            <div className="profile-form-actions">

              <button
                type="submit"
                disabled={saving}
                className="save-profile-button"
              >
                {saving
                  ? "Guardando..."
                  : "Guardar cambios"}
              </button>

            </div>

          </form>

        </div>

      </div>

    </div>
  );
}

export default BarberProfile;
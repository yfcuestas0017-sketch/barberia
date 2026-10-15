import { useEffect, useState } from "react";
import api from "../../services/api";
import ImageUploader from "../../components/ImageUploader/ImageUploader";
import ChangePassword from "../../components/ChangePassword/ChangePassword";

import "./AdminPerfil.css";

function AdminPerfil() {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    foto: ""
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
      const response = await api.put("/users/me", {
        nombre: form.nombre,
        apellido: form.apellido,
        telefono: form.telefono,
        foto: form.foto
      });
      setMessage(response.data.message || "Perfil actualizado correctamente.");
      await loadProfile();
    } catch (error) {
      console.error(error);
      setError(error.response?.data?.message || "No se pudo actualizar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="barber-loading">Cargando perfil...</div>;

  return (
    <div className="barber-profile">
      <div className="barber-page-title">
        <div>
          <h2>Mi perfil (Administrador)</h2>
          <p>Administra tu información personal y cuenta.</p>
        </div>
      </div>

      <div className="admin-profile-layout">
        <div className="profile-form-card">
          <div className="profile-card-header">
            <h3>Información personal</h3>
            <p>Actualiza los datos de tu perfil.</p>
          </div>
          
          {message && <div className="profile-success">{message}</div>}
          {error && <div className="barber-error profile-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="profile-form-grid">
              <div className="profile-field">
                <label>Nombre</label>
                <input type="text" name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" />
              </div>

              <div className="profile-field">
                <label>Apellido</label>
                <input type="text" name="apellido" value={form.apellido} onChange={handleChange} placeholder="Apellido" />
              </div>

              <div className="profile-field">
                <label>Correo electrónico</label>
                <input type="email" value={form.email} disabled />
              </div>

              <div className="profile-field">
                <label>Teléfono</label>
                <input type="text" name="telefono" value={form.telefono} onChange={handleChange} placeholder="Teléfono" />
              </div>

              <div className="profile-field profile-full">
                <ImageUploader label="Foto" value={form.foto} onChange={(url) => setForm((prev) => ({ ...prev, foto: url }))} />
              </div>
            </div>

            <div className="profile-form-actions">
              <button type="submit" disabled={saving} className="save-profile-button">
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>

      </div>

      <ChangePassword />

    </div>
  );
}

export default AdminPerfil;
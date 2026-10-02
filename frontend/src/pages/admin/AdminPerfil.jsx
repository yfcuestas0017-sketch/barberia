import { useEffect, useState } from "react";
import api from "../../services/api";
import ImageUploader from "../../components/ImageUploader/ImageUploader";

import "./AdminPerfil.css";

function AdminPerfil() {
  const [profile, setProfile] = useState(null);

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    foto: ""
  });

  const [passForm, setPassForm] = useState({
    password_actual: "",
    password_nuevo: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [passMessage, setPassMessage] = useState("");
  const [passError, setPassError] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);

      const response = await api.get("/users/me");

      setProfile(response.data);

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

  const handlePassChange = (e) => {
    setPassForm({
      ...passForm,
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
      setProfile(response.data.user);
      setMessage(response.data.message || "Perfil actualizado correctamente.");
      await loadProfile();
    } catch (error) {
      console.error(error);
      setError(error.response?.data?.message || "No se pudo actualizar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassMessage("");
    setPassError("");

    if (!passForm.password_actual || !passForm.password_nuevo) {
      setPassError("Ambas contraseñas son obligatorias.");
      return;
    }

    try {
      setSavingPass(true);
      const response = await api.put("/users/me/password", passForm);
      setPassMessage(response.data.message || "Contraseña actualizada.");
      setPassForm({ password_actual: "", password_nuevo: "" });
    } catch (error) {
      console.error(error);
      setPassError(error.response?.data?.message || "No se pudo actualizar la contraseña.");
    } finally {
      setSavingPass(false);
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

      <div className="profile-layout">
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

        <div className="profile-form-card">
          <div className="profile-card-header">
            <h3>Cambiar contraseña</h3>
            <p>Actualiza la contraseña de tu cuenta.</p>
          </div>
          
          {passMessage && <div className="profile-success">{passMessage}</div>}
          {passError && <div className="barber-error profile-error">{passError}</div>}

          <form onSubmit={handlePasswordSubmit}>
            <div className="profile-form-grid">
              <div className="profile-field">
                <label>Contraseña actual</label>
                <input type="password" name="password_actual" value={passForm.password_actual} onChange={handlePassChange} />
              </div>

              <div className="profile-field">
                <label>Nueva contraseña</label>
                <input type="password" name="password_nuevo" value={passForm.password_nuevo} onChange={handlePassChange} />
              </div>
            </div>

            <div className="profile-form-actions">
              <button type="submit" disabled={savingPass} className="save-profile-button" style={{background: 'var(--danger)', borderColor: 'var(--danger)'}}>
                {savingPass ? "Actualizando..." : "Actualizar contraseña"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AdminPerfil;
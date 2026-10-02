import { useEffect, useState } from "react";
import api from "../../services/api";
import ImageUploader from "../../components/ImageUploader/ImageUploader";

import "./Barbers.css";

function Barbers() {
  const [barbers, setBarbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingBarber, setEditingBarber] = useState(null);

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    password: "",
    especialidad: "",
    descripcion: "",
    foto: ""
  });

  useEffect(() => {
    loadBarbers();
  }, []);

  const loadBarbers = async () => {
    try {
      setLoading(true);

      const response = await api.get("/barbers");

      setBarbers(response.data);
      setError("");

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "No se pudieron cargar los barberos"
      );
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingBarber(null);

    setForm({
      nombre: "",
      apellido: "",
      email: "",
      telefono: "",
      password: "",
      especialidad: "",
      descripcion: "",
      foto: ""
    });

    setShowModal(true);
  };

  const openEditModal = (barber) => {
    setEditingBarber(barber);

    setForm({
      nombre: barber.nombre || "",
      apellido: barber.apellido || "",
      email: barber.email || "",
      telefono: barber.telefono || "",
      password: "",
      especialidad: barber.especialidad || "",
      descripcion: barber.descripcion || "",
      foto: barber.foto || ""
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingBarber(null);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      if (editingBarber) {
        await api.put(
          `/barbers/${editingBarber.id_barbero}`,
          form
        );
      } else {
        await api.post("/barbers", form);
      }

      closeModal();
      await loadBarbers();

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "No se pudo guardar el barbero"
      );
    }
  };

  const handleToggle = async (item) => {
    const activating = !item.activo;

    const confirmed = window.confirm(
      activating
        ? "¿Deseas activar este barbero?"
        : "¿Deseas desactivar este barbero? Dejará de mostrarse a los clientes."
    );

    if (!confirmed) return;

    try {
      await api.patch(`/barbers/${item.id_barbero}/status`, {
        activo: activating
      });

      await loadBarbers();
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "No se pudo cambiar el estado"
      );
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "¿Eliminar este barbero de forma definitiva? Esta acción no se puede deshacer."
    );

    if (!confirmed) return;

    try {
      await api.delete(`/barbers/${id}`);

      await loadBarbers();
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "No se pudo eliminar este barbero"
      );
    }
  };

  if (loading) {
    return <div className="page-loading">Cargando barberos...</div>;
  }

  return (
    <div className="barbers-page">

      <div className="page-title">

        <div>
          <h2>Barberos</h2>
          <p>
            Administra los barberos de la barbería.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={openCreateModal}
        >
          + Nuevo barbero
        </button>

      </div>

      {error && (
        <div className="page-error">
          {error}
        </div>
      )}

      <div className="barbers-table-container">

        <table>

          <thead>
            <tr>
              <th>Barbero</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Especialidad</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>

            {barbers.length === 0 ? (

              <tr>
                <td colSpan="6" className="empty-row">
                  No hay barberos registrados.
                </td>
              </tr>

            ) : (

              barbers.map((barber) => (

                <tr key={barber.id_barbero}>

                  <td>
                    <div className="barber-name">

                      <div className="avatar">
                        {barber.foto ? (
                          <img src={barber.foto} alt={barber.nombre} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <>
                            {barber.nombre?.charAt(0)}
                            {barber.apellido?.charAt(0)}
                          </>
                        )}
                      </div>

                      <div>
                        <strong>
                          {barber.nombre} {barber.apellido}
                        </strong>

                        <small>
                          ID: {barber.id_barbero}
                        </small>
                      </div>

                    </div>
                  </td>

                  <td>
                    {barber.email}
                  </td>

                  <td>
                    {barber.telefono || "—"}
                  </td>

                  <td>
                    {barber.especialidad || "General"}
                  </td>

                  <td>

                    <span
                      className={
                        barber.activo
                          ? "status active"
                          : "status inactive"
                      }
                    >
                      {barber.activo
                        ? "Activo"
                        : "Inactivo"}
                    </span>

                  </td>

                  <td>

                    <div className="actions">

                      <button
                        className="edit-button"
                        onClick={() => openEditModal(barber)}
                      >
                        Editar
                      </button>

                      <button
                        className={`toggle-button ${barber.activo ? "deactivate" : "activate"}`}
                        onClick={() => handleToggle(barber)}
                      >
                        {barber.activo ? "Desactivar" : "Activar"}
                      </button>

                      <button
                        className="delete-button"
                        onClick={() =>
                          handleDelete(barber.id_barbero)
                        }
                      >
                        Eliminar
                      </button>

                    </div>

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

      {showModal && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <div>
                <h3>
                  {editingBarber
                    ? "Editar barbero"
                    : "Nuevo barbero"}
                </h3>

                <p>
                  {editingBarber
                    ? "Actualiza la información del barbero."
                    : "Registra un nuevo barbero."}
                </p>
              </div>

              <button
                className="close-button"
                onClick={closeModal}
              >
                ×
              </button>

            </div>

            <form onSubmit={handleSubmit}>

              <div className="form-grid">

                <div className="form-group">
                  <label>Nombre</label>

                  <input
                    type="text"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Apellido</label>

                  <input
                    type="text"
                    name="apellido"
                    value={form.apellido}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>

                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Teléfono</label>

                  <input
                    type="text"
                    name="telefono"
                    value={form.telefono}
                    onChange={handleChange}
                  />
                </div>

                {!editingBarber && (
                  <div className="form-group">
                    <label>Contraseña</label>

                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Especialidad</label>

                  <input
                    type="text"
                    name="especialidad"
                    value={form.especialidad}
                    onChange={handleChange}
                    placeholder="Ej. Fade, clásico..."
                  />
                </div>

                <div className="form-group full">
                  <label>Descripción</label>

                  <textarea
                    name="descripcion"
                    value={form.descripcion}
                    onChange={handleChange}
                    rows="4"
                  />
                </div>

                <div className="form-group full">
                  <ImageUploader
                    label="Foto del barbero"
                    value={form.foto}
                    onChange={(url) =>
                      setForm((prev) => ({ ...prev, foto: url }))
                    }
                  />
                </div>

              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={closeModal}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="primary-button"
                >
                  {editingBarber
                    ? "Guardar cambios"
                    : "Crear barbero"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default Barbers;
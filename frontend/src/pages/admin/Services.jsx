import { useEffect, useState } from "react";
import api from "../../services/api";
import ImageUploader from "../../components/ImageUploader/ImageUploader";

import "./Services.css";

function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    duracion_minutos: "",
    foto: ""
  });

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);

      const response = await api.get("/services");

      setServices(response.data);
      setError("");
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "No se pudieron cargar los servicios"
      );
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingService(null);

    setForm({
      nombre: "",
      descripcion: "",
      precio: "",
      duracion_minutos: "",
      foto: ""
    });

    setShowModal(true);
  };

  const openEditModal = (service) => {
    setEditingService(service);

    setForm({
      nombre: service.nombre || "",
      descripcion: service.descripcion || "",
      precio: service.precio || "",
      duracion_minutos: service.duracion_minutos || "",
      foto: service.foto || ""
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingService(null);
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
      const data = {
        ...form,
        precio: Number(form.precio),
        duracion_minutos: Number(form.duracion_minutos)
      };

      if (editingService) {
        await api.put(
          `/services/${editingService.id_servicio}`,
          data
        );
      } else {
        await api.post("/services", data);
      }

      closeModal();
      await loadServices();

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "No se pudo guardar el servicio"
      );
    }
  };

  const handleToggle = async (item) => {
    const activating = !item.activo;

    const confirmed = window.confirm(
      activating
        ? "¿Deseas activar este servicio?"
        : "¿Deseas desactivar este servicio? Dejará de mostrarse a los clientes."
    );

    if (!confirmed) return;

    try {
      await api.patch(`/services/${item.id_servicio}/status`, {
        activo: activating
      });

      await loadServices();
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
      "¿Eliminar este servicio de forma definitiva? Esta acción no se puede deshacer."
    );

    if (!confirmed) return;

    try {
      await api.delete(`/services/${id}`);

      await loadServices();
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "No se pudo eliminar este servicio"
      );
    }
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  };

  if (loading) {
    return (
      <div className="page-loading">
        Cargando servicios...
      </div>
    );
  }

  return (
    <div className="services-page">

      <div className="page-title">

        <div>
          <h2>Servicios</h2>

          <p>
            Administra los servicios ofrecidos por la barbería.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={openCreateModal}
        >
          + Nuevo servicio
        </button>

      </div>

      {error && (
        <div className="page-error">
          {error}
        </div>
      )}

      <div className="services-grid">

        {services.length === 0 ? (

          <div className="empty-services">
            No hay servicios registrados.
          </div>

        ) : (

          services.map((service) => (

            <div
              className="service-card"
              key={service.id_servicio}
            >

              <div className="service-image">

                {service.foto ? (
                  <img
                    src={service.foto}
                    alt={service.nombre}
                  />
                ) : (
                  <div className="no-image">
                    Sin imagen
                  </div>
                )}

              </div>

              <div className="service-content">

                <div className="service-top">

                  <h3>{service.nombre}</h3>

                  <span
                    className={
                      service.activo
                        ? "status active"
                        : "status inactive"
                    }
                  >
                    {service.activo
                      ? "Activo"
                      : "Inactivo"}
                  </span>

                </div>

                <p className="service-description">
                  {service.descripcion ||
                    "Sin descripción"}
                </p>

                <div className="service-info">

                  <div>
                    <span>Precio</span>
                    <strong>
                      {formatMoney(service.precio)}
                    </strong>
                  </div>

                  <div>
                    <span>Duración</span>
                    <strong>
                      {service.duracion_minutos} min
                    </strong>
                  </div>

                </div>

                <div className="service-actions">

                  <button
                    className="edit-button"
                    onClick={() =>
                      openEditModal(service)
                    }
                  >
                    Editar
                  </button>

                  <button
                    className={`toggle-button ${service.activo ? "deactivate" : "activate"}`}
                    onClick={() => handleToggle(service)}
                  >
                    {service.activo ? "Desactivar" : "Activar"}
                  </button>

                  <button
                    className="delete-button"
                    onClick={() =>
                      handleDelete(service.id_servicio)
                    }
                  >
                    Eliminar
                  </button>

                </div>

              </div>

            </div>

          ))

        )}

      </div>

      {showModal && (

        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">

              <div>

                <h3>
                  {editingService
                    ? "Editar servicio"
                    : "Nuevo servicio"}
                </h3>

                <p>
                  {editingService
                    ? "Actualiza la información del servicio."
                    : "Registra un nuevo servicio."}
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

                <div className="form-group full">
                  <label>Nombre del servicio</label>

                  <input
                    type="text"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder="Ej. Corte clásico"
                    required
                  />
                </div>

                <div className="form-group">

                  <label>Precio</label>

                  <input
                    type="number"
                    name="precio"
                    value={form.precio}
                    onChange={handleChange}
                    min="0"
                    step="100"
                    placeholder="25000"
                    required
                  />

                </div>

                <div className="form-group">

                  <label>Duración</label>

                  <input
                    type="number"
                    name="duracion_minutos"
                    value={form.duracion_minutos}
                    onChange={handleChange}
                    min="1"
                    placeholder="45"
                    required
                  />

                </div>

                <div className="form-group full">

                  <ImageUploader
                    label="Foto del servicio"
                    value={form.foto}
                    onChange={(url) =>
                      setForm((prev) => ({ ...prev, foto: url }))
                    }
                  />

                </div>

                <div className="form-group full">

                  <label>Descripción</label>

                  <textarea
                    name="descripcion"
                    value={form.descripcion}
                    onChange={handleChange}
                    rows="4"
                    placeholder="Describe el servicio..."
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
                  {editingService
                    ? "Guardar cambios"
                    : "Crear servicio"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default Services;
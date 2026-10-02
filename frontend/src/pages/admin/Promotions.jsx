import { useEffect, useState } from "react";
import api from "../../services/api";
import ImageUploader from "../../components/ImageUploader/ImageUploader";

import "./Promotions.css";

function Promotions() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    precio: "",
    duracion_minutos: "30",
    foto: "",
    fecha_inicio: "",
    fecha_fin: ""
  });

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      setLoading(true);

      const response = await api.get("/promotions");

      setPromotions(response.data);
      setError("");
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "No se pudieron cargar las promociones"
      );
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingPromotion(null);

    setForm({
      nombre: "",
      descripcion: "",
      precio: "",
      foto: "",
      fecha_inicio: "",
      fecha_fin: ""
    });

    setShowModal(true);
  };

  const openEditModal = (promotion) => {
    setEditingPromotion(promotion);

    setForm({
      nombre: promotion.nombre || "",
      descripcion: promotion.descripcion || "",
      precio: promotion.precio || "",
      duracion_minutos: promotion.duracion_minutos || "30",
      foto: promotion.foto || "",
      fecha_inicio: promotion.fecha_inicio
        ? promotion.fecha_inicio.slice(0, 10)
        : "",
      fecha_fin: promotion.fecha_fin
        ? promotion.fecha_fin.slice(0, 10)
        : ""
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPromotion(null);
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

    if (
      form.fecha_inicio &&
      form.fecha_fin &&
      form.fecha_fin < form.fecha_inicio
    ) {
      setError(
        "La fecha final no puede ser anterior a la fecha inicial."
      );

      return;
    }

    try {
      const data = {
        ...form,
        precio: Number(form.precio),
        duracion_minutos: Number(form.duracion_minutos)
      };

      if (editingPromotion) {
        await api.put(
          `/promotions/${editingPromotion.id_promocion}`,
          data
        );
      } else {
        await api.post("/promotions", data);
      }

      closeModal();
      await loadPromotions();

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "No se pudo guardar la promoción"
      );
    }
  };

  const handleToggle = async (item) => {
    const activating = !item.activo;

    const confirmed = window.confirm(
      activating
        ? "¿Deseas activar esta promoción?"
        : "¿Deseas desactivar esta promoción? Dejará de mostrarse a los clientes."
    );

    if (!confirmed) return;

    try {
      await api.patch(`/promotions/${item.id_promocion}/status`, {
        activo: activating
      });

      await loadPromotions();
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
      "¿Eliminar esta promoción de forma definitiva? Esta acción no se puede deshacer."
    );

    if (!confirmed) return;

    try {
      await api.delete(`/promotions/${id}`);

      await loadPromotions();
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "No se pudo eliminar esta promoción"
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

  const formatDate = (date) => {
    if (!date) return "Sin fecha";

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "es-CO",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );
  };

  if (loading) {
    return (
      <div className="page-loading">
        Cargando promociones...
      </div>
    );
  }

  return (
    <div className="promotions-page">

      <div className="page-title">

        <div>
          <h2>Promociones</h2>

          <p>
            Administra las promociones de la barbería.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={openCreateModal}
        >
          + Nueva promoción
        </button>

      </div>

      {error && (
        <div className="page-error">
          {error}

          <button
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}

      <div className="promotions-grid">

        {promotions.length === 0 ? (

          <div className="empty-promotions">
            No hay promociones registradas.
          </div>

        ) : (

          promotions.map((promotion) => (

            <div
              className="promotion-card"
              key={promotion.id_promocion}
            >

              <div className="promotion-image">

                {promotion.foto ? (
                  <img
                    src={promotion.foto}
                    alt={promotion.nombre}
                  />
                ) : (
                  <div className="no-image">
                    Sin imagen
                  </div>
                )}

                <span
                  className={
                    promotion.activo
                      ? "status active"
                      : "status inactive"
                  }
                >
                  {promotion.activo
                    ? "Activa"
                    : "Inactiva"}
                </span>

              </div>

              <div className="promotion-content">

                <h3>{promotion.nombre}</h3>

                <p className="promotion-description">
                  {promotion.descripcion ||
                    "Sin descripción"}
                </p>

                <div className="promotion-price">
                  {formatMoney(promotion.precio)}

                  <small>{promotion.duracion_minutos} min</small>
                </div>

                <div className="promotion-dates">

                  <div>
                    <span>Desde</span>
                    <strong>
                      {formatDate(
                        promotion.fecha_inicio
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Hasta</span>
                    <strong>
                      {formatDate(
                        promotion.fecha_fin
                      )}
                    </strong>
                  </div>

                </div>

                <div className="promotion-actions">

                  <button
                    className="edit-button"
                    onClick={() =>
                      openEditModal(promotion)
                    }
                  >
                    Editar
                  </button>

                  <button
                    className={`toggle-button ${promotion.activo ? "deactivate" : "activate"}`}
                    onClick={() => handleToggle(promotion)}
                  >
                    {promotion.activo ? "Desactivar" : "Activar"}
                  </button>

                  <button
                    className="delete-button"
                    onClick={() =>
                      handleDelete(promotion.id_promocion)
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
                  {editingPromotion
                    ? "Editar promoción"
                    : "Nueva promoción"}
                </h3>

                <p>
                  Configura los datos de la promoción.
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
                  <label>Nombre</label>

                  <input
                    type="text"
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder="Ej. Combo Corte + Barba + Cejas"
                    required
                  />
                </div>

                <div className="form-group">

                  <label>Precio promocional</label>

                  <input
                    type="number"
                    name="precio"
                    value={form.precio}
                    onChange={handleChange}
                    min="0"
                    step="100"
                    required
                  />

                </div>

                <div className="form-group">

                  <label>Duración (minutos)</label>

                  <input
                    type="number"
                    name="duracion_minutos"
                    value={form.duracion_minutos}
                    onChange={handleChange}
                    min="5"
                    step="5"
                    required
                  />

                </div>

                <div className="form-group">

                  <ImageUploader
                    label="Imagen"
                    value={form.foto}
                    onChange={(url) =>
                      setForm((prev) => ({ ...prev, foto: url }))
                    }
                  />

                </div>

                <div className="form-group">

                  <label>Fecha de inicio</label>

                  <input
                    type="date"
                    name="fecha_inicio"
                    value={form.fecha_inicio}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="form-group">

                  <label>Fecha de finalización</label>

                  <input
                    type="date"
                    name="fecha_fin"
                    value={form.fecha_fin}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="form-group full">

                  <label>Descripción</label>

                  <textarea
                    name="descripcion"
                    value={form.descripcion}
                    onChange={handleChange}
                    rows="4"
                    placeholder="Describe la promoción..."
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
                  {editingPromotion
                    ? "Guardar cambios"
                    : "Crear promoción"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default Promotions;
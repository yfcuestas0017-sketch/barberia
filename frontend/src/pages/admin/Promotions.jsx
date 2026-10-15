import { useEffect, useState } from "react";
import api from "../../services/api";
import ImageUploader from "../../components/ImageUploader/ImageUploader";

import "./Promotions.css";

function Promotions() {
  const [promotions, setPromotions] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [barbersLoading, setBarbersLoading] = useState(true);
  const [barbersError, setBarbersError] = useState("");
  const [barberSearch, setBarberSearch] = useState("");
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
    fecha_fin: "",
    barberos: []
  });

  useEffect(() => {
    loadPromotions();
    loadBarbers();
  }, []);

  const loadBarbers = async () => {
    try {
      setBarbersLoading(true);
      const response = await api.get("/barbers");

      setBarbers(response.data);
      setBarbersError("");
    } catch (error) {
      console.error(error);
      setBarbersError(
        error.response?.data?.message ||
        "No se pudieron cargar los barberos."
      );
    } finally {
      setBarbersLoading(false);
    }
  };

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
      duracion_minutos: "30",
      foto: "",
      fecha_inicio: "",
      fecha_fin: "",
      barberos: []
    });

    setBarberSearch("");
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
        : "",
      barberos: (promotion.barberos || [])
        .filter((barber) => barber.activo)
        .map((barber) => Number(barber.id_barbero))
    });

    setBarberSearch("");
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

  const toggleBarber = (idBarbero) => {
    setForm((previous) => ({
      ...previous,
      barberos: previous.barberos.some((id) => String(id) === String(idBarbero))
        ? previous.barberos.filter((id) => String(id) !== String(idBarbero))
        : [...previous.barberos, Number(idBarbero)]
    }));
  };

  const selectAllBarbers = () => {
    setForm((previous) => ({
      ...previous,
      barberos: availableBarbers.map((barber) => Number(barber.id_barbero))
    }));
  };

  const clearBarbers = () => {
    setForm((previous) => ({ ...previous, barberos: [] }));
  };

  const availableBarbers = barbers.filter((barber) => barber.activo);
  const normalizedSearch = barberSearch.trim().toLocaleLowerCase("es");
  const filteredBarbers = availableBarbers.filter((barber) =>
    `${barber.nombre} ${barber.apellido} ${barber.especialidad || ""}`
      .toLocaleLowerCase("es")
      .includes(normalizedSearch)
  );
  const selectedBarberCount = form.barberos.filter((id) =>
    availableBarbers.some((barber) => String(barber.id_barbero) === String(id))
  ).length;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.barberos.length === 0) {
      setError(
        "Selecciona al menos un barbero que atienda esta promoción."
      );

      return;
    }

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
      const res = await api.delete(`/promotions/${id}`);

      // Si tenía historial, el servidor lo archiva y lo avisamos
      if (res.data?.archivado) {
        window.alert(res.data.message);
      }

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

                {promotion.creada_por_barbero && (
                  <span className="promotion-owner">
                    Creada por {promotion.creador_nombre || "un barbero"}
                  </span>
                )}

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

                <div className="promotion-barbers">

                  <span>Barberos que la atienden</span>

                  {(promotion.barberos || []).length === 0 ? (
                    <p className="promotion-note">
                      Ningún barbero asignado: no se muestra a los
                      clientes.
                    </p>
                  ) : (
                    <div className="promotion-barber-chips">
                      {promotion.barberos.map((barber) => (
                        <span
                          key={barber.id_barbero}
                          className={`barber-chip ${barber.activo ? "" : "inactive"}`}
                          title={barber.activo ? "" : "Barbero inactivo"}
                        >
                          <span className="barber-chip-photo">
                            {barber.foto ? (
                              <img src={barber.foto} alt="" />
                            ) : (
                              barber.nombre?.charAt(0)?.toUpperCase()
                            )}
                          </span>
                          {barber.nombre} {barber.apellido}
                        </span>
                      ))}
                    </div>
                  )}

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

                  <div className="barber-picker-head">
                    <div className="barber-picker-title">
                      <label>Barberos de la promoción</label>
                      <p>Elige quiénes podrán atender las reservas de esta oferta.</p>
                    </div>

                    <span className="barber-picker-count">
                      {selectedBarberCount} de {availableBarbers.length} seleccionados
                    </span>
                  </div>

                  <div className="barber-picker-toolbar">
                    <label className="barber-picker-search">
                      <span aria-hidden="true">⌕</span>
                      <input
                        type="search"
                        value={barberSearch}
                        onChange={(event) => setBarberSearch(event.target.value)}
                        placeholder="Buscar barbero..."
                        aria-label="Buscar barbero"
                      />
                    </label>

                    <div className="barber-picker-actions">
                      <button
                        type="button"
                        onClick={selectAllBarbers}
                        disabled={availableBarbers.length === 0}
                      >
                        Seleccionar todos
                      </button>
                      <button
                        type="button"
                        onClick={clearBarbers}
                        disabled={selectedBarberCount === 0}
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  {barbersLoading ? (
                    <p className="barber-picker-state">Cargando barberos...</p>
                  ) : barbersError ? (
                    <p className="barber-picker-state error">{barbersError}</p>
                  ) : availableBarbers.length === 0 ? (
                    <p className="barber-picker-state">
                      No hay barberos activos disponibles para esta promoción.
                    </p>
                  ) : (
                    <div className="barber-picker">
                      {filteredBarbers.map((barber) => {
                        const checked = form.barberos.some(
                          (id) => String(id) === String(barber.id_barbero)
                        );

                        return (
                          <button
                            type="button"
                            key={barber.id_barbero}
                            className={`barber-option-card ${checked ? "selected" : ""}`}
                            aria-pressed={checked}
                            onClick={() => toggleBarber(barber.id_barbero)}
                          >
                            <span className="barber-option-name">
                              {barber.nombre} {barber.apellido}
                            </span>
                            <span className="barber-option-check" aria-hidden="true">
                              {checked ? "Seleccionado" : "Elegir"}
                            </span>
                          </button>
                        );
                      })}
                      {filteredBarbers.length === 0 && (
                        <p className="barber-picker-state">
                          No hay coincidencias para “{barberSearch}”.
                        </p>
                      )}
                    </div>
                  )}

                  {!barbersLoading && !barbersError && availableBarbers.length > 0 && (
                    <p className="barber-picker-hint">
                      Solo los barberos seleccionados aparecerán como opción al reservar esta promoción.
                    </p>
                  )}

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
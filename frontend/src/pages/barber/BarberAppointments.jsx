import { useEffect, useState } from "react";
import api from "../../services/api";

import "./BarberAppointments.css";

function BarberAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    fecha: "",
    estado: ""
  });

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);

      const response = await api.get("/appointments/barber/my");

      setAppointments(response.data);
      setError("");
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "No se pudieron cargar las citas."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, estado) => {
    try {
      await api.put(`/appointments/${id}/status`, {
        estado
      });

      await loadAppointments();
    } catch (error) {
      console.error(error);

      alert(
        error.response?.data?.message ||
        "No se pudo actualizar el estado."
      );
    }
  };

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "es-CO",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }
    );
  };

  const formatTime = (time) => {
    if (!time) return "";

    return time.slice(0, 5);
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  };

  const filteredAppointments = appointments.filter((appointment) => {
    const matchesDate =
      !filters.fecha ||
      String(appointment.fecha).slice(0, 10) === filters.fecha;

    const matchesStatus =
      !filters.estado ||
      appointment.estado === filters.estado;

    return matchesDate && matchesStatus;
  });

  const total = filteredAppointments.length;

  const pending = filteredAppointments.filter(
    (item) => item.estado === "PENDIENTE"
  ).length;

  const confirmed = filteredAppointments.filter(
    (item) => item.estado === "CONFIRMADA"
  ).length;

  const completed = filteredAppointments.filter(
    (item) => item.estado === "COMPLETADA"
  ).length;

  const cancelled = filteredAppointments.filter(
    (item) => item.estado === "CANCELADA"
  ).length;

  if (loading) {
    return (
      <div className="barber-loading">
        Cargando citas...
      </div>
    );
  }

  return (
    <div className="barber-appointments">

      <div className="barber-page-title">

        <div>
          <h2>Mis citas</h2>

          <p>
            Consulta y administra las citas asignadas a ti.
          </p>
        </div>

        <button
          className="barber-refresh"
          onClick={loadAppointments}
        >
          ↻ Actualizar
        </button>

      </div>

      {error && (
        <div className="barber-error">
          {error}
        </div>
      )}

      <div className="appointment-summary">

        <div className="appointment-summary-card">
          <span>Total</span>
          <strong>{total}</strong>
        </div>

        <div className="appointment-summary-card">
          <span>Pendientes</span>
          <strong>{pending}</strong>
        </div>

        <div className="appointment-summary-card">
          <span>Confirmadas</span>
          <strong>{confirmed}</strong>
        </div>

        <div className="appointment-summary-card">
          <span>Completadas</span>
          <strong>{completed}</strong>
        </div>

        <div className="appointment-summary-card">
          <span>Canceladas</span>
          <strong>{cancelled}</strong>
        </div>

      </div>

      <div className="appointment-filters">

        <div className="appointment-filter">

          <label>Fecha</label>

          <input
            type="date"
            value={filters.fecha}
            onChange={(e) =>
              setFilters({
                ...filters,
                fecha: e.target.value
              })
            }
          />

        </div>

        <div className="appointment-filter">

          <label>Estado</label>

          <select
            value={filters.estado}
            onChange={(e) =>
              setFilters({
                ...filters,
                estado: e.target.value
              })
            }
          >
            <option value="">Todos</option>
            <option value="PENDIENTE">Pendiente</option>
            <option value="CONFIRMADA">Confirmada</option>
            <option value="COMPLETADA">Completada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>

        </div>

        <button
          className="clear-filters"
          onClick={() =>
            setFilters({
              fecha: "",
              estado: ""
            })
          }
        >
          Limpiar filtros
        </button>

      </div>

      <div className="appointments-table-container">

        <table className="appointments-table">

          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Cliente</th>
              <th>Servicio</th>
              <th>Precio</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>

            {filteredAppointments.length === 0 ? (

              <tr>
                <td
                  colSpan="7"
                  className="empty-table"
                >
                  No hay citas para los filtros seleccionados.
                </td>
              </tr>

            ) : (

              filteredAppointments.map((appointment) => (

                <tr key={appointment.id_cita}>

                  <td>
                    {formatDate(appointment.fecha)}
                  </td>

                  <td>
                    <strong>
                      {formatTime(appointment.hora_inicio)}
                    </strong>

                    <small>
                      hasta {formatTime(appointment.hora_fin)}
                    </small>
                  </td>

                  <td>

                    <div className="client-info">

                      <div className="client-avatar">
                        {appointment.cliente_nombre
                          ?.charAt(0)
                          ?.toUpperCase()}
                      </div>

                      <div>

                        <strong>
                          {appointment.cliente_nombre}{" "}
                          {appointment.cliente_apellido}
                        </strong>

                        <span>
                          {appointment.cliente_telefono ||
                            appointment.cliente_email}
                        </span>

                      </div>

                    </div>

                  </td>

                  <td>
                    {appointment.servicio_nombre}
                    {appointment.es_promocion && (
                      <span className="promo-badge">Promo</span>
                    )}
                  </td>

                  <td>
                    {formatMoney(appointment.precio)}
                  </td>

                  <td>

                    <span
                      className={`appointment-status ${appointment.estado.toLowerCase()}`}
                    >
                      {appointment.estado}
                    </span>

                  </td>

                  <td>

                    {appointment.estado === "PENDIENTE" && (

                      <div className="appointment-actions">

                        <button
                          className="confirm-button"
                          onClick={() =>
                            handleStatusChange(
                              appointment.id_cita,
                              "CONFIRMADA"
                            )
                          }
                        >
                          Confirmar
                        </button>

                        <button
                          className="cancel-button"
                          onClick={() =>
                            handleStatusChange(
                              appointment.id_cita,
                              "CANCELADA"
                            )
                          }
                        >
                          Cancelar
                        </button>

                      </div>

                    )}

                    {appointment.estado === "CONFIRMADA" && (

                      <div className="appointment-actions">

                        <button
                          className="complete-button"
                          onClick={() =>
                            handleStatusChange(
                              appointment.id_cita,
                              "COMPLETADA"
                            )
                          }
                        >
                          Completar
                        </button>

                        <button
                          className="cancel-button"
                          onClick={() =>
                            handleStatusChange(
                              appointment.id_cita,
                              "CANCELADA"
                            )
                          }
                        >
                          Cancelar
                        </button>

                      </div>

                    )}

                    {appointment.estado === "COMPLETADA" && (

                      <span className="finished-label">
                        Servicio realizado
                      </span>

                    )}

                    {appointment.estado === "CANCELADA" && (

                      <span className="cancelled-label">
                        Cancelada
                      </span>

                    )}

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}

export default BarberAppointments;
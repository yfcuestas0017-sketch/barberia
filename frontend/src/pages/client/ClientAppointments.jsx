import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";

import "./ClientAppointments.css";

function ClientAppointments() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState("TODAS");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAppointments();
  }, []);

  const loadAppointments = async () => {
    try {
      setLoading(true);

      const response = await api.get("/appointments/my");

      setAppointments(response.data);
      setError("");
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
          "No se pudieron cargar tus citas."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  };

  const formatTime = (time) => {
    if (!time) return "-";

    return String(time).slice(0, 5);
  };

  const getStatusLabel = (status) => {
    const labels = {
      PENDIENTE: "Pendiente",
      CONFIRMADA: "Confirmada",
      COMPLETADA: "Completada",
      CANCELADA: "Cancelada"
    };

    return labels[status] || status;
  };

  const filteredAppointments =
    filter === "TODAS"
      ? appointments
      : appointments.filter(
          (appointment) =>
            appointment.estado === filter
        );

  const upcomingAppointments =
    appointments.filter(
      (appointment) =>
        appointment.estado === "PENDIENTE" ||
        appointment.estado === "CONFIRMADA"
    );

  const completedAppointments =
    appointments.filter(
      (appointment) =>
        appointment.estado === "COMPLETADA"
    );

  const cancelledAppointments =
    appointments.filter(
      (appointment) =>
        appointment.estado === "CANCELADA"
    );

  if (loading) {
    return (
      <div className="client-appointments-loading">
        Cargando tus citas...
      </div>
    );
  }

  return (
    <div className="client-appointments">

      <div className="client-appointments-header">

        <div>
          <span>MIS RESERVAS</span>

          <h1>
            Mis citas
          </h1>

          <p>
            Consulta tus próximas citas y tu historial
            de servicios.
          </p>
        </div>

        <button
          className="new-appointment-button"
          onClick={() =>
            navigate("/cliente/reservar")
          }
        >
          + Nueva cita
        </button>

      </div>

      {error && (
        <div className="client-appointments-error">
          {error}
        </div>
      )}

      <div className="appointment-statistics">

        <div className="appointment-stat-card">
          <span>PRÓXIMAS</span>
          <strong>
            {upcomingAppointments.length}
          </strong>
        </div>

        <div className="appointment-stat-card">
          <span>COMPLETADAS</span>
          <strong>
            {completedAppointments.length}
          </strong>
        </div>

        <div className="appointment-stat-card">
          <span>CANCELADAS</span>
          <strong>
            {cancelledAppointments.length}
          </strong>
        </div>

        <div className="appointment-stat-card">
          <span>TOTAL</span>
          <strong>
            {appointments.length}
          </strong>
        </div>

      </div>

      <div className="client-appointments-toolbar">

        <div className="appointment-filters">

          {[
            ["TODAS", "Todas"],
            ["PENDIENTE", "Pendientes"],
            ["CONFIRMADA", "Confirmadas"],
            ["COMPLETADA", "Completadas"],
            ["CANCELADA", "Canceladas"]
          ].map(([value, label]) => (

            <button
              key={value}
              className={
                filter === value
                  ? "appointment-filter active"
                  : "appointment-filter"
              }
              onClick={() => setFilter(value)}
            >
              {label}
            </button>

          ))}

        </div>

        <button
          className="refresh-appointments"
          onClick={loadAppointments}
        >
          Actualizar
        </button>

      </div>

      {filteredAppointments.length === 0 ? (

        <div className="no-client-appointments">

          <div className="no-appointment-icon">
            📅
          </div>

          <h2>
            No tienes citas
          </h2>

          <p>
            {filter === "TODAS"
              ? "Todavía no has realizado ninguna reserva."
              : "No hay citas con este estado."}
          </p>

          {filter === "TODAS" && (
            <button
              onClick={() =>
                navigate("/cliente/reservar")
              }
            >
              Reservar mi primera cita
            </button>
          )}

        </div>

      ) : (

        <div className="client-appointment-list">

          {filteredAppointments.map(
            (appointment) => (

              <article
                className="client-appointment-card"
                key={appointment.id_cita}
              >

                <div className="appointment-date">

                  <span>
                    {new Date(
                      `${appointment.fecha}T00:00:00`
                    ).toLocaleDateString("es-CO", {
                      weekday: "short"
                    })}
                  </span>

                  <strong>
                    {String(
                      appointment.fecha
                    ).slice(8, 10)}
                  </strong>

                  <small>
                    {new Date(
                      `${appointment.fecha}T00:00:00`
                    ).toLocaleDateString("es-CO", {
                      month: "short"
                    })}
                  </small>

                </div>

                <div className="appointment-main">

                  <div className="appointment-main-header">

                    <div>

                      <span className="appointment-service-label">
                        SERVICIO
                      </span>

                      <h2>
                        {appointment.servicio_nombre}
                        {appointment.es_promocion && (
                          <span className="promo-badge">Promo</span>
                        )}
                      </h2>

                    </div>

                    <span
                      className={`appointment-status ${String(
                        appointment.estado
                      ).toLowerCase()}`}
                    >
                      {getStatusLabel(
                        appointment.estado
                      )}
                    </span>

                  </div>

                  <div className="appointment-details">

                    <div>
                      <span>
                        Barbero
                      </span>

                      <strong>
                        {appointment.barbero_nombre}{" "}
                        {appointment.barbero_apellido}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Horario
                      </span>

                      <strong>
                        {formatTime(
                          appointment.hora_inicio
                        )}
                        {" - "}
                        {formatTime(
                          appointment.hora_fin
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Precio
                      </span>

                      <strong>
                        {formatMoney(
                          appointment.precio
                        )}
                      </strong>
                    </div>

                  </div>

                  {appointment.observacion && (
                    <div className="appointment-observation">
                      <span>
                        Observación:
                      </span>{" "}
                      {appointment.observacion}
                    </div>
                  )}

                  {appointment.estado ===
                    "COMPLETADA" && (

                    <div className="appointment-completed-actions">

                      <div className="appointment-completed-message">
                        ✓ Servicio completado
                      </div>

                      <button
                        className="review-appointment-button"
                        onClick={() =>
                          navigate(
                            `/cliente/resenas/${appointment.id_cita}`
                          )
                        }
                      >
                        ⭐ Calificar servicio
                      </button>

                    </div>

                  )}

                </div>

              </article>

            )
          )}

        </div>

      )}

    </div>
  );
}

export default ClientAppointments;
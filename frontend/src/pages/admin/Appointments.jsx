import { useEffect, useState } from "react";
import api from "../../services/api";

import "./Appointments.css";

function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [barbers, setBarbers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    fecha: "",
    id_barbero: "",
    estado: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [appointmentsResponse, barbersResponse] =
        await Promise.all([
          api.get("/appointments/admin"),
          api.get("/barbers")
        ]);

      setAppointments(appointmentsResponse.data);
      setBarbers(barbersResponse.data);

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

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      fecha: "",
      id_barbero: "",
      estado: ""
    });
  };

  const updateStatus = async (id, estado) => {
    try {
      await api.put(`/appointments/${id}/status`, {
        estado
      });

      await loadData();
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "No se pudo actualizar el estado."
      );
    }
  };

  const getStatusClass = (estado) => {
    switch (estado) {
      case "PENDIENTE":
        return "status-pending";

      case "CONFIRMADA":
        return "status-confirmed";

      case "COMPLETADA":
        return "status-completed";

      case "CANCELADA":
        return "status-cancelled";

      default:
        return "";
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(`${date}T00:00:00`).toLocaleDateString(
      "es-CO",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }
    );
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  };

  const filteredAppointments = appointments.filter(
    (appointment) => {
      const matchesDate =
        !filters.fecha ||
        appointment.fecha?.slice(0, 10) === filters.fecha;

      const matchesBarber =
        !filters.id_barbero ||
        String(appointment.id_barbero) ===
          String(filters.id_barbero);

      const matchesStatus =
        !filters.estado ||
        appointment.estado === filters.estado;

      return (
        matchesDate &&
        matchesBarber &&
        matchesStatus
      );
    }
  );

  if (loading) {
    return (
      <div className="page-loading">
        Cargando citas...
      </div>
    );
  }

  return (
    <div className="appointments-page">

      <div className="page-title">

        <div>
          <h2>Citas</h2>

          <p>
            Consulta y administra las citas de la barbería.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={loadData}
        >
          ↻ Actualizar
        </button>

      </div>

      {error && (
        <div className="page-error">
          <span>{error}</span>

          <button
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}

      <div className="appointments-filters">

        <div className="filter-group">

          <label>Fecha</label>

          <input
            type="date"
            name="fecha"
            value={filters.fecha}
            onChange={handleFilterChange}
          />

        </div>

        <div className="filter-group">

          <label>Barbero</label>

          <select
            name="id_barbero"
            value={filters.id_barbero}
            onChange={handleFilterChange}
          >
            <option value="">
              Todos los barberos
            </option>

            {barbers.map((barber) => (
              <option
                key={barber.id_barbero}
                value={barber.id_barbero}
              >
                {barber.nombre} {barber.apellido}
              </option>
            ))}

          </select>

        </div>

        <div className="filter-group">

          <label>Estado</label>

          <select
            name="estado"
            value={filters.estado}
            onChange={handleFilterChange}
          >
            <option value="">Todos</option>
            <option value="PENDIENTE">
              Pendiente
            </option>
            <option value="CONFIRMADA">
              Confirmada
            </option>
            <option value="COMPLETADA">
              Completada
            </option>
            <option value="CANCELADA">
              Cancelada
            </option>
          </select>

        </div>

        <button
          className="clear-filter-button"
          onClick={clearFilters}
        >
          Limpiar filtros
        </button>

      </div>

      <div className="appointments-summary">

        <div>
          <span>Total mostradas</span>
          <strong>
            {filteredAppointments.length}
          </strong>
        </div>

        <div>
          <span>Pendientes</span>
          <strong>
            {
              filteredAppointments.filter(
                (item) => item.estado === "PENDIENTE"
              ).length
            }
          </strong>
        </div>

        <div>
          <span>Confirmadas</span>
          <strong>
            {
              filteredAppointments.filter(
                (item) => item.estado === "CONFIRMADA"
              ).length
            }
          </strong>
        </div>

        <div>
          <span>Completadas</span>
          <strong>
            {
              filteredAppointments.filter(
                (item) => item.estado === "COMPLETADA"
              ).length
            }
          </strong>
        </div>

      </div>

      <div className="appointments-table-container">

        <table className="appointments-table">

          <thead>
            <tr>
              <th>Fecha</th>
              <th>Hora</th>
              <th>Cliente</th>
              <th>Barbero</th>
              <th>Servicio</th>
              <th>Precio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>

            {filteredAppointments.length === 0 ? (

              <tr>
                <td
                  colSpan="8"
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
                      {appointment.hora_inicio?.slice(0, 5)}
                    </strong>

                    <span className="time-end">
                      {" "}
                      -{" "}
                      {appointment.hora_fin?.slice(0, 5)}
                    </span>
                  </td>

                  <td>
                    <div className="person-info">

                      <strong>
                        {appointment.cliente_nombre}{" "}
                        {appointment.cliente_apellido}
                      </strong>

                      <span>
                        {appointment.cliente_email}
                      </span>

                    </div>
                  </td>

                  <td>
                    <div className="person-info">

                      <strong>
                        {appointment.barbero_nombre}{" "}
                        {appointment.barbero_apellido}
                      </strong>

                      <span>
                        {appointment.especialidad ||
                          "Barbero"}
                      </span>

                    </div>
                  </td>

                  <td>
                    {appointment.servicio_nombre}
                    {appointment.es_promocion && (
                      <span className="promo-badge">Promo</span>
                    )}
                  </td>

                  <td>
                    <strong>
                      {formatMoney(appointment.precio)}
                    </strong>
                  </td>

                  <td>

                    <span
                      className={`appointment-status ${getStatusClass(
                        appointment.estado
                      )}`}
                    >
                      {appointment.estado}
                    </span>

                  </td>

                  <td>

                    <select
                      className="status-select"
                      value={appointment.estado}
                      onChange={(event) =>
                        updateStatus(
                          appointment.id_cita,
                          event.target.value
                        )
                      }
                    >
                      <option value="PENDIENTE">
                        Pendiente
                      </option>

                      <option value="CONFIRMADA">
                        Confirmada
                      </option>

                      <option value="COMPLETADA">
                        Completada
                      </option>

                      <option value="CANCELADA">
                        Cancelada
                      </option>
                    </select>

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

export default Appointments;
import { useEffect, useState } from "react";
import api from "../../services/api";

import "./Movements.css";

function Movements() {
  const [movements, setMovements] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    fecha_inicio: "",
    fecha_fin: "",
    tipo: ""
  });

  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    tipo: "EGRESO",
    concepto: "",
    monto: "",
    fecha: new Date().toISOString().slice(0, 10),
    observacion: ""
  });

  useEffect(() => {
    loadMovements();
  }, []);

  const loadMovements = async () => {
    try {
      setLoading(true);

      const params = {};

      if (filters.fecha_inicio) {
        params.fecha_inicio = filters.fecha_inicio;
      }

      if (filters.fecha_fin) {
        params.fecha_fin = filters.fecha_fin;
      }

      if (filters.tipo) {
        params.tipo = filters.tipo;
      }

      const response = await api.get("/movements", {
        params
      });

      setMovements(response.data);
      setError("");

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "No se pudieron cargar los movimientos."
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
      fecha_inicio: "",
      fecha_fin: "",
      tipo: ""
    });
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const openModal = () => {
    setForm({
      tipo: "EGRESO",
      concepto: "",
      monto: "",
      fecha: new Date().toISOString().slice(0, 10),
      observacion: ""
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      await api.post("/movements", {
        ...form,
        monto: Number(form.monto)
      });

      closeModal();

      await loadMovements();

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "No se pudo registrar el movimiento."
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

  const totalIngresos = movements
    .filter((movement) => movement.tipo === "INGRESO")
    .reduce(
      (total, movement) =>
        total + Number(movement.monto),
      0
    );

  const totalEgresos = movements
    .filter((movement) => movement.tipo === "EGRESO")
    .reduce(
      (total, movement) =>
        total + Number(movement.monto),
      0
    );

  const utilidad = totalIngresos - totalEgresos;

  if (loading) {
    return (
      <div className="page-loading">
        Cargando movimientos...
      </div>
    );
  }

  return (
    <div className="movements-page">

      <div className="page-title">

        <div>
          <h2>Movimientos</h2>

          <p>
            Control de ingresos y egresos de la barbería.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={openModal}
        >
          + Registrar egreso
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

      <div className="movement-summary">

        <div className="movement-card">

          <span>Total ingresos</span>

          <strong className="income">
            {formatMoney(totalIngresos)}
          </strong>

        </div>

        <div className="movement-card">

          <span>Total egresos</span>

          <strong className="expense">
            {formatMoney(totalEgresos)}
          </strong>

        </div>

        <div className="movement-card">

          <span>Utilidad</span>

          <strong>
            {formatMoney(utilidad)}
          </strong>

        </div>

        <div className="movement-card">

          <span>Movimientos</span>

          <strong>
            {movements.length}
          </strong>

        </div>

      </div>

      <div className="movement-filters">

        <div className="filter-group">

          <label>Desde</label>

          <input
            type="date"
            name="fecha_inicio"
            value={filters.fecha_inicio}
            onChange={handleFilterChange}
          />

        </div>

        <div className="filter-group">

          <label>Hasta</label>

          <input
            type="date"
            name="fecha_fin"
            value={filters.fecha_fin}
            onChange={handleFilterChange}
          />

        </div>

        <div className="filter-group">

          <label>Tipo</label>

          <select
            name="tipo"
            value={filters.tipo}
            onChange={handleFilterChange}
          >
            <option value="">
              Todos
            </option>

            <option value="INGRESO">
              Ingresos
            </option>

            <option value="EGRESO">
              Egresos
            </option>

          </select>

        </div>

        <button
          className="filter-button"
          onClick={loadMovements}
        >
          Filtrar
        </button>

        <button
          className="clear-filter-button"
          onClick={clearFilters}
        >
          Limpiar
        </button>

      </div>

      <div className="movements-table-container">

        <table className="movements-table">

          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Concepto</th>
              <th>Monto</th>
              <th>Registrado por</th>
              <th>Observación</th>
            </tr>
          </thead>

          <tbody>

            {movements.length === 0 ? (

              <tr>
                <td
                  colSpan="6"
                  className="empty-table"
                >
                  No hay movimientos registrados.
                </td>
              </tr>

            ) : (

              movements.map((movement) => (

                <tr key={movement.id_movimiento}>

                  <td>
                    {formatDate(movement.fecha)}
                  </td>

                  <td>

                    <span
                      className={
                        movement.tipo === "INGRESO"
                          ? "movement-type income-type"
                          : "movement-type expense-type"
                      }
                    >
                      {movement.tipo}
                    </span>

                  </td>

                  <td>
                    <strong>
                      {movement.concepto}
                    </strong>
                  </td>

                  <td>

                    <strong
                      className={
                        movement.tipo === "INGRESO"
                          ? "income"
                          : "expense"
                      }
                    >
                      {formatMoney(movement.monto)}
                    </strong>

                  </td>

                  <td>
                    {movement.usuario_nombre
                      ? `${movement.usuario_nombre} ${movement.usuario_apellido || ""}`
                      : "Sistema"}
                  </td>

                  <td>
                    {movement.observacion || "-"}
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
                <h3>Registrar egreso</h3>

                <p>
                  Registra un gasto realizado por la barbería.
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

              <div className="form-group">

                <label>Concepto</label>

                <input
                  type="text"
                  name="concepto"
                  value={form.concepto}
                  onChange={handleFormChange}
                  placeholder="Ej. Compra de productos"
                  required
                />

              </div>

              <div className="form-group">

                <label>Monto</label>

                <input
                  type="number"
                  name="monto"
                  value={form.monto}
                  onChange={handleFormChange}
                  min="1"
                  step="100"
                  placeholder="0"
                  required
                />

              </div>

              <div className="form-group">

                <label>Fecha</label>

                <input
                  type="date"
                  name="fecha"
                  value={form.fecha}
                  onChange={handleFormChange}
                  required
                />

              </div>

              <div className="form-group">

                <label>Observación</label>

                <textarea
                  name="observacion"
                  value={form.observacion}
                  onChange={handleFormChange}
                  rows="4"
                  placeholder="Información adicional..."
                />

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
                  Registrar egreso
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}

export default Movements;
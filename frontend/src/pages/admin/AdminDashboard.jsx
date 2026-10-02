import { useEffect, useState } from "react";
import api from "../../services/api";
import {
  IconWallet,
  IconTrendDown,
  IconTrendUp,
  IconCalendar,
  IconCheck,
  IconClock,
  IconXCircle,
  IconRefresh,
  IconUsers,
} from "../../components/Icons";

import MonthlyChart from "../../components/MonthlyChart/MonthlyChart";
import PeriodFilter from "../../components/PeriodFilter/PeriodFilter";
import { getPeriod } from "../../components/PeriodFilter/period";

import "./AdminDashboard.css";

function AdminDashboard() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [period, setPeriod] = useState(() => getPeriod("mes"));

  useEffect(() => {
    if (!period.fecha_inicio || !period.fecha_fin) return;
    loadReport();
  }, [period.fecha_inicio, period.fecha_fin]);

  const loadReport = async () => {
    try {
      setLoading(true);

      const response = await api.get("/reports/admin", {
        params: {
          fecha_inicio: period.fecha_inicio,
          fecha_fin: period.fecha_fin
        }
      });

      setReport(response.data);
      setError("");

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "No se pudo cargar el reporte"
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

  if (loading && !report) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-spinner" />
        Cargando dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <IconXCircle size={18} />
        {error}
      </div>
    );
  }

  const resumen = report?.resumen || {};
  const citas = report?.citas || {};
  const barberos = report?.barberos || [];

  const statCards = [
    { label: "Ingresos", value: formatMoney(resumen.ingresos), icon: IconTrendUp, tone: "success" },
    { label: "Egresos", value: formatMoney(resumen.egresos), icon: IconTrendDown, tone: "danger" },
    { label: "Utilidad", value: formatMoney(resumen.utilidad), icon: IconWallet, tone: "gold" },
    { label: "Total citas", value: citas.total || 0, icon: IconCalendar, tone: "info" },
  ];

  const appointmentCards = [
    { label: "Completadas", value: citas.completadas || 0, icon: IconCheck, tone: "success" },
    { label: "Confirmadas", value: citas.confirmadas || 0, icon: IconCalendar, tone: "info" },
    { label: "Pendientes", value: citas.pendientes || 0, icon: IconClock, tone: "warning" },
    { label: "Canceladas", value: citas.canceladas || 0, icon: IconXCircle, tone: "danger" },
  ];

  return (
    <div className="dashboard">

      <div className="dashboard-title">
        <div>
          <h2>Dashboard</h2>
          <p>Resumen general de la barbería</p>
        </div>

        <button className="dashboard-refresh" onClick={loadReport}>
          <IconRefresh size={16} />
          Actualizar
        </button>
      </div>

      <PeriodFilter value={period} onChange={setPeriod} />

      {/* TARJETAS FINANCIERAS */}
      <div className="stats-grid">
        {statCards.map(({ label, value, icon: Icon, tone }) => (
          <div className="stat-card" key={label}>
            <div className={`stat-icon tone-${tone}`}>
              <Icon size={19} />
            </div>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          </div>
        ))}
      </div>

      {/* GANANCIAS MES A MES */}
      <div className="dashboard-chart">
        <MonthlyChart
          title="Ganancias mes a mes"
          data={report?.ingresos_por_mes || []}
          valueKey="utilidad"
          tooltipRows={[
            { label: "Ingresos", key: "ingresos" },
            { label: "Egresos", key: "egresos" },
          ]}
        />
      </div>

      {/* ESTADO DE CITAS */}
      <div className="dashboard-section">
        <h3>Estado de las citas</h3>

        <div className="appointments-grid">
          {appointmentCards.map(({ label, value, icon: Icon, tone }) => (
            <div className={`appointment-card tone-${tone}`} key={label}>
              <Icon size={18} />
              <div>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* BARBEROS */}
      <div className="dashboard-section">
        <div className="section-header">
          <div className="section-header-title">
            <IconUsers size={18} />
            <div>
              <h3>Rendimiento de barberos</h3>
              <p>Desempeño de cada barbero en el período</p>
            </div>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Barbero</th>
                <th>Total citas</th>
                <th>Servicios</th>
                <th>Ingresos</th>
                <th>Utilidad</th>
              </tr>
            </thead>

            <tbody>
              {barberos.length === 0 ? (
                <tr>
                  <td colSpan="5" className="table-empty">
                    No hay información disponible
                  </td>
                </tr>
              ) : (
                barberos.map((barbero) => (
                  <tr key={barbero.id_barbero}>
                    <td>
                      <div className="barber-cell">
                        <span className="barber-avatar">
                          {barbero.foto ? (
                            <img src={barbero.foto} alt={barbero.nombre} />
                          ) : (
                            barbero.nombre?.charAt(0)?.toUpperCase()
                          )}
                        </span>
                        {barbero.nombre} {barbero.apellido}
                      </div>
                    </td>
                    <td>{barbero.total_citas}</td>
                    <td>{barbero.servicios_realizados}</td>
                    <td className="money-cell">{formatMoney(barbero.ingresos)}</td>
                    <td className="money-cell">{formatMoney(barbero.utilidad)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default AdminDashboard;

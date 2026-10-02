import { useEffect, useState } from "react";
import api from "../../services/api";
import {
  IconCheck,
  IconWallet,
  IconXCircle,
  IconStar,
  IconRefresh,
  IconScissors,
  IconChart,
  IconCalendar,
  IconTrendUp,
} from "../../components/Icons";
import MonthlyChart from "../../components/MonthlyChart/MonthlyChart";
import PeriodFilter from "../../components/PeriodFilter/PeriodFilter";
import { getPeriod } from "../../components/PeriodFilter/period";

import "./BarberDashboard.css";

function BarberDashboard() {
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

      const response = await api.get("/reports/barber", {
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
        "No se pudo cargar el reporte."
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
      <div className="barber-loading">
        <div className="dashboard-spinner" />
        Cargando dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="barber-error">
        <IconXCircle size={18} />
        {error}
      </div>
    );
  }

  const resumen = report?.resumen || {};
  const barbero = report?.barbero || {};
  const initials = `${barbero.nombre?.charAt(0) || ""}${barbero.apellido?.charAt(0) || ""}`.toUpperCase() || "B";

  const statCards = [
    {
      label: "Ingresos",
      value: formatMoney(resumen.ingresos),
      hint: "Por servicios completados",
      icon: IconWallet,
      tone: "gold",
    },
    {
      label: "Utilidad",
      value: formatMoney(resumen.utilidad),
      hint: `Tu ganancia (${resumen.comision ?? 0}% de los ingresos)`,
      icon: IconTrendUp,
      tone: "success",
    },
    {
      label: "Total citas",
      value: resumen.total_citas || 0,
      hint: "Todas las citas del período",
      icon: IconCalendar,
      tone: "info",
    },
    {
      label: "Servicios realizados",
      value: resumen.servicios_completados || 0,
      hint: "Servicios completados",
      icon: IconCheck,
      tone: "success",
    },
    {
      label: "Citas canceladas",
      value: resumen.citas_canceladas || 0,
      hint: "En el período",
      icon: IconXCircle,
      tone: "danger",
    },
    {
      label: "Calificación",
      value: resumen.promedio_estrellas || "0.0",
      hint: `${resumen.total_resenas || 0} reseñas`,
      icon: IconStar,
      tone: "info",
    },
  ];

  return (
    <div className="barber-dashboard">

      <div className="barber-page-title">
        <div className="barber-page-identity">
          <div className="barber-photo">
            {barbero.foto ? (
              <img src={barbero.foto} alt={`${barbero.nombre} ${barbero.apellido}`} />
            ) : (
              initials
            )}
          </div>

          <div>
            <h2>
              {barbero.nombre ? `Hola, ${barbero.nombre}` : "Resumen"}
            </h2>
            <p>
              {barbero.especialidad
                ? `${barbero.especialidad} · Consulta el rendimiento de tus servicios.`
                : "Consulta el rendimiento de tus servicios."}
            </p>
          </div>
        </div>

        <button className="barber-refresh" onClick={loadReport}>
          <IconRefresh size={16} />
          Actualizar
        </button>
      </div>

      <PeriodFilter value={period} onChange={setPeriod} />

      <div className="barber-stat-grid">
        {statCards.map(({ label, value, hint, icon: Icon, tone }) => (
          <div className="barber-stat-card" key={label}>
            <div className={`stat-icon tone-${tone}`}>
              <Icon size={19} />
            </div>
            <div>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{hint}</small>
            </div>
          </div>
        ))}
      </div>

      <div className="barber-chart">
        <MonthlyChart
          title="Tus ingresos mes a mes"
          data={report?.ingresos_por_mes || []}
          valueKey="ingresos"
        />
      </div>

      <div className="barber-dashboard-grid">

        <div className="barber-panel">
          <div className="barber-panel-header">
            <IconScissors size={17} />
            <div>
              <h3>Servicios realizados</h3>
              <span>Distribución por servicio</span>
            </div>
          </div>

          {report?.servicios?.length ? (
            <div className="service-report-list">
              {report.servicios.map((service) => (
                <div className="service-report-item" key={service.id_servicio}>
                  <div>
                    <strong>
                      {service.servicio_nombre}
                      {service.es_promocion && (
                        <span className="promo-badge">Promo</span>
                      )}
                    </strong>
                    <span>{service.cantidad} servicios</span>
                  </div>
                  <strong className="service-amount">
                    {formatMoney(service.ingresos)}
                  </strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="barber-empty">
              Todavía no tienes servicios completados.
            </div>
          )}
        </div>

        <div className="barber-panel">
          <div className="barber-panel-header">
            <IconChart size={17} />
            <div>
              <h3>Ingresos por día</h3>
              <span>Rendimiento del período</span>
            </div>
          </div>

          {report?.ingresos_por_dia?.length ? (
            <div className="daily-income-list">
              {report.ingresos_por_dia.map((day) => (
                <div className="daily-income-item" key={day.fecha}>
                  <span>
                    {new Date(`${day.fecha}T00:00:00`).toLocaleDateString(
                      "es-CO",
                      { day: "2-digit", month: "short" }
                    )}
                  </span>
                  <strong>{formatMoney(day.ingresos)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="barber-empty">
              No hay ingresos registrados.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

export default BarberDashboard;

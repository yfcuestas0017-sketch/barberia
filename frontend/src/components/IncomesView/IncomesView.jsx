import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import PeriodFilter from "../PeriodFilter/PeriodFilter";
import { getPeriod } from "../PeriodFilter/period";
import {
  IconWallet,
  IconTrendUp,
  IconTrendDown,
  IconCheck,
  IconXCircle,
} from "../Icons";

import "./IncomesView.css";

const formatMoney = (value) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (date) =>
  new Date(`${String(date).slice(0, 10)}T00:00:00`).toLocaleDateString(
    "es-CO",
    { day: "2-digit", month: "short", year: "numeric" }
  );

// Vista de ingresos compartida.
// role="ADMIN"   -> ingresos de toda la barbería (+ egresos y utilidad neta)
// role="BARBERO" -> ingresos y utilidad propios
function IncomesView({ role }) {
  const isAdmin = role === "ADMIN";

  const [period, setPeriod] = useState(() => getPeriod("mes"));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // No consultamos mientras el rango personalizado esté incompleto
    if (!period.fecha_inicio || !period.fecha_fin) return;

    const load = async () => {
      try {
        setLoading(true);

        const response = await api.get(
          isAdmin ? "/reports/admin" : "/reports/barber",
          {
            params: {
              fecha_inicio: period.fecha_inicio,
              fecha_fin: period.fecha_fin,
            },
          }
        );

        setReport(response.data);
        setError("");
      } catch (err) {
        console.error(err);

        setError(
          err.response?.data?.message || "No se pudieron cargar los ingresos."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [period.fecha_inicio, period.fecha_fin, isAdmin]);

  const detalle = useMemo(() => report?.detalle || [], [report]);
  const resumen = report?.resumen || {};

  const totals = useMemo(() => {
    let servicios = 0;
    let promociones = 0;

    detalle.forEach((row) => {
      if (row.es_promocion) promociones += Number(row.precio);
      else servicios += Number(row.precio);
    });

    return { servicios, promociones, total: servicios + promociones };
  }, [detalle]);

  const cards = isAdmin
    ? [
        { label: "Ingresos", value: formatMoney(resumen.ingresos), icon: IconTrendUp, tone: "success" },
        { label: "Egresos", value: formatMoney(resumen.egresos), icon: IconTrendDown, tone: "danger" },
        { label: "Utilidad neta", value: formatMoney(resumen.utilidad), icon: IconWallet, tone: "gold" },
        { label: "Servicios completados", value: detalle.length, icon: IconCheck, tone: "info" },
      ]
    : [
        { label: "Ingresos generados", value: formatMoney(resumen.ingresos), icon: IconTrendUp, tone: "success" },
        { label: `Tu utilidad (${resumen.comision ?? 0}%)`, value: formatMoney(resumen.utilidad), icon: IconWallet, tone: "gold" },
        { label: "Servicios completados", value: resumen.servicios_completados || 0, icon: IconCheck, tone: "info" },
        {
          label: "Promedio por servicio",
          value: formatMoney(
            detalle.length ? totals.total / detalle.length : 0
          ),
          icon: IconTrendUp,
          tone: "success",
        },
      ];

  return (
    <div className="incomes-page">
      <div className="incomes-title">
        <h2>Ingresos</h2>
        <p>
          {isAdmin
            ? "Ingresos y egresos de la barbería por período."
            : "Lo que has generado con tus servicios y promociones."}
        </p>
      </div>

      <PeriodFilter value={period} onChange={setPeriod} />

      {error && (
        <div className="incomes-error">
          <IconXCircle size={18} />
          {error}
        </div>
      )}

      {loading && !report ? (
        <div className="incomes-loading">Cargando ingresos...</div>
      ) : (
        <>
          <div className={`incomes-cards ${loading ? "is-loading" : ""}`}>
            {cards.map(({ label, value, icon: Icon, tone }) => (
              <div className="incomes-card" key={label}>
                <div className={`incomes-icon tone-${tone}`}>
                  <Icon size={19} />
                </div>
                <div>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              </div>
            ))}
          </div>

          <div className="incomes-split">
            <div>
              <span>Por servicios</span>
              <strong>{formatMoney(totals.servicios)}</strong>
            </div>
            <div>
              <span>Por promociones</span>
              <strong>{formatMoney(totals.promociones)}</strong>
            </div>
          </div>

          {isAdmin && (report?.barberos || []).length > 0 && (
            <div className="incomes-section">
              <h3>Ingresos por barbero</h3>

              <div className="incomes-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Barbero</th>
                      <th>Servicios</th>
                      <th>Ingresos</th>
                      <th>Utilidad barbero</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.barberos.map((barbero) => (
                      <tr key={barbero.id_barbero}>
                        <td>{barbero.nombre} {barbero.apellido}</td>
                        <td>{barbero.servicios_realizados}</td>
                        <td className="money">{formatMoney(barbero.ingresos)}</td>
                        <td className="money">{formatMoney(barbero.utilidad)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="incomes-section">
            <h3>Detalle de ingresos</h3>

            {detalle.length === 0 ? (
              <div className="incomes-empty">
                No hay ingresos en este período. Los ingresos se registran
                cuando el barbero marca una cita como <b>Completada</b>.
              </div>
            ) : (
              <div className="incomes-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Cliente</th>
                      <th>Servicio</th>
                      {isAdmin && <th>Barbero</th>}
                      <th>Precio</th>
                      {!isAdmin && <th>Tu utilidad</th>}
                    </tr>
                  </thead>

                  <tbody>
                    {detalle.map((row) => (
                      <tr key={row.id_cita}>
                        <td>{formatDate(row.fecha)}</td>
                        <td>{row.cliente_nombre} {row.cliente_apellido}</td>
                        <td>
                          {row.servicio_nombre}
                          {row.es_promocion && (
                            <span className="promo-badge">Promo</span>
                          )}
                        </td>
                        {isAdmin && (
                          <td>{row.barbero_nombre} {row.barbero_apellido}</td>
                        )}
                        <td className="money">{formatMoney(row.precio)}</td>
                        {!isAdmin && (
                          <td className="money">{formatMoney(row.utilidad)}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>

                  <tfoot>
                    <tr>
                      <td colSpan={isAdmin ? 4 : 3}>Total</td>
                      <td className="money">{formatMoney(totals.total)}</td>
                      {!isAdmin && (
                        <td className="money">
                          {formatMoney(
                            detalle.reduce((sum, r) => sum + r.utilidad, 0)
                          )}
                        </td>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default IncomesView;

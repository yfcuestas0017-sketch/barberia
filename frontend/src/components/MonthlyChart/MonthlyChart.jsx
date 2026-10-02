import { useEffect, useMemo, useRef, useState } from "react";

import "./MonthlyChart.css";

const HEIGHT = 260;
const PAD = { top: 24, right: 24, bottom: 34, left: 56 };

const MONTHS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const formatMonth = (ym) => {
  const [year, month] = ym.split("-");
  return `${MONTHS[Number(month) - 1]} ${year.slice(2)}`;
};

const formatCompact = (value) => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (abs >= 1_000) return `${Math.round(value / 1_000)}K`;
  return `${Math.round(value)}`;
};

const formatMoney = (value) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

// Curva suave que no "rebota" por encima/debajo de los datos (monotone cubic)
const smoothPath = (points) => {
  const n = points.length;
  if (n < 2) return "";

  const dx = [];
  const slope = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1].x - points[i].x);
    slope.push((points[i + 1].y - points[i].y) / dx[i]);
  }

  const tangent = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    tangent.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  }
  tangent.push(slope[n - 2]);

  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const h = Math.hypot(a, b);
    if (h > 3) {
      const t = 3 / h;
      tangent[i] = t * a * slope[i];
      tangent[i + 1] = t * b * slope[i];
    }
  }

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const c1x = points[i].x + dx[i] / 3;
    const c1y = points[i].y + (tangent[i] * dx[i]) / 3;
    const c2x = points[i + 1].x - dx[i] / 3;
    const c2y = points[i + 1].y - (tangent[i + 1] * dx[i]) / 3;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${points[i + 1].x} ${points[i + 1].y}`;
  }
  return d;
};

const niceMax = (value) => {
  if (value <= 0) return 10_000;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return step * magnitude;
};

/**
 * Gráfica de área suave mes a mes.
 * data: [{ mes: "2026-01", <valueKey>: number, ...extras }]
 * tooltipRows: [{ label, key, tone? }] filas extra que se muestran al pasar el mouse
 */
function MonthlyChart({
  title = "Ganancias mensuales",
  data = [],
  valueKey = "utilidad",
  tooltipRows = [],
}) {
  const wrapperRef = useRef(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState(null);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(280, Math.floor(entry.contentRect.width)));
    });
    observer.observe(el);
    setWidth(Math.max(280, Math.floor(el.clientWidth)));

    return () => observer.disconnect();
  }, []);

  const chart = useMemo(() => {
    const values = data.map((d) => Number(d[valueKey] || 0));
    const dataMax = Math.max(0, ...values);
    const dataMin = Math.min(0, ...values);

    const max = niceMax(dataMax);
    const min = dataMin < 0 ? -niceMax(Math.abs(dataMin)) : 0;

    const innerW = width - PAD.left - PAD.right;
    const innerH = HEIGHT - PAD.top - PAD.bottom;

    const x = (i) =>
      PAD.left + (data.length > 1 ? (i / (data.length - 1)) * innerW : innerW / 2);
    const y = (v) => PAD.top + innerH - ((v - min) / (max - min)) * innerH;

    const points = values.map((v, i) => ({ x: x(i), y: y(v), v }));
    const line = smoothPath(points);
    const baseline = y(Math.max(min, 0));
    const area = points.length
      ? `${line} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`
      : "";

    const ticks = [0, 1, 2, 3].map((i) => min + ((max - min) * i) / 3);

    return { points, line, area, ticks, y, baseline, innerH };
  }, [data, valueKey, width]);

  const hasData = data.some((d) => Number(d[valueKey] || 0) !== 0);

  const handleMove = (clientX, element) => {
    if (!chart.points.length) return;
    const rect = element.getBoundingClientRect();
    const px = clientX - rect.left;

    let nearest = 0;
    let best = Infinity;
    chart.points.forEach((p, i) => {
      const dist = Math.abs(p.x - px);
      if (dist < best) {
        best = dist;
        nearest = i;
      }
    });
    setActive(nearest);
  };

  const activePoint = active !== null ? chart.points[active] : null;
  const activeData = active !== null ? data[active] : null;

  const tooltipLeft = activePoint
    ? Math.min(Math.max(activePoint.x, 90), width - 90)
    : 0;

  return (
    <div className="mchart">
      <div className="mchart-header">
        <span className="mchart-title">{title}</span>
        <span className="mchart-hint">Últimos 12 meses</span>
      </div>

      <div className="mchart-body" ref={wrapperRef}>
        <svg
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          onMouseMove={(e) => handleMove(e.clientX, e.currentTarget)}
          onMouseLeave={() => setActive(null)}
          onTouchStart={(e) => handleMove(e.touches[0].clientX, e.currentTarget)}
          onTouchMove={(e) => handleMove(e.touches[0].clientX, e.currentTarget)}
          role="img"
          aria-label={title}
        >
          <defs>
            <linearGradient id="mchart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.85" />
              <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#4c1d95" stopOpacity="0.04" />
            </linearGradient>
            <linearGradient id="mchart-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>

          {/* Líneas horizontales */}
          {chart.ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={chart.y(t)}
                y2={chart.y(t)}
                className="mchart-grid"
              />
              <text x={PAD.left - 10} y={chart.y(t) + 4} className="mchart-axis" textAnchor="end">
                {formatCompact(t)}
              </text>
            </g>
          ))}

          {/* Líneas verticales punteadas por mes */}
          {chart.points.map((p, i) => (
            <line
              key={data[i].mes}
              x1={p.x}
              x2={p.x}
              y1={PAD.top}
              y2={HEIGHT - PAD.bottom}
              className={`mchart-vline ${active === i ? "is-active" : ""}`}
            />
          ))}

          {/* Área + línea */}
          {hasData && <path d={chart.area} fill="url(#mchart-fill)" />}
          {hasData && (
            <path d={chart.line} fill="none" stroke="url(#mchart-stroke)" strokeWidth="2" />
          )}

          {/* Etiquetas de meses */}
          {data.map((d, i) => (
            <text
              key={d.mes}
              x={chart.points[i].x}
              y={HEIGHT - 10}
              className="mchart-axis"
              textAnchor="middle"
              style={{ display: width < 520 && i % 2 === 1 ? "none" : undefined }}
            >
              {formatMonth(d.mes)}
            </text>
          ))}

          {/* Punto activo */}
          {activePoint && (
            <circle cx={activePoint.x} cy={activePoint.y} r="5" className="mchart-dot" />
          )}
        </svg>

        {!hasData && (
          <div className="mchart-empty">Aún no hay ganancias registradas</div>
        )}

        {activePoint && activeData && (
          <div
            className="mchart-tooltip"
            style={{ left: tooltipLeft, top: Math.max(activePoint.y - 12, 8) }}
          >
            <strong>{formatMonth(activeData.mes)}</strong>
            <span className="mchart-tooltip-main">{formatMoney(activeData[valueKey])}</span>
            {tooltipRows.map(({ label, key }) => (
              <span className="mchart-tooltip-row" key={key}>
                {label}: {formatMoney(activeData[key])}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MonthlyChart;

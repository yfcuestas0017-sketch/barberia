import { PRESETS, getPeriod } from "./period";

import "./PeriodFilter.css";

function PeriodFilter({ value, onChange }) {
  const selectPreset = (key) => {
    if (key === "personalizado") {
      onChange({ ...value, preset: "personalizado" });
      return;
    }

    onChange(getPeriod(key));
  };

  const changeDate = (field, date) => {
    onChange({ ...value, preset: "personalizado", [field]: date });
  };

  return (
    <div className="period-filter">
      <div className="period-chips">
        {PRESETS.map(({ key, label }) => (
          <button
            type="button"
            key={key}
            className={`period-chip ${value.preset === key ? "active" : ""}`}
            onClick={() => selectPreset(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {value.preset === "personalizado" && (
        <div className="period-dates">
          <label>
            Desde
            <input
              type="date"
              value={value.fecha_inicio}
              max={value.fecha_fin || undefined}
              onChange={(e) => changeDate("fecha_inicio", e.target.value)}
            />
          </label>

          <label>
            Hasta
            <input
              type="date"
              value={value.fecha_fin}
              min={value.fecha_inicio || undefined}
              onChange={(e) => changeDate("fecha_fin", e.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  );
}

export default PeriodFilter;

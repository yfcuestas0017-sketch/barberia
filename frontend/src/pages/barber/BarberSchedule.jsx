import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

import "./BarberSchedule.css";

/* ---------------- Constantes y helpers ---------------- */

const PX_PER_MIN = 1.4; // 84px por hora
const PRESETS = [15, 20, 30, 40, 45, 60];

const pad = (n) => String(n).padStart(2, "0");

const toMin = (t) => {
  const [h, m] = String(t).slice(0, 5).split(":").map(Number);
  return h * 60 + m;
};

const toTime = (min) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;

const localISO = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return localISO(d);
};

const dayOnly = (v) => String(v).slice(0, 10);

const longDate = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });

const STATUS = {
  PENDIENTE: { label: "Pendiente", cls: "is-pending" },
  CONFIRMADA: { label: "Confirmada", cls: "is-confirmed" },
  COMPLETADA: { label: "Completada", cls: "is-done" }
};

const buildSlots = (start, end, step) => {
  const slots = [];
  if (!step || step <= 0) return slots;
  for (let c = start; c + step <= end; c += step) {
    slots.push({ start: c, end: c + step });
  }
  return slots;
};

/* ---------------- Componente ---------------- */

function BarberSchedule() {
  const today = localISO(new Date());

  const [schedules, setSchedules] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null); // detalle de cita
  const [now, setNow] = useState(new Date());

  const [fecha, setFecha] = useState(today);
  const [form, setForm] = useState({
    hora_inicio: "09:00",
    hora_fin: "18:00",
    duracion_corte: 30,
    descanso: false,
    descanso_inicio: "12:00",
    descanso_fin: "14:00"
  });

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const loadAll = async () => {
    try {
      setLoading(true);

      const [sch, apt] = await Promise.all([
        api.get("/schedules/me"),
        api.get("/appointments/barber/my")
      ]);

      setSchedules(sch.data);
      setAppointments(apt.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "No se pudo cargar el calendario."
      );
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Datos del día seleccionado ---------- */

  const dayBlocks = useMemo(
    () =>
      schedules
        .filter((s) => dayOnly(s.fecha) === fecha)
        .sort((a, b) =>
          String(a.hora_inicio).localeCompare(String(b.hora_inicio))
        ),
    [schedules, fecha]
  );

  const dayAppointments = useMemo(
    () =>
      appointments.filter(
        (a) =>
          dayOnly(a.fecha) === fecha &&
          a.estado !== "CANCELADA"
      ),
    [appointments, fecha]
  );

  /* ---------- Vista previa del formulario ---------- */

  const preview = useMemo(() => {
    const {
      hora_inicio,
      hora_fin,
      duracion_corte,
      descanso,
      descanso_inicio,
      descanso_fin
    } = form;
    const dur = Number(duracion_corte);

    if (!hora_inicio || !hora_fin || !dur) return null;

    const start = toMin(hora_inicio);
    const end = toMin(hora_fin);

    if (start >= end || dur < 5 || dur > end - start) return null;

    // Si hay almuerzo, la jornada se parte en dos bloques.
    let segments = [{ start, end }];
    let breakRange = null;
    let breakError = "";

    if (descanso) {
      if (!descanso_inicio || !descanso_fin) {
        breakError = "Define cuándo empieza y termina tu almuerzo.";
      } else {
        const bs = toMin(descanso_inicio);
        const be = toMin(descanso_fin);

        if (bs >= be) {
          breakError =
            "El almuerzo debe terminar después de empezar.";
        } else if (bs <= start || be >= end) {
          breakError =
            "El almuerzo debe quedar dentro de tu jornada.";
        } else if (bs - start < dur || end - be < dur) {
          breakError =
            "Antes y después del almuerzo debe caber al menos un corte.";
        } else {
          segments = [
            { start, end: bs },
            { start: be, end }
          ];
          breakRange = { start: bs, end: be };
        }
      }
    }

    const slots = segments.flatMap((seg) =>
      buildSlots(seg.start, seg.end, dur)
    );

    const leftover = segments.reduce(
      (total, seg) =>
        total +
        (seg.end - seg.start) -
        buildSlots(seg.start, seg.end, dur).length * dur,
      0
    );

    const overlaps = segments.some((seg) =>
      dayBlocks.some(
        (b) =>
          toMin(b.hora_inicio) < seg.end &&
          toMin(b.hora_fin) > seg.start
      )
    );

    return {
      start,
      end,
      dur,
      segments,
      breakRange,
      breakError,
      slots,
      leftover,
      overlaps
    };
  }, [form, dayBlocks]);

  // Huecos entre bloques guardados del mismo día = descansos
  const dayBreaks = useMemo(() => {
    const out = [];
    for (let i = 1; i < dayBlocks.length; i++) {
      const prevEnd = toMin(dayBlocks[i - 1].hora_fin);
      const curStart = toMin(dayBlocks[i].hora_inicio);
      if (curStart > prevEnd) out.push({ start: prevEnd, end: curStart });
    }
    return out;
  }, [dayBlocks]);

  /* ---------- Rango visible de horas ---------- */

  const { startHour, endHour } = useMemo(() => {
    const mins = [];

    dayBlocks.forEach((b) => {
      mins.push(toMin(b.hora_inicio), toMin(b.hora_fin));
    });
    dayAppointments.forEach((a) => {
      mins.push(toMin(a.hora_inicio), toMin(a.hora_fin));
    });
    if (preview) mins.push(preview.start, preview.end);

    const lo = mins.length ? Math.min(...mins) : 8 * 60;
    const hi = mins.length ? Math.max(...mins) : 20 * 60;

    return {
      startHour: Math.min(8, Math.floor(lo / 60)),
      endHour: Math.max(20, Math.ceil(hi / 60))
    };
  }, [dayBlocks, dayAppointments, preview]);

  const gridStart = startHour * 60;
  const gridHeight = (endHour - startHour) * 60 * PX_PER_MIN;
  const yOf = (min) => (min - gridStart) * PX_PER_MIN;

  const hours = Array.from(
    { length: endHour - startHour + 1 },
    (_, i) => startHour + i
  );

  /* ---------- Resumen y tira semanal ---------- */

  const availableCount = useMemo(() => {
    let total = 0;

    dayBlocks.forEach((b) => {
      const slots = buildSlots(
        toMin(b.hora_inicio),
        toMin(b.hora_fin),
        b.duracion_corte
      );

      slots.forEach((s) => {
        const busy = dayAppointments.some(
          (a) =>
            toMin(a.hora_inicio) < s.end &&
            toMin(a.hora_fin) > s.start
        );
        if (!busy) total += 1;
      });
    });

    return total;
  }, [dayBlocks, dayAppointments]);

  const weekDays = useMemo(() => {
    const d = new Date(`${fecha}T00:00:00`);
    const mondayOffset = (d.getDay() + 6) % 7;
    const monday = addDays(fecha, -mondayOffset);

    return Array.from({ length: 7 }, (_, i) => {
      const iso = addDays(monday, i);
      const date = new Date(`${iso}T00:00:00`);

      return {
        iso,
        weekday: date
          .toLocaleDateString("es-CO", { weekday: "short" })
          .replace(".", ""),
        num: date.getDate(),
        hasSchedule: schedules.some((s) => dayOnly(s.fecha) === iso),
        citas: appointments.filter(
          (a) =>
            dayOnly(a.fecha) === iso && a.estado !== "CANCELADA"
        ).length
      };
    });
  }, [fecha, schedules, appointments]);

  /* ---------- Acciones ---------- */

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fecha || !form.hora_inicio || !form.hora_fin) {
      setError("Completa fecha, hora de ingreso y hora de salida.");
      return;
    }

    if (form.hora_inicio >= form.hora_fin) {
      setError("La hora de salida debe ser posterior a la de ingreso.");
      return;
    }

    if (!preview) {
      setError(
        "Revisa los minutos por corte: deben ser entre 5 y la duración total del horario."
      );
      return;
    }

    if (preview.breakError) {
      setError(preview.breakError);
      return;
    }

    if (preview.overlaps) {
      setError("Este horario se cruza con otro ya configurado ese día.");
      return;
    }

    const createdIds = [];

    try {
      setSaving(true);
      setError("");

      // Un bloque por tramo (con almuerzo son dos).
      for (const seg of preview.segments) {
        const res = await api.post("/schedules", {
          fecha,
          hora_inicio: toTime(seg.start),
          hora_fin: toTime(seg.end),
          duracion_corte: preview.dur
        });

        if (res.data?.horario?.id_horario) {
          createdIds.push(res.data.horario.id_horario);
        }
      }

      await loadAll();
    } catch (err) {
      console.error(err);

      // Si falló el segundo tramo, deshacemos el primero.
      await Promise.all(
        createdIds.map((id) =>
          api.delete(`/schedules/${id}`).catch(() => null)
        )
      );

      setError(
        err.response?.data?.message ||
          "No se pudo crear el horario."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "¿Seguro que deseas eliminar este bloque de horario?"
      )
    )
      return;

    try {
      await api.delete(`/schedules/${id}`);
      await loadAll();
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "No se pudo eliminar el horario."
      );
    }
  };

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const showNow =
    fecha === today && nowMin >= gridStart && nowMin <= endHour * 60;

  const clientName = (a) =>
    `${a.cliente_nombre || ""} ${a.cliente_apellido || ""}`.trim();

  /* ---------------- Render ---------------- */

  return (
    <div className="barber-schedule">
      <div className="barber-page-title">
        <div>
          <h2>Mi horario</h2>
          <p>
            Elige la fecha, tu hora de ingreso y salida, y cuántos
            minutos dura cada corte.
          </p>
        </div>

        <button className="barber-refresh" onClick={loadAll}>
          ↻ Actualizar
        </button>
      </div>

      {error && (
        <div className="barber-error schedule-error">{error}</div>
      )}

      <div className="schedule-layout">
        {/* ---------- Panel de configuración ---------- */}
        <section className="schedule-form-card">
          <div className="schedule-card-header">
            <h3>Organizar mi día</h3>
            <p>Se dividirá en turnos del mismo tamaño.</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="schedule-field">
              <label>Fecha</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => e.target.value && setFecha(e.target.value)}
              />
            </div>

            <div className="schedule-time-row">
              <div className="schedule-field">
                <label>Hora de ingreso</label>
                <input
                  type="time"
                  name="hora_inicio"
                  value={form.hora_inicio}
                  onChange={handleFormChange}
                />
              </div>

              <div className="schedule-field">
                <label>Hora de salida</label>
                <input
                  type="time"
                  name="hora_fin"
                  value={form.hora_fin}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            <div className="schedule-field">
              <label>Minutos por corte</label>

              <div className="duration-chips">
                {PRESETS.map((m) => (
                  <button
                    type="button"
                    key={m}
                    className={
                      "duration-chip" +
                      (Number(form.duracion_corte) === m ? " active" : "")
                    }
                    onClick={() =>
                      setForm({ ...form, duracion_corte: m })
                    }
                  >
                    {m} min
                  </button>
                ))}
              </div>

              <div className="duration-custom">
                <span>Otro:</span>
                <input
                  type="number"
                  min="5"
                  max="240"
                  step="5"
                  name="duracion_corte"
                  value={form.duracion_corte}
                  onChange={handleFormChange}
                />
                <span>min</span>
              </div>
            </div>

            <div className="schedule-field">
              <label className="break-toggle">
                <input
                  type="checkbox"
                  checked={form.descanso}
                  onChange={(e) =>
                    setForm({ ...form, descanso: e.target.checked })
                  }
                />
                <span>Tengo hora de almuerzo / descanso</span>
              </label>

              {form.descanso && (
                <div className="schedule-time-row break-times">
                  <div className="schedule-field">
                    <label>Empieza</label>
                    <input
                      type="time"
                      name="descanso_inicio"
                      value={form.descanso_inicio}
                      onChange={handleFormChange}
                    />
                  </div>

                  <div className="schedule-field">
                    <label>Termina</label>
                    <input
                      type="time"
                      name="descanso_fin"
                      value={form.descanso_fin}
                      onChange={handleFormChange}
                    />
                  </div>
                </div>
              )}
            </div>

            <div
              className={
                "schedule-summary" +
                (!preview || preview.overlaps || preview.breakError
                  ? " warn"
                  : "")
              }
            >
              {!preview ? (
                <span>
                  Define una hora de ingreso, de salida y minutos por
                  corte válidos para ver los turnos.
                </span>
              ) : preview.breakError ? (
                <span>{preview.breakError}</span>
              ) : preview.overlaps ? (
                <span>
                  Se cruza con otro horario de este día. Cambia las
                  horas.
                </span>
              ) : (
                <>
                  <strong>
                    {preview.slots.length} cortes de {preview.dur} min
                  </strong>
                  <span>
                    {toTime(preview.start)} → {toTime(preview.end)}
                    {preview.breakRange &&
                      ` · almuerzo ${toTime(preview.breakRange.start)}–${toTime(preview.breakRange.end)}`}
                    {preview.leftover > 0 &&
                      ` · sobran ${preview.leftover} min al final`}
                  </span>
                </>
              )}
            </div>

            <button
              type="submit"
              className="add-schedule-button"
              disabled={saving}
            >
              {saving ? "Guardando..." : "+ Guardar horario del día"}
            </button>
          </form>
        </section>

        {/* ---------- Calendario diario ---------- */}
        <section className="day-card">
          <div className="day-toolbar">
            <div className="day-nav">
              <button
                type="button"
                onClick={() => setFecha(addDays(fecha, -1))}
                aria-label="Día anterior"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => setFecha(addDays(fecha, 1))}
                aria-label="Día siguiente"
              >
                ›
              </button>
              <button
                type="button"
                className="today-btn"
                onClick={() => setFecha(today)}
              >
                Hoy
              </button>
            </div>

            <div className="day-title">
              <h3>{longDate(fecha)}</h3>
              <p>
                {availableCount} cortes libres · {dayAppointments.length}{" "}
                cita{dayAppointments.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          <div className="week-strip">
            {weekDays.map((d) => (
              <button
                type="button"
                key={d.iso}
                className={
                  "week-day" +
                  (d.iso === fecha ? " active" : "") +
                  (d.iso === today ? " today" : "")
                }
                onClick={() => setFecha(d.iso)}
              >
                <span className="wd-name">{d.weekday}</span>
                <span className="wd-num">{d.num}</span>
                <span className="wd-dots">
                  {d.hasSchedule && <i className="dot dot-gold" />}
                  {d.citas > 0 && <i className="dot dot-green" />}
                </span>
              </button>
            ))}
          </div>

          {loading ? (
            <div className="schedule-empty">Cargando calendario...</div>
          ) : (
            <div className="day-scroll">
              <div className="day-grid" style={{ height: gridHeight }}>
                {/* Etiquetas y líneas de hora */}
                {hours.map((h) => (
                  <div
                    key={h}
                    className="hour-row"
                    style={{ top: yOf(h * 60) }}
                  >
                    <span className="hour-label">
                      {h === endHour ? "" : `${pad(h)}:00`}
                    </span>
                    <span className="hour-line" />
                  </div>
                ))}

                <div className="day-lane">
                  {/* Descansos (huecos entre bloques) */}
                  {dayBreaks.map((br) => (
                    <div
                      key={`br-${br.start}`}
                      className="break-band"
                      style={{
                        top: yOf(br.start),
                        height: (br.end - br.start) * PX_PER_MIN
                      }}
                    >
                      <span>
                        Descanso · {toTime(br.start)} – {toTime(br.end)}
                      </span>
                    </div>
                  ))}

                  {/* Bloques guardados */}
                  {dayBlocks.map((b) => {
                    const start = toMin(b.hora_inicio);
                    const end = toMin(b.hora_fin);
                    const slots = buildSlots(
                      start,
                      end,
                      b.duracion_corte
                    );

                    return (
                      <div key={b.id_horario}>
                        <div
                          className="block-band"
                          style={{
                            top: yOf(start),
                            height: (end - start) * PX_PER_MIN
                          }}
                        >
                          <span className="block-tag">
                            {toTime(start)} – {toTime(end)}
                            {b.duracion_corte
                              ? ` · ${b.duracion_corte} min/corte`
                              : ""}
                          </span>
                          <button
                            type="button"
                            className="block-delete"
                            title="Eliminar este horario"
                            onClick={() => handleDelete(b.id_horario)}
                          >
                            ✕
                          </button>
                        </div>

                        {slots.length === 0 ? (
                          <div
                            className="slot-card is-free"
                            style={{
                              top: yOf(start) + 20,
                              height:
                                (end - start) * PX_PER_MIN - 24
                            }}
                          >
                            <strong>Disponible</strong>
                            <span>
                              {toTime(start)} – {toTime(end)}
                            </span>
                          </div>
                        ) : (
                          slots.map((s) => {
                            const busy = dayAppointments.some(
                              (a) =>
                                toMin(a.hora_inicio) < s.end &&
                                toMin(a.hora_fin) > s.start
                            );
                            if (busy) return null;

                            const h = (s.end - s.start) * PX_PER_MIN;

                            return (
                              <div
                                key={s.start}
                                className={
                                  "slot-card is-free" +
                                  (h < 34 ? " compact" : "")
                                }
                                style={{
                                  top: yOf(s.start) + 1,
                                  height: h - 3
                                }}
                              >
                                <strong>
                                  {toTime(s.start)} – {toTime(s.end)}
                                </strong>
                                {h >= 34 && <span>Libre</span>}
                              </div>
                            );
                          })
                        )}
                      </div>
                    );
                  })}

                  {/* Vista previa antes de guardar */}
                  {preview?.breakRange && !preview.overlaps && (
                    <div
                      className="break-band is-preview"
                      style={{
                        top: yOf(preview.breakRange.start),
                        height:
                          (preview.breakRange.end -
                            preview.breakRange.start) *
                          PX_PER_MIN
                      }}
                    >
                      <span>
                        Almuerzo · {toTime(preview.breakRange.start)} –{" "}
                        {toTime(preview.breakRange.end)}
                      </span>
                    </div>
                  )}

                  {preview &&
                    !preview.overlaps &&
                    !preview.breakError &&
                    preview.slots.map((s) => {
                      const h = (s.end - s.start) * PX_PER_MIN;

                      return (
                        <div
                          key={`p-${s.start}`}
                          className={
                            "slot-card is-preview" +
                            (h < 34 ? " compact" : "")
                          }
                          style={{
                            top: yOf(s.start) + 1,
                            height: h - 3
                          }}
                        >
                          <strong>
                            {toTime(s.start)} – {toTime(s.end)}
                          </strong>
                          {h >= 34 && <span>Vista previa</span>}
                        </div>
                      );
                    })}

                  {/* Citas reservadas */}
                  {dayAppointments.map((a) => {
                    const start = toMin(a.hora_inicio);
                    const end = toMin(a.hora_fin);
                    const h = (end - start) * PX_PER_MIN;
                    const st = STATUS[a.estado] || STATUS.PENDIENTE;

                    return (
                      <button
                        type="button"
                        key={a.id_cita}
                        className={`appt-card ${st.cls}` + (h < 44 ? " compact" : "")}
                        style={{
                          top: yOf(start) + 1,
                          height: h - 3
                        }}
                        onClick={() => setSelected(a)}
                      >
                        <strong>{clientName(a) || "Cliente"}</strong>
                        <span>{a.servicio_nombre}</span>
                        {h >= 58 && (
                          <em>
                            {toTime(start)} – {toTime(end)}
                          </em>
                        )}
                      </button>
                    );
                  })}

                  {showNow && (
                    <div
                      className="now-line"
                      style={{ top: yOf(nowMin) }}
                    >
                      <i />
                    </div>
                  )}
                </div>
              </div>

              {dayBlocks.length === 0 && !preview && (
                <div className="day-hint">
                  Aún no tienes horario este día. Configúralo a la
                  izquierda y verás tus turnos aquí.
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ---------- Detalle de cita ---------- */}
      {selected && (
        <div
          className="appt-backdrop"
          onClick={() => setSelected(null)}
        >
          <div
            className="appt-popover"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="popover-close"
              onClick={() => setSelected(null)}
            >
              ✕
            </button>

            <h4>{clientName(selected) || "Cliente"}</h4>
            <p className="popover-service">
              {selected.servicio_nombre}
              {selected.es_promocion ? " · Promoción" : ""}
            </p>

            <ul>
              <li>
                <span>🗓</span>
                {longDate(dayOnly(selected.fecha))}
              </li>
              <li>
                <span>🕒</span>
                {toTime(toMin(selected.hora_inicio))} –{" "}
                {toTime(toMin(selected.hora_fin))}
              </li>
              {selected.cliente_telefono && (
                <li>
                  <span>📞</span>
                  {selected.cliente_telefono}
                  <a
                    href={`https://wa.me/${String(
                      selected.cliente_telefono
                    ).replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    WhatsApp
                  </a>
                </li>
              )}
            </ul>

            <span
              className={`popover-status ${
                (STATUS[selected.estado] || STATUS.PENDIENTE).cls
              }`}
            >
              {(STATUS[selected.estado] || STATUS.PENDIENTE).label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default BarberSchedule;

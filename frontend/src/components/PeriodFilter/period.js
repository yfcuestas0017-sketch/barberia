const fmt = (date) => date.toLocaleDateString("en-CA"); // YYYY-MM-DD en hora local

export const PRESETS = [
  { key: "hoy", label: "Hoy" },
  { key: "semana", label: "7 días" },
  { key: "mes", label: "Este mes" },
  { key: "anio", label: "Este año" },
  { key: "personalizado", label: "Personalizado" },
];

// Devuelve el período { preset, fecha_inicio, fecha_fin } para un atajo
export const getPeriod = (preset) => {
  const now = new Date();
  const today = fmt(now);

  if (preset === "hoy") {
    return { preset, fecha_inicio: today, fecha_fin: today };
  }

  if (preset === "semana") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    return { preset, fecha_inicio: fmt(start), fecha_fin: today };
  }

  if (preset === "anio") {
    return {
      preset,
      fecha_inicio: fmt(new Date(now.getFullYear(), 0, 1)),
      fecha_fin: fmt(new Date(now.getFullYear(), 11, 31)),
    };
  }

  // "mes" (por defecto): del día 1 al último día del mes
  return {
    preset: "mes",
    fecha_inicio: fmt(new Date(now.getFullYear(), now.getMonth(), 1)),
    fecha_fin: fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
};

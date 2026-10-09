import { useEffect } from "react";

// En celular las tablas se muestran como tarjetas. Para que cada dato
// conserve su título, copiamos el texto de cada <th> en un atributo
// data-label de las celdas de su columna (el CSS lo muestra).
const labelTable = (table) => {
  const heads = [...table.querySelectorAll("thead th")].map((th) =>
    th.textContent.trim()
  );

  if (heads.length === 0) return;

  table.querySelectorAll("tbody tr").forEach((row) => {
    [...row.children].forEach((cell, i) => {
      if (cell.colSpan > 1) return;
      if (heads[i] !== undefined && cell.dataset.label !== heads[i]) {
        cell.dataset.label = heads[i];
      }
    });
  });

  table.classList.add("rt-cards");
};

const labelAll = () => document.querySelectorAll("table").forEach(labelTable);

function ResponsiveTables() {
  useEffect(() => {
    let frame = 0;

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(labelAll);
    };

    schedule();

    const observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return null;
}

export default ResponsiveTables;

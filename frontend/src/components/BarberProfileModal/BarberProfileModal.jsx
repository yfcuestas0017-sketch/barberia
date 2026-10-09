import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";

import "./BarberProfileModal.css";

const Stars = ({ value, size = 16 }) => (
  <span className="bpm-stars" style={{ fontSize: size }} aria-label={`${value} de 5`}>
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} className={n <= Math.round(value) ? "on" : ""}>★</span>
    ))}
  </span>
);

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

function BarberProfileModal({ barber, onClose }) {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    api
      .get(`/reviews/barber/${barber.id_barbero}`)
      .then((res) => !cancelled && setReviews(res.data))
      .catch(() => !cancelled && setError("No se pudieron cargar las reseñas."))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [barber.id_barbero]);

  // Cerrar con Escape y bloquear el scroll de fondo
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const total = reviews.length;
  const average = total
    ? reviews.reduce((sum, r) => sum + Number(r.estrellas), 0) / total
    : 0;

  const distribution = [5, 4, 3, 2, 1].map((n) => ({
    stars: n,
    count: reviews.filter((r) => Number(r.estrellas) === n).length
  }));

  const fullName = `${barber.nombre} ${barber.apellido || ""}`.trim();

  return (
    <div className="bpm-overlay" onClick={onClose}>
      <div
        className="bpm-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`Perfil de ${fullName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="bpm-close" onClick={onClose} aria-label="Cerrar">
          ×
        </button>

        <div className="bpm-head">
          <div className="bpm-photo">
            {barber.foto ? (
              <img src={barber.foto} alt={fullName} />
            ) : (
              <span>{barber.nombre?.charAt(0)?.toUpperCase()}</span>
            )}
          </div>

          <div className="bpm-info">
            <h2>{fullName}</h2>
            <span className="bpm-specialty">
              {barber.especialidad || "Barbero profesional"}
            </span>

            <div className="bpm-rating">
              <Stars value={average} size={20} />
              <strong>{total ? average.toFixed(1) : "—"}</strong>
              <span>
                {total === 1 ? "1 reseña" : `${total} reseñas`}
              </span>
            </div>
          </div>
        </div>

        {barber.descripcion && <p className="bpm-desc">{barber.descripcion}</p>}

        {total > 0 && (
          <div className="bpm-distribution">
            {distribution.map((row) => (
              <div className="bpm-bar-row" key={row.stars}>
                <span>{row.stars} ★</span>
                <div className="bpm-bar">
                  <div style={{ width: `${(row.count / total) * 100}%` }} />
                </div>
                <span className="bpm-count">{row.count}</span>
              </div>
            ))}
          </div>
        )}

        <h3 className="bpm-subtitle">Lo que dicen los clientes</h3>

        {loading ? (
          <p className="bpm-empty">Cargando reseñas...</p>
        ) : error ? (
          <p className="bpm-empty">{error}</p>
        ) : total === 0 ? (
          <p className="bpm-empty">
            Este barbero aún no tiene reseñas. ¡Sé el primero en calificarlo!
          </p>
        ) : (
          <ul className="bpm-reviews">
            {reviews.map((r) => (
              <li key={r.id_resena}>
                <div className="bpm-review-top">
                  <strong>
                    {r.nombre} {r.apellido?.charAt(0) ? `${r.apellido.charAt(0)}.` : ""}
                  </strong>
                  <span>{formatDate(r.created_at)}</span>
                </div>
                <Stars value={Number(r.estrellas)} size={14} />
                {r.comentario && <p>{r.comentario}</p>}
              </li>
            ))}
          </ul>
        )}

        <button
          className="bpm-book"
          onClick={() => {
            onClose();
            navigate("/cliente/reservar");
          }}
        >
          Reservar una cita
        </button>
      </div>
    </div>
  );
}

export default BarberProfileModal;

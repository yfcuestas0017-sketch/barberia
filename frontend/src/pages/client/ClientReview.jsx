import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import api from "../../services/api";

import "./ClientReview.css";

function ClientReview() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [appointment, setAppointment] =
    useState(null);

  const [stars, setStars] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [comment, setComment] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadAppointment();
  }, [id]);

  const loadAppointment = async () => {
    try {
      setLoading(true);

      const response = await api.get(
        "/appointments/my"
      );

      const foundAppointment =
        response.data.find(
          (item) =>
            String(item.id_cita) === String(id)
        );

      if (!foundAppointment) {
        setError(
          "La cita no fue encontrada."
        );

        return;
      }

      if (
        foundAppointment.estado !==
        "COMPLETADA"
      ) {
        setError(
          "Solo puedes calificar servicios completados."
        );

        return;
      }

      setAppointment(foundAppointment);
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
          "No se pudo cargar la cita."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (stars < 1) {
      setError(
        "Selecciona una calificación de 1 a 5 estrellas."
      );

      return;
    }

    try {
      setSaving(true);

      setError("");
      setSuccess("");

      await api.post("/reviews", {
        id_cita: Number(id),
        estrellas: stars,
        comentario: comment.trim() || null
      });

      setSuccess(
        "¡Gracias! Tu reseña fue registrada correctamente."
      );

      setTimeout(() => {
        navigate("/cliente/citas");
      }, 1200);

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
          "No se pudo registrar la reseña."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="review-loading">
        Cargando información...
      </div>
    );
  }

  if (error && !appointment) {
    return (
      <div className="review-error-page">

        <div>
          <span>RESEÑA</span>

          <h1>
            No se puede realizar la reseña
          </h1>

          <p>
            {error}
          </p>

          <button
            onClick={() =>
              navigate("/cliente/citas")
            }
          >
            Volver a mis citas
          </button>

        </div>

      </div>
    );
  }

  return (
    <div className="client-review-page">

      <div className="client-review-header">

        <div>
          <span>RESEÑA DEL SERVICIO</span>

          <h1>
            ¿Cómo fue tu experiencia?
          </h1>

          <p>
            Tu opinión nos ayuda a mejorar nuestro
            servicio.
          </p>
        </div>

        <button
          className="review-back-button"
          onClick={() =>
            navigate("/cliente/citas")
          }
        >
          ← Volver
        </button>

      </div>

      {error && (
        <div className="review-alert error">
          {error}
        </div>
      )}

      {success && (
        <div className="review-alert success">
          {success}
        </div>
      )}

      <div className="review-layout">

        <div className="review-form-card">

          <div className="review-service-info">

            <span>
              SERVICIO
            </span>

            <h2>
              {appointment?.servicio_nombre}
            </h2>

            <p>
              Atendido por{" "}
              <strong>
                {appointment?.barbero_nombre}{" "}
                {appointment?.barbero_apellido}
              </strong>
            </p>

          </div>

          <form onSubmit={handleSubmit}>

            <div className="stars-section">

              <label>
                Tu calificación
              </label>

              <div className="stars">

                {[1, 2, 3, 4, 5].map(
                  (star) => (

                    <button
                      key={star}
                      type="button"
                      className={
                        star <=
                        (hoverStars || stars)
                          ? "star active"
                          : "star"
                      }
                      onMouseEnter={() =>
                        setHoverStars(star)
                      }
                      onMouseLeave={() =>
                        setHoverStars(0)
                      }
                      onClick={() =>
                        setStars(star)
                      }
                      aria-label={`${star} estrellas`}
                    >
                      ★
                    </button>

                  )
                )}

              </div>

              <span className="rating-text">

                {stars === 0
                  ? "Selecciona una calificación"
                  : `${stars} de 5 estrellas`}

              </span>

            </div>

            <div className="comment-section">

              <label>
                Comentario
              </label>

              <textarea
                value={comment}
                onChange={(event) =>
                  setComment(event.target.value)
                }
                placeholder="Cuéntanos cómo fue tu experiencia..."
                maxLength={500}
                rows={6}
              />

              <small>
                {comment.length}/500
              </small>

            </div>

            <button
              type="submit"
              className="submit-review-button"
              disabled={saving || stars === 0}
            >
              {saving
                ? "Enviando..."
                : "Publicar reseña"}
            </button>

          </form>

        </div>

        <aside className="review-summary">

          <span>
            TU SERVICIO
          </span>

          <h2>
            {appointment?.servicio_nombre}
          </h2>

          <div className="review-summary-item">

            <span>
              Barbero
            </span>

            <strong>
              {appointment?.barbero_nombre}{" "}
              {appointment?.barbero_apellido}
            </strong>

          </div>

          <div className="review-summary-item">

            <span>
              Fecha
            </span>

            <strong>
              {appointment?.fecha}
            </strong>

          </div>

          <div className="review-summary-item">

            <span>
              Horario
            </span>

            <strong>
              {String(
                appointment?.hora_inicio || ""
              ).slice(0, 5)}
              {" - "}
              {String(
                appointment?.hora_fin || ""
              ).slice(0, 5)}
            </strong>

          </div>

          <div className="review-stars-preview">

            {[1, 2, 3, 4, 5].map(
              (star) => (
                <span
                  key={star}
                  className={
                    star <= stars
                      ? "preview-star active"
                      : "preview-star"
                  }
                >
                  ★
                </span>
              )
            )}

          </div>

        </aside>

      </div>

    </div>
  );
}

export default ClientReview;
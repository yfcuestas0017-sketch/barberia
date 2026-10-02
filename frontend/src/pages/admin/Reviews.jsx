import { useEffect, useState } from "react";
import api from "../../services/api";

import "./Reviews.css";

function Reviews() {
  const [reviews, setReviews] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filterStars, setFilterStars] = useState("");

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
    try {
      setLoading(true);

      const response = await api.get("/reviews/admin");

      setReviews(response.data);
      setError("");

    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "No se pudieron cargar las reseñas."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString(
      "es-CO",
      {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }
    );
  };

  const renderStars = (stars) => {
    return (
      <div className="review-stars">

        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={
              star <= stars
                ? "star filled"
                : "star"
            }
          >
            ★
          </span>
        ))}

      </div>
    );
  };

  const filteredReviews = reviews.filter((review) => {
    if (!filterStars) return true;

    return String(review.estrellas) === filterStars;
  });

  const averageRating =
    reviews.length > 0
      ? (
          reviews.reduce(
            (sum, review) =>
              sum + Number(review.estrellas),
            0
          ) / reviews.length
        ).toFixed(1)
      : "0.0";

  const fiveStars = reviews.filter(
    (review) => Number(review.estrellas) === 5
  ).length;

  const oneTwoStars = reviews.filter(
    (review) => Number(review.estrellas) <= 2
  ).length;

  if (loading) {
    return (
      <div className="page-loading">
        Cargando reseñas...
      </div>
    );
  }

  return (
    <div className="reviews-page">

      <div className="page-title">

        <div>
          <h2>Reseñas</h2>

          <p>
            Consulta las opiniones y calificaciones
            de los clientes.
          </p>
        </div>

        <button
          className="refresh-button"
          onClick={loadReviews}
        >
          ↻ Actualizar
        </button>

      </div>

      {error && (
        <div className="page-error">

          <span>{error}</span>

          <button
            onClick={() => setError("")}
          >
            ×
          </button>

        </div>
      )}

      <div className="reviews-summary">

        <div className="review-summary-card">

          <span>Calificación promedio</span>

          <strong>
            {averageRating}
          </strong>

          <div className="summary-stars">
            ★★★★★
          </div>

        </div>

        <div className="review-summary-card">

          <span>Total reseñas</span>

          <strong>
            {reviews.length}
          </strong>

        </div>

        <div className="review-summary-card">

          <span>5 estrellas</span>

          <strong>
            {fiveStars}
          </strong>

        </div>

        <div className="review-summary-card">

          <span>1 - 2 estrellas</span>

          <strong>
            {oneTwoStars}
          </strong>

        </div>

      </div>

      <div className="reviews-filter">

        <div>

          <label>Filtrar por calificación</label>

          <select
            value={filterStars}
            onChange={(event) =>
              setFilterStars(event.target.value)
            }
          >
            <option value="">
              Todas las calificaciones
            </option>

            <option value="5">
              5 estrellas
            </option>

            <option value="4">
              4 estrellas
            </option>

            <option value="3">
              3 estrellas
            </option>

            <option value="2">
              2 estrellas
            </option>

            <option value="1">
              1 estrella
            </option>

          </select>

        </div>

      </div>

      <div className="reviews-list">

        {filteredReviews.length === 0 ? (

          <div className="empty-reviews">
            No hay reseñas para mostrar.
          </div>

        ) : (

          filteredReviews.map((review) => (

            <div
              className="review-card"
              key={review.id_resena}
            >

              <div className="review-header">

                <div className="review-user">

                  <div className="review-avatar">
                    {review.cliente_nombre
                      ?.charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>

                    <strong>
                      {review.cliente_nombre}{" "}
                      {review.cliente_apellido}
                    </strong>

                    <span>
                      {formatDate(review.created_at)}
                    </span>

                  </div>

                </div>

                <div>
                  {renderStars(review.estrellas)}
                </div>

              </div>

              <div className="review-info">

                <span>
                  Barbero:
                  <strong>
                    {" "}
                    {review.barbero_nombre}{" "}
                    {review.barbero_apellido}
                  </strong>
                </span>

                <span>
                  Servicio:
                  <strong>
                    {" "}
                    {review.servicio_nombre}
                  </strong>
                </span>

              </div>

              <div className="review-comment">

                {review.comentario ? (
                  <>
                    “{review.comentario}”
                  </>
                ) : (
                  <span>
                    El cliente no dejó un comentario.
                  </span>
                )}

              </div>

            </div>

          ))

        )}

      </div>

    </div>
  );
}

export default Reviews;
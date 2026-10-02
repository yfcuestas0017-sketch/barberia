import { useEffect, useState } from "react";
import api from "../../services/api";

import "./BarberReviews.css";

function BarberReviews() {
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

      const response = await api.get("/reviews/my");

      setReviews(response.data);
      setError("");
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "No se pudieron cargar tus reseñas."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  };

  const filteredReviews = reviews.filter((review) => {
    if (!filterStars) return true;

    return Number(review.estrellas) === Number(filterStars);
  });

  const average =
    reviews.length > 0
      ? (
          reviews.reduce(
            (sum, review) => sum + Number(review.estrellas),
            0
          ) / reviews.length
        ).toFixed(1)
      : "0.0";

  const fiveStars = reviews.filter(
    (review) => Number(review.estrellas) === 5
  ).length;

  const fourStars = reviews.filter(
    (review) => Number(review.estrellas) === 4
  ).length;

  const threeStars = reviews.filter(
    (review) => Number(review.estrellas) === 3
  ).length;

  const twoStars = reviews.filter(
    (review) => Number(review.estrellas) === 2
  ).length;

  const oneStar = reviews.filter(
    (review) => Number(review.estrellas) === 1
  ).length;

  const renderStars = (stars) => {
    return (
      <div className="barber-review-stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={
              star <= Number(stars)
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

  return (
    <div className="barber-reviews">

      <div className="barber-page-title">

        <div>
          <h2>Mis reseñas</h2>

          <p>
            Consulta las opiniones y calificaciones de tus clientes.
          </p>
        </div>

        <button
          className="barber-refresh"
          onClick={loadReviews}
        >
          ↻ Actualizar
        </button>

      </div>

      {error && (
        <div className="barber-error barber-review-error">
          {error}
        </div>
      )}

      <div className="reviews-summary">

        <div className="average-review-card">

          <span>Calificación promedio</span>

          <strong>{average}</strong>

          <div className="average-stars">
            {renderStars(Number(average))}
          </div>

          <small>
            {reviews.length}{" "}
            {reviews.length === 1 ? "reseña" : "reseñas"}
          </small>

        </div>

        <div className="rating-distribution">

          <div className="rating-row">
            <span>5 ★</span>
            <div className="rating-bar">
              <div
                style={{
                  width: reviews.length
                    ? `${(fiveStars / reviews.length) * 100}%`
                    : "0%"
                }}
              />
            </div>
            <strong>{fiveStars}</strong>
          </div>

          <div className="rating-row">
            <span>4 ★</span>
            <div className="rating-bar">
              <div
                style={{
                  width: reviews.length
                    ? `${(fourStars / reviews.length) * 100}%`
                    : "0%"
                }}
              />
            </div>
            <strong>{fourStars}</strong>
          </div>

          <div className="rating-row">
            <span>3 ★</span>
            <div className="rating-bar">
              <div
                style={{
                  width: reviews.length
                    ? `${(threeStars / reviews.length) * 100}%`
                    : "0%"
                }}
              />
            </div>
            <strong>{threeStars}</strong>
          </div>

          <div className="rating-row">
            <span>2 ★</span>
            <div className="rating-bar">
              <div
                style={{
                  width: reviews.length
                    ? `${(twoStars / reviews.length) * 100}%`
                    : "0%"
                }}
              />
            </div>
            <strong>{twoStars}</strong>
          </div>

          <div className="rating-row">
            <span>1 ★</span>
            <div className="rating-bar">
              <div
                style={{
                  width: reviews.length
                    ? `${(oneStar / reviews.length) * 100}%`
                    : "0%"
                }}
              />
            </div>
            <strong>{oneStar}</strong>
          </div>

        </div>

      </div>

      <div className="reviews-toolbar">

        <div>
          <strong>
            Opiniones de clientes
          </strong>

          <span>
            {filteredReviews.length} resultados
          </span>
        </div>

        <select
          value={filterStars}
          onChange={(e) =>
            setFilterStars(e.target.value)
          }
        >
          <option value="">Todas las calificaciones</option>
          <option value="5">5 estrellas</option>
          <option value="4">4 estrellas</option>
          <option value="3">3 estrellas</option>
          <option value="2">2 estrellas</option>
          <option value="1">1 estrella</option>
        </select>

      </div>

      {loading ? (

        <div className="barber-loading">
          Cargando reseñas...
        </div>

      ) : filteredReviews.length === 0 ? (

        <div className="reviews-empty">

          <div className="reviews-empty-icon">
            ★
          </div>

          <strong>
            No hay reseñas todavía
          </strong>

          <span>
            Las opiniones de tus clientes aparecerán aquí.
          </span>

        </div>

      ) : (

        <div className="reviews-list">

          {filteredReviews.map((review) => (

            <article
              className="barber-review-card"
              key={review.id_resena}
            >

              <div className="review-card-top">

                <div className="review-client">

                  <div className="review-client-avatar">
                    {review.cliente_nombre
                      ?.charAt(0)
                      ?.toUpperCase()}
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

                {renderStars(review.estrellas)}

              </div>

              <div className="review-service">
                Servicio:{" "}
                <strong>
                  {review.servicio_nombre ||
                    "Servicio"}
                </strong>
              </div>

              {review.comentario ? (

                <p className="review-comment">
                  “{review.comentario}”
                </p>

              ) : (

                <p className="review-no-comment">
                  El cliente no dejó un comentario.
                </p>

              )}

            </article>

          ))}

        </div>

      )}

    </div>
  );
}

export default BarberReviews;
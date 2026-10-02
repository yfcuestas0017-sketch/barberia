import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import api from "../../services/api";

import "./ClientHome.css";

function ClientHome() {
  const navigate = useNavigate();

  const [services, setServices] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [barbers, setBarbers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        servicesResponse,
        promotionsResponse,
        barbersResponse
      ] = await Promise.all([
        api.get("/services", { params: { solo_activos: true } }),
        api.get("/promotions/disponibles"),
        api.get("/barbers", { params: { solo_activos: true } })
      ]);

      setServices(servicesResponse.data);
      setPromotions(promotionsResponse.data);
      setBarbers(barbersResponse.data);

      setError("");
    } catch (error) {
      console.error(error);

      setError(
        "No se pudo cargar la información de la barbería."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0
    }).format(Number(value || 0));
  };

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(`${String(date).slice(0, 10)}T00:00:00`)
      .toLocaleDateString("es-CO", {
        day: "2-digit",
        month: "short"
      });
  };

  if (loading) {
    return (
      <div className="client-loading">
        Cargando barbería...
      </div>
    );
  }

  return (
    <div className="client-home">

      {error && (
        <div className="client-error">
          {error}
        </div>
      )}

      <section className="client-hero">

        <div className="client-hero-content">

          <span className="client-hero-label">
            BARBERÍA
          </span>

          <h1>
            Tu estilo comienza
            <br />
            con una buena elección.
          </h1>

          <p>
            Elige tu servicio, selecciona tu barbero
            y reserva tu cita de manera rápida.
          </p>

          <button
            className="client-hero-button"
            onClick={() => navigate("/cliente/reservar")}
          >
            Reservar una cita
          </button>

        </div>

      </section>

      {promotions.length > 0 && (

        <section className="client-section">

          <div className="client-section-title">

            <div>
              <span>OFERTAS</span>
              <h2>Promociones</h2>
            </div>

          </div>

          <div className="client-promotion-grid">

            {promotions.map((promotion) => (

              <article
                className="client-promotion-card"
                key={promotion.id_promocion}
              >

                <div className="client-promotion-image">

                  {promotion.foto ? (
                    <img
                      src={promotion.foto}
                      alt={promotion.nombre}
                    />
                  ) : (
                    <div className="promotion-no-image">
                      OFERTA
                    </div>
                  )}

                </div>

                <div className="client-promotion-content">

                  <em className="client-promotion-tag">
                    PROMOCIÓN
                  </em>

                  <h3>
                    {promotion.nombre}
                  </h3>

                  <p>
                    {promotion.descripcion}
                  </p>

                  <div className="client-promotion-meta">
                    <strong>
                      {formatMoney(promotion.precio)}
                    </strong>

                    <span>
                      {promotion.duracion_minutos} min · hasta el{" "}
                      {formatDate(promotion.fecha_fin)}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="client-promotion-button"
                    onClick={() =>
                      navigate(
                        `/cliente/reservar?promo=${promotion.id_promocion}`
                      )
                    }
                  >
                    Reservar con esta promoción
                  </button>

                </div>

              </article>

            ))}

          </div>

        </section>

      )}

      <section className="client-section">

        <div className="client-section-title">

          <div>
            <span>LO QUE OFRECEMOS</span>
            <h2>Nuestros servicios</h2>
          </div>

          <button
            onClick={() => navigate("/cliente/reservar")}
          >
            Reservar
          </button>

        </div>

        {services.length === 0 ? (

          <div className="client-empty">
            No hay servicios disponibles actualmente.
          </div>

        ) : (

          <div className="client-service-grid">

            {services.map((service) => (

              <article
                className="client-service-card"
                key={service.id_servicio}
              >

                <div className="client-service-image">

                  {service.foto ? (
                    <img
                      src={service.foto}
                      alt={service.nombre}
                    />
                  ) : (
                    <div className="service-no-image">
                      B
                    </div>
                  )}

                </div>

                <div className="client-service-content">

                  <h3>
                    {service.nombre}
                  </h3>

                  <p>
                    {service.descripcion ||
                      "Servicio profesional de barbería."}
                  </p>

                  <div className="client-service-bottom">

                    <strong>
                      {formatMoney(service.precio)}
                    </strong>

                    <span>
                      {service.duracion_minutos} min
                    </span>

                  </div>

                  <button
                    type="button"
                    className="client-service-button"
                    onClick={() =>
                      navigate(
                        `/cliente/reservar?servicio=${service.id_servicio}`
                      )
                    }
                  >
                    Reservar este servicio
                  </button>

                </div>

              </article>

            ))}

          </div>

        )}

      </section>

      <section className="client-section">

        <div className="client-section-title">

          <div>
            <span>NUESTRO EQUIPO</span>
            <h2>Conoce nuestros barberos</h2>
          </div>

        </div>

        {barbers.length === 0 ? (

          <div className="client-empty">
            No hay barberos disponibles actualmente.
          </div>

        ) : (

          <div className="client-barber-grid">

            {barbers.map((barber) => (

              <article
                className="client-barber-card"
                key={barber.id_barbero}
              >

                <div className="client-barber-photo">

                  {barber.foto ? (
                    <img
                      src={barber.foto}
                      alt={`${barber.nombre} ${barber.apellido}`}
                    />
                  ) : (
                    <span>
                      {barber.nombre
                        ?.charAt(0)
                        ?.toUpperCase()}
                    </span>
                  )}

                </div>

                <h3>
                  {barber.nombre} {barber.apellido}
                </h3>

                <span className="client-barber-specialty">
                  {barber.especialidad ||
                    "Barbero profesional"}
                </span>

                {barber.descripcion && (
                  <p>
                    {barber.descripcion}
                  </p>
                )}

              </article>

            ))}

          </div>

        )}

      </section>

      <section className="client-booking-banner">

        <div>
          <span>¿LISTO PARA TU PRÓXIMO CORTE?</span>

          <h2>
            Reserva tu cita.
          </h2>
        </div>

        <button
          onClick={() => navigate("/cliente/reservar")}
        >
          Reservar ahora
        </button>

      </section>

    </div>
  );
}

export default ClientHome;
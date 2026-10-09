import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import api from "../../services/api";

import "./ClientBooking.css";

const todayLocal = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  return new Date(now - offset).toISOString().split("T")[0];
};

function ClientBooking() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [slots, setSlots] = useState([]);

  const [selectedPromo, setSelectedPromo] = useState(null);
  const [selectedService, setSelectedService] = useState("");
  const [selectedBarber, setSelectedBarber] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const hasOffer = Boolean(selectedPromo || selectedService);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      const [servicesResponse, barbersResponse, promosResponse] =
        await Promise.all([
          api.get("/services", { params: { solo_activos: true } }),
          api.get("/barbers", { params: { solo_activos: true } }),
          api.get("/promotions/disponibles")
        ]);

      setServices(servicesResponse.data);
      setBarbers(barbersResponse.data);
      setPromotions(promosResponse.data);

      // Desde el inicio: ?promo=ID (promoción) o ?servicio=ID (servicio normal)
      const promoId = searchParams.get("promo");
      const serviceId = searchParams.get("servicio");

      if (promoId) {
        const promo = promosResponse.data.find(
          (item) => String(item.id_promocion) === String(promoId)
        );

        if (promo) {
          setSelectedPromo(promo);

          // Si solo la atiende un barbero, queda seleccionado
          if (promo.barberos?.length === 1) {
            setSelectedBarber(String(promo.barberos[0].id_barbero));
          }
        }
      } else if (serviceId) {
        const service = servicesResponse.data.find(
          (item) => String(item.id_servicio) === String(serviceId)
        );

        if (service) {
          setSelectedService(String(service.id_servicio));
        }
      }

      setError("");
    } catch (error) {
      console.error(error);

      setError(
        "No se pudieron cargar los servicios, barberos y promociones."
      );
    } finally {
      setLoading(false);
    }
  };

  const resetSchedule = () => {
    setSelectedDate("");
    setSelectedSlot(null);
    setSlots([]);
    setSuccess("");
    setError("");
  };

  // Servicio normal: reemplaza a cualquier promoción elegida
  const handleServiceChange = (event) => {
    setSelectedService(event.target.value);
    setSelectedPromo(null);
    resetSchedule();
  };

  const handleSelectPromo = (promo) => {
    // Clic sobre la promo ya elegida = quitarla
    if (selectedPromo?.id_promocion === promo.id_promocion) {
      clearPromo();
      return;
    }

    // Promoción: reemplaza a cualquier servicio normal elegido
    setSelectedPromo(promo);
    setSelectedService("");
    resetSchedule();

    // Solo se puede reservar con los barberos que atienden la promoción
    const allowed = (promo.barberos || []).map((barber) =>
      String(barber.id_barbero)
    );

    if (allowed.length === 1) {
      setSelectedBarber(allowed[0]);
    } else if (!allowed.includes(String(selectedBarber))) {
      setSelectedBarber("");
    }
  };

  const clearPromo = () => {
    setSelectedPromo(null);
    setSelectedService("");
    resetSchedule();
  };

  const handleBarberSelect = async (barberId) => {
    setSelectedBarber(String(barberId));
    setSelectedSlot(null);
    setSlots([]);
    setError("");

    if (selectedDate && hasOffer) {
      await loadAvailableSlots(barberId, selectedDate);
    }
  };

  const handleDateChange = async (event) => {
    const date = event.target.value;

    setSelectedDate(date);
    setSelectedSlot(null);
    setSlots([]);
    setSuccess("");
    setError("");

    if (!date || !hasOffer || !selectedBarber) {
      return;
    }

    await loadAvailableSlots(selectedBarber, date);
  };

  const loadAvailableSlots = async (barberId, date) => {
    try {
      setLoadingSlots(true);

      const response = await api.get("/appointments/availability", {
        params: {
          id_barbero: barberId,
          ...(selectedPromo
            ? { id_promocion: selectedPromo.id_promocion }
            : { id_servicio: selectedService }),
          fecha: date
        }
      });

      setSlots(response.data.disponibles || []);

      if (response.data.disponibles?.length === 0) {
        setError("No hay horarios disponibles para esta fecha.");
      }
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "No se pudieron consultar los horarios."
      );

      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const selectSlot = (slot) => {
    setSelectedSlot(slot);
    setError("");
    setSuccess("");
  };

  const handleBooking = async () => {
    if (
      !hasOffer ||
      !selectedBarber ||
      !selectedDate ||
      !selectedSlot
    ) {
      setError("Selecciona servicio o promoción, barbero, fecha y horario.");

      return;
    }

    try {
      setBooking(true);
      setError("");
      setSuccess("");

      await api.post("/appointments", {
        id_barbero: Number(selectedBarber),
        ...(selectedPromo
          ? { id_promocion: Number(selectedPromo.id_promocion) }
          : { id_servicio: Number(selectedService) }),
        fecha: selectedDate,
        hora_inicio: selectedSlot.hora_inicio,
        hora_fin: selectedSlot.hora_fin
      });

      setSuccess("¡Cita reservada correctamente!");

      setSelectedSlot(null);

      await loadAvailableSlots(selectedBarber, selectedDate);
    } catch (error) {
      console.error(error);

      setError(
        error.response?.data?.message ||
        "No se pudo reservar la cita."
      );
    } finally {
      setBooking(false);
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

  const selectedServiceData = services.find(
    (service) =>
      String(service.id_servicio) === String(selectedService)
  );

  const selectedBarberData = barbers.find(
    (barber) =>
      String(barber.id_barbero) === String(selectedBarber)
  );

  // Con una promoción, solo los barberos que la atienden
  const visibleBarbers = selectedPromo
    ? barbers.filter((barber) =>
        (selectedPromo.barberos || []).some(
          (item) => item.id_barbero === barber.id_barbero
        )
      )
    : barbers;

  // Lo que se está reservando: promoción o servicio normal
  const offer = selectedPromo
    ? {
        nombre: selectedPromo.nombre,
        precio: selectedPromo.precio,
        duracion_minutos: selectedPromo.duracion_minutos,
        foto: selectedPromo.foto
      }
    : selectedServiceData || null;

  // La fecha debe caer dentro de la vigencia de la promoción
  const today = todayLocal();
  const minDate =
    selectedPromo && selectedPromo.fecha_inicio > today
      ? selectedPromo.fecha_inicio
      : today;
  const maxDate = selectedPromo ? selectedPromo.fecha_fin : undefined;

  if (loading) {
    return (
      <div className="booking-loading">
        Cargando opciones de reserva...
      </div>
    );
  }

  return (
    <div className="booking-page">

      <div className="booking-header">

        <div>
          <span>RESERVA ONLINE</span>

          <h1>Reserva tu cita</h1>

          <p>
            Elige una promoción o un servicio, tu barbero,
            la fecha y el horario que prefieras.
          </p>
        </div>

        <button
          className="booking-back-button"
          onClick={() => navigate("/cliente")}
        >
          ← Volver
        </button>

      </div>

      {error && (
        <div className="booking-alert error">{error}</div>
      )}

      {success && (
        <div className="booking-alert success">{success}</div>
      )}

      {promotions.length > 0 && (
        <section className="booking-promos">

          <div className="booking-promos-title">
            <h2>Promociones disponibles</h2>
            <span>Toca una para reservarla</span>
          </div>

          <div className="booking-promo-grid">
            {promotions.map((promo) => {
              const active =
                selectedPromo?.id_promocion === promo.id_promocion;

              return (
                <button
                  type="button"
                  key={promo.id_promocion}
                  className={`booking-promo-card ${active ? "selected" : ""}`}
                  onClick={() => handleSelectPromo(promo)}
                >
                  <div className="booking-promo-image">
                    {promo.foto ? (
                      <img
                        src={promo.foto}
                        alt={promo.nombre}
                      />
                    ) : (
                      <div className="booking-promo-noimage">OFERTA</div>
                    )}

                    {active && (
                      <span className="booking-promo-check">
                        ✓ Aplicada
                      </span>
                    )}
                  </div>

                  <div className="booking-promo-body">
                    <strong>{promo.nombre}</strong>

                    <div className="booking-promo-price">
                      <b>{formatMoney(promo.precio)}</b>
                      <span>{promo.duracion_minutos} min</span>
                    </div>

                    <small>Hasta el {formatDate(promo.fecha_fin)}</small>
                  </div>
                </button>
              );
            })}
          </div>

        </section>
      )}

      <div className="booking-layout">

        <div className="booking-form-card">

          <div className="booking-step">

            <div className="booking-step-number">1</div>

            <div className="booking-step-content">

              <label>Servicio o promoción</label>

              <select
                value={selectedService}
                onChange={handleServiceChange}
              >
                <option value="">Selecciona un servicio</option>

                {services.map((service) => (
                  <option
                    key={service.id_servicio}
                    value={service.id_servicio}
                  >
                    {service.nombre} — {formatMoney(service.precio)}
                  </option>
                ))}
              </select>

              {selectedPromo && (
                <small className="booking-promo-note">
                  Reservando la promoción «{selectedPromo.nombre}».{" "}
                  <button type="button" onClick={clearPromo}>
                    Quitar promoción
                  </button>
                </small>
              )}

            </div>

          </div>

          <div className="booking-step">

            <div className="booking-step-number">2</div>

            <div className="booking-step-content">

              <label>Selecciona un barbero</label>

              {selectedPromo && (
                <small className="booking-promo-note">
                  {visibleBarbers.length === 1
                    ? "Esta promoción solo la atiende el barbero indicado."
                    : "Esta promoción solo la atienden los barberos que ves aquí."}
                </small>
              )}

              {visibleBarbers.length === 0 ? (
                <div className="booking-empty">
                  No hay barberos disponibles por el momento.
                </div>
              ) : (
                <div className="booking-barbers">
                  {visibleBarbers.map((barber) => {
                    const active =
                      String(barber.id_barbero) === String(selectedBarber);

                    return (
                      <button
                        type="button"
                        key={barber.id_barbero}
                        className={`booking-barber ${active ? "selected" : ""}`}
                        onClick={() => handleBarberSelect(barber.id_barbero)}
                      >
                        <span className="booking-barber-photo">
                          {barber.foto ? (
                            <img
                              src={barber.foto}
                              alt={`${barber.nombre} ${barber.apellido}`}
                            />
                          ) : (
                            barber.nombre?.charAt(0)?.toUpperCase()
                          )}
                        </span>

                        <strong>
                          {barber.nombre} {barber.apellido}
                        </strong>

                        {barber.especialidad && (
                          <small>{barber.especialidad}</small>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

            </div>

          </div>

          <div className="booking-step">

            <div className="booking-step-number">3</div>

            <div className="booking-step-content">

              <label>Selecciona una fecha</label>

              <input
                type="date"
                value={selectedDate}
                min={minDate}
                max={maxDate}
                onChange={handleDateChange}
                disabled={!hasOffer || !selectedBarber}
              />

              {!hasOffer || !selectedBarber ? (
                <small>
                  Primero selecciona el servicio o la promoción y el barbero.
                </small>
              ) : selectedPromo ? (
                <small>
                  La promoción es válida del{" "}
                  {formatDate(selectedPromo.fecha_inicio)} al{" "}
                  {formatDate(selectedPromo.fecha_fin)}.
                </small>
              ) : null}

            </div>

          </div>

          <div className="booking-step">

            <div className="booking-step-number">4</div>

            <div className="booking-step-content">

              <label>Horarios disponibles</label>

              {!selectedDate ? (

                <div className="booking-empty">
                  Selecciona una fecha para consultar los horarios.
                </div>

              ) : loadingSlots ? (

                <div className="booking-empty">
                  Consultando horarios...
                </div>

              ) : slots.length === 0 ? (

                <div className="booking-empty">
                  No hay horarios disponibles.
                </div>

              ) : (

                <div className="booking-slots">

                  {slots.map((slot, index) => (

                    <button
                      key={`${slot.hora_inicio}-${index}`}
                      type="button"
                      className={
                        selectedSlot === slot
                          ? "booking-slot selected"
                          : "booking-slot"
                      }
                      onClick={() => selectSlot(slot)}
                    >
                      {slot.hora_inicio.slice(0, 5)}
                      {" - "}
                      {slot.hora_fin.slice(0, 5)}
                    </button>

                  ))}

                </div>

              )}

            </div>

          </div>

          <button
            className="booking-confirm-button"
            onClick={handleBooking}
            disabled={
              booking ||
              !hasOffer ||
              !selectedBarber ||
              !selectedDate ||
              !selectedSlot
            }
          >
            {booking ? "Reservando..." : "Confirmar reserva"}
          </button>

        </div>

        <aside className="booking-summary">

          <span className="summary-label">RESUMEN</span>

          <h2>Tu cita</h2>

          {offer?.foto && (
            <div className="summary-service-image">
              <img
                src={offer.foto}
                alt={offer.nombre}
              />
            </div>
          )}

          <div className="summary-divider" />

          <div className="summary-item">
            <span>{selectedPromo ? "Promoción" : "Servicio"}</span>

            <strong>
              {offer?.nombre || "No seleccionado"}
            </strong>
          </div>

          <div className="summary-item">
            <span>Duración</span>

            <strong>
              {offer
                ? `${offer.duracion_minutos} min`
                : "-"}
            </strong>
          </div>

          <div className="summary-item">
            <span>Barbero</span>

            <strong className="summary-barber">
              {selectedBarberData ? (
                <>
                  <span className="summary-barber-photo">
                    {selectedBarberData.foto ? (
                      <img
                        src={selectedBarberData.foto}
                        alt={selectedBarberData.nombre}
                      />
                    ) : (
                      selectedBarberData.nombre?.charAt(0)?.toUpperCase()
                    )}
                  </span>
                  {selectedBarberData.nombre} {selectedBarberData.apellido}
                </>
              ) : (
                "No seleccionado"
              )}
            </strong>
          </div>

          <div className="summary-item">
            <span>Fecha</span>

            <strong>{selectedDate || "No seleccionada"}</strong>
          </div>

          <div className="summary-item">
            <span>Hora</span>

            <strong>
              {selectedSlot
                ? `${selectedSlot.hora_inicio.slice(0, 5)} - ${selectedSlot.hora_fin.slice(0, 5)}`
                : "No seleccionada"}
            </strong>
          </div>

          <div className="summary-total">

            <span>Total</span>

            <strong>
              {offer ? formatMoney(offer.precio) : "$0"}
            </strong>

          </div>

        </aside>

      </div>

    </div>
  );
}

export default ClientBooking;

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../services/api";
import localImage from "../../public/local.png";
import logo from "../assets/logo.png";
import "./Home.css";
import corteImagen from "../1.png";
import corteImagen1 from "../assets/2.png";
import corteImagen2 from "../assets/3.png";
import corteImagen3 from "../assets/4.png";
import corteImagen4 from "../assets/5.png";
import corteImagen5 from "../assets/6.png";

const GALLERY = [corteImagen, corteImagen1, corteImagen2, corteImagen3, corteImagen4, corteImagen5];

function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [services, setServices] = useState([]);
  const [barbers, setBarbers] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);
  const [testimonialsError, setTestimonialsError] = useState(false);

  useEffect(() => {
    // Cargar servicios
    api.get("/services", { params: { solo_activos: true } })
      .then(res => setServices(res.data.filter(s => s.activo)))
      .catch(err => console.error("Error cargando servicios:", err));

    // Cargar barberos
    api.get("/barbers", { params: { solo_activos: true } })
      .then(res => setBarbers(res.data.filter(b => b.activo)))
      .catch(err => console.error("Error cargando barberos:", err));

    api.get("/reviews/recent")
      .then(res => setTestimonials(res.data))
      .catch(err => {
        console.error("Error cargando testimonios:", err);
        setTestimonialsError(true);
      })
      .finally(() => setTestimonialsLoading(false));
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="home">

      <header className="home-nav">
        <div className="container home-nav-inner">

          <a href="#top" className="home-logo" onClick={closeMenu}>
            <img src={logo} alt="Vitery Barber" className="home-logo-mark" />
            <span>VITERY <em>BARBER</em></span>
          </a>

          <nav className={`home-links ${menuOpen ? "open" : ""}`}>
            <a href="#servicios" onClick={closeMenu}>Servicios</a>
            <a href="#nosotros" onClick={closeMenu}>Nosotros</a>
            <a href="#galeria" onClick={closeMenu}>Galería</a>
            <a href="#equipo" onClick={closeMenu}>Equipo</a>
            <a href="#contacto" onClick={closeMenu}>Contacto</a>

            <div className="home-links-actions">
              <Link to="/login" className="btn btn-outline-dark" onClick={closeMenu}>
                Iniciar sesión
              </Link>
              <Link to="/register" className="btn btn-gold" onClick={closeMenu}>
                Registrarme
              </Link>
            </div>
          </nav>

          <button
            className={`home-burger ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Abrir menú"
          >
            <span></span><span></span><span></span>
          </button>

        </div>
      </header>

      <main id="top">

        {/* HERO */}
        <section className="hero">
          <div className="hero-bg" />
          <div className="hero-overlay" />

          <div className="container hero-content">
            <span className="section-eyebrow hero-eyebrow">Barbería &amp; estilo masculino</span>

            <h1>
              Estilo, tradición<br />
              y precisión en <span>cada corte</span>
            </h1>

            <p className="hero-text">
              Reserva tu cita en minutos y déjate atender por barberos
              certificados en un espacio pensado para ti.
            </p>

            <div className="hero-actions">
              <Link to="/register" className="btn btn-gold">Reservar mi cita</Link>
              <a href="#servicios" className="btn btn-outline-light">Ver servicios</a>
            </div>

            <div className="hero-stats">
              <div><strong>+10</strong><span>años de experiencia</span></div>
              <div><strong>+5.000</strong><span>clientes atendidos</span></div>
              <div><strong>+15</strong><span>barberos expertos</span></div>
              <div><strong>4.9★</strong><span>calificación promedio</span></div>
            </div>
          </div>
        </section>

        {/* SERVICIOS */}
        <section id="servicios" className="section">
          <div className="container">

            <div className="section-head">
              <span className="section-eyebrow">Lo que ofrecemos</span>
              <h2>Nuestros servicios</h2>
              <p>Todo lo que necesitas para lucir impecable, con productos premium y atención personalizada.</p>
            </div>

            <div className="services-grid">
              {services.map((service, index) => (
                <article
                  className={`service-card ${index === 2 ? "service-card-featured" : ""}`}
                  key={service.id_servicio}
                >
                  {index === 2 && <span className="service-card-tag">Más pedido</span>}
                  <div className="service-card-img">
                    {service.foto ? (
                      <img src={service.foto} alt={service.nombre} loading="lazy" />
                    ) : (
                      <div style={{width:'100%', height:'200px', backgroundColor:'#eee'}} />
                    )}
                  </div>
                  <div className="service-card-body">
                    <h3>{service.nombre}</h3>
                    <p>{service.descripcion}</p>
                    <span className="service-price">
                      {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(service.precio)}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* NOSOTROS */}
        <section id="nosotros" className="section section-alt">
          <div className="container why-grid">

            <img src={localImage} alt="Interior de la barbería" loading="lazy" />

            <div className="why-content">
              <span className="section-eyebrow">Por qué elegirnos</span>
              <h2>Una experiencia pensada para ti</h2>
              <p>
                Combinamos técnicas tradicionales de barbería con un servicio
                moderno de reservas, para que cuidar tu imagen sea rápido,
                cómodo y sin filas.
              </p>

              <div className="why-features">
                <div className="why-item">
                  <span className="why-icon"></span>
                  <div>
                    <h4>Barberos certificados</h4>
                    <p>Profesionales con años de experiencia en cada técnica.</p>
                  </div>
                </div>

                <div className="why-item">
                  <span className="why-icon"></span>
                  <div>
                    <h4>Reservas en línea</h4>
                    <p>Agenda tu cita 24/7 desde el celular o el computador.</p>
                  </div>
                </div>

                <div className="why-item">
                  <span className="why-icon"></span>
                  <div>
                    <h4>Productos premium</h4>
                    <p>Solo utilizamos marcas de alta calidad para tu cuidado.</p>
                  </div>
                </div>

                <div className="why-item">
                  <span className="why-icon"></span>
                  <div>
                    <h4>Atención 5 estrellas</h4>
                    <p>Miles de clientes satisfechos avalan nuestro servicio.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* GALERÍA */}
        <section id="galeria" className="section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Nuestro trabajo</span>
              <h2>Galería</h2>
              <p>Una muestra de los estilos y cortes que hacemos día a día.</p>
            </div>

             <div className="gallery-grid">
                {GALLERY.map((src, i) => (
                  <div className="gallery-item" key={i}>
                    <img
                      src={src}
                      alt={`Trabajo de barbería ${i + 1}`}
                      loading="lazy"
                    />
                  </div>
                ))}
            </div>
          </div>
        </section>

        {/* EQUIPO */}
        <section id="equipo" className="section section-alt">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">El equipo</span>
              <h2>Nuestros barberos</h2>
              <p>Un equipo apasionado, listo para darte el mejor estilo.</p>
            </div>

            <div className="team-grid">
              {barbers.map((member) => (
                <div className="team-card" key={member.id_barbero}>
                  {member.foto ? (
                    <img src={member.foto} alt={member.nombre} loading="lazy" />
                  ) : (
                    <div style={{ width: '100%', height: '300px', backgroundColor: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3rem', color: '#9ca3af', borderRadius: '10px' }}>
                      {member.nombre?.charAt(0)}{member.apellido?.charAt(0)}
                    </div>
                  )}
                  <h4>{member.nombre} {member.apellido}</h4>
                  <span>{member.especialidad || "Barbero"}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIOS */}
        <section className="section">
          <div className="container">
            <div className="section-head">
              <span className="section-eyebrow">Testimonios</span>
              <h2>Lo que dicen nuestros clientes</h2>
            </div>

            {testimonialsLoading ? (
              <p className="testimonial-message">Cargando reseñas...</p>
            ) : testimonialsError ? (
              <p className="testimonial-message">No se pudieron cargar las reseñas.</p>
            ) : testimonials.length === 0 ? (
              <p className="testimonial-message">Aún no hay comentarios de clientes.</p>
            ) : (
              <div className="testimonial-grid">
                {testimonials.map((testimonial) => {
                  const customerName = [
                    testimonial.cliente_nombre,
                    testimonial.cliente_apellido
                  ].filter(Boolean).join(" ");
                  const barberName = [
                    testimonial.barbero_nombre,
                    testimonial.barbero_apellido
                  ].filter(Boolean).join(" ");
                  const initials = customerName
                    .split(/\s+/)
                    .map((part) => part.charAt(0))
                    .join("")
                    .slice(0, 2);
                  const rating = Number(testimonial.estrellas);

                  return (
                    <article className="testimonial-card" key={testimonial.id_resena}>
                      <div
                        className="testimonial-rating"
                        aria-label={`Calificación: ${rating} de 5 estrellas`}
                      >
                        {"★".repeat(rating)}
                        <span>{"☆".repeat(5 - rating)}</span>
                      </div>
                      <p>“{testimonial.comentario}”</p>
                      <div className="testimonial-author">
                        <div className="testimonial-avatar" aria-hidden="true">
                          {initials}
                        </div>
                        <div>
                          <strong>{customerName || "Cliente"}</strong>
                          <span>Reseña para {barberName || "un barbero"}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="cta">
          <div className="container cta-inner">
            <h2>¿Listo para tu próximo corte?</h2>
            <p>Crea tu cuenta de cliente y reserva tu cita en menos de un minuto.</p>
            <div className="cta-actions">
              <Link to="/register" className="btn btn-gold">Crear cuenta gratis</Link>
              <Link to="/login" className="btn btn-outline-light">Ya tengo cuenta</Link>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer id="contacto" className="home-footer">
        <div className="container footer-grid">

          <div className="footer-brand">
            <div className="home-logo">
              <img src={logo} alt="Vitery Barber" className="home-logo-mark" />
              <span>VITERY <em>BARBER</em></span>
            </div>
            <p>Tu estilo comienza aquí. Barbería con tradición, técnica moderna y atención de primera.</p>
          </div>

          <div>
            <h4>Contacto</h4>
            <p>CRA 21A #14-105, Pasto, Nariño</p>
            <p>+57 3154763844</p>
            <p>manuel.viteri1@icloud.com</p>
          </div>

          <div>
            <h4>Horario</h4>
            <p>Lunes a viernes: 9:00 am – 8:00 pm</p>
            <p>Sábados: 9:00 am – 8:00 pm</p>
            <p>Domingos: horario libre</p>
          </div>

          <div>
            <h4>Acceso</h4>
            <p><Link to="/register">Crear cuenta de cliente</Link></p>
            <p><Link to="/login">Iniciar sesión</Link></p>
            <p className="footer-staff">Barberos y administración inician sesión desde el mismo botón.</p>
          </div>

        </div>

        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Barbería VITERY BARBER. Todos los derechos reservados.</span>
        </div>
      </footer>

    </div>
  );
}

export default Home;

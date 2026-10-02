import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import "./ClientLayout.css";

function ClientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="client-layout">

      <header className="client-header">

        <div className="client-logo">
          <div className="client-logo-icon">B</div>
          <div>
            <strong>BITERY BARBER</strong>
            <span>Reserva tu estilo</span>
          </div>
        </div>

        <nav className={`client-nav ${menuOpen ? "open" : ""}`}>

          <NavLink
            to="/cliente"
            end
            className={({ isActive }) =>
              isActive ? "client-nav-link active" : "client-nav-link"
            }
            onClick={closeMenu}
          >
            Inicio
          </NavLink>

          <NavLink
            to="/cliente/reservar"
            className={({ isActive }) =>
              isActive ? "client-nav-link active" : "client-nav-link"
            }
            onClick={closeMenu}
          >
            Reservar
          </NavLink>

          <NavLink
            to="/cliente/citas"
            className={({ isActive }) =>
              isActive ? "client-nav-link active" : "client-nav-link"
            }
            onClick={closeMenu}
          >
            Mis citas
          </NavLink>

          <NavLink
            to="/cliente/perfil"
            className={({ isActive }) =>
              isActive ? "client-nav-link active" : "client-nav-link"
            }
            onClick={closeMenu}
          >
            Mi perfil
          </NavLink>

          <button className="client-logout client-logout-mobile" onClick={handleLogout}>
            Cerrar sesión
          </button>

        </nav>

        <div className="client-user">

          <div className="client-user-avatar">
            {user?.nombre?.charAt(0)?.toUpperCase() || "C"}
          </div>

          <div className="client-user-info">
            <strong>{user?.nombre} {user?.apellido}</strong>
            <span>Cliente</span>
          </div>

          <button className="client-logout" onClick={handleLogout}>
            Salir
          </button>

          <button
            className={`client-menu-toggle ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Abrir menú"
          >
            <span></span><span></span><span></span>
          </button>

        </div>

      </header>

      {menuOpen && (
        <div className="client-overlay" onClick={closeMenu} />
      )}

      <main className="client-content">
        <Outlet />
      </main>

    </div>
  );
}

export default ClientLayout;

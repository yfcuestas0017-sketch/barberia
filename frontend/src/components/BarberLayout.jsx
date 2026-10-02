import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  IconMenu,
  IconChevronsLeft,
  IconSearch,
  IconBell,
  IconHelp,
  IconLogout,
  IconDashboard,
  IconCalendar,
  IconClock,
  IconStar,
  IconUserCircle,
  IconTrendUp,
} from "./Icons";

import "./AppShell.css";

const NAV_ITEMS = [
  { to: "/barbero", end: true, label: "Dashboard", icon: IconDashboard },
  { to: "/barbero/citas", label: "Mis citas", icon: IconCalendar },
  { to: "/barbero/ingresos", label: "Mis ingresos", icon: IconTrendUp },
  { to: "/barbero/horario", label: "Mi horario", icon: IconClock },
  { to: "/barbero/resenas", label: "Mis reseñas", icon: IconStar },
  { to: "/barbero/perfil", label: "Mi perfil", icon: IconUserCircle },
];

function BarberLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const closeMenu = () => setMobileOpen(false);

  const toggleSidebar = () => {
    const isMobile = window.matchMedia("(max-width: 900px)").matches;
    if (isMobile) {
      setMobileOpen((v) => !v);
    } else {
      setCollapsed((v) => !v);
    }
  };

  const initials = user?.nombre?.charAt(0)?.toUpperCase() || "B";

  return (
    <div className="shell">
      {mobileOpen && <div className="shell-overlay" onClick={closeMenu} />}

      <aside className={`shell-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "open" : ""}`}>
        <div className="shell-brand">
          <div className="shell-brand-mark">B</div>
          <div className="shell-brand-text">
            <strong>BITERY BARBER</strong>
            <span>Panel Barbero</span>
          </div>
        </div>

        <nav className="shell-nav">
          {NAV_ITEMS.map(({ to, end, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={closeMenu}
              className={({ isActive }) => `shell-link ${isActive ? "active" : ""}`}
              title={label}
            >
              <Icon size={19} />
              <span className="shell-label">{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="shell-main">
        <header className="shell-topbar">
          <button className="shell-toggle" onClick={toggleSidebar} aria-label="Abrir/cerrar menú">
            {collapsed ? <IconMenu size={19} /> : <IconChevronsLeft size={19} />}
          </button>

          <div className="shell-title">
            <h1>Panel del barbero</h1>
            <p>Gestiona tus citas y servicios.</p>
          </div>

          <div className="shell-actions">
            <button className="shell-icon-btn" title="Buscar">
              <IconSearch size={18} />
            </button>
            <button className="shell-icon-btn" title="Ayuda">
              <IconHelp size={18} />
            </button>
            <button className="shell-icon-btn" title="Notificaciones">
              <IconBell size={18} />
              <span className="dot" />
            </button>

            <div className="shell-divider" />

            <div className="shell-profile-wrapper">
              <div 
                className="shell-profile" 
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <div className="shell-avatar">
                  {user?.foto ? (
                    <img src={user.foto} alt="Perfil" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    initials
                  )}
                </div>
                <div className="shell-profile-text">
                  <strong>{user?.nombre} {user?.apellido}</strong>
                  <span>Barbero</span>
                </div>
              </div>

              {dropdownOpen && (
                <div className="shell-dropdown">
                  <NavLink to="/barbero/perfil" className="shell-dropdown-item" onClick={() => setDropdownOpen(false)}>
                    Mi Perfil
                  </NavLink>
                  <button className="shell-dropdown-item danger" onClick={handleLogout}>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="shell-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default BarberLayout;

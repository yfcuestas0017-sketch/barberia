import { useEffect, useRef, useState, useCallback } from "react";
import { IconBell } from "./Icons";
import {
  isPushSupported,
  isIOS,
  isStandalone,
  getCurrentSubscription,
  enablePush,
  disablePush,
  sendTestPush
} from "../services/push";

import "./NotificationBell.css";

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const wrapperRef = useRef(null);

  const supported = isPushSupported();
  const needsInstall = isIOS() && !isStandalone();

  const refresh = useCallback(async () => {
    if (!supported) return;
    try {
      const subscription = await getCurrentSubscription();
      setActive(Boolean(subscription) && Notification.permission === "granted");
    } catch {
      setActive(false);
    }
  }, [supported]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const run = async (action, okMessage) => {
    setBusy(true);
    setMessage("");
    try {
      await action();
      setMessage(okMessage);
    } catch (error) {
      if (error.message === "DENIED") {
        setMessage("Bloqueaste el permiso. Actívalo desde los ajustes del navegador para este sitio.");
      } else if (error.response?.data?.message) {
        setMessage(error.response.data.message);
      } else {
        setMessage("No se pudo completar. Intenta de nuevo.");
      }
    } finally {
      await refresh();
      setBusy(false);
    }
  };

  const handleEnable = () => run(enablePush, "¡Listo! Te avisaremos de cada cita nueva.");
  const handleDisable = () => run(disablePush, "Notificaciones desactivadas en este dispositivo.");
  const handleTest = () => run(sendTestPush, "Prueba enviada, debería llegarte en segundos.");

  return (
    <div className="notif-wrapper" ref={wrapperRef}>
      <button
        className="shell-icon-btn"
        title="Notificaciones"
        onClick={() => setOpen((v) => !v)}
      >
        <IconBell size={18} />
        {!active && supported && <span className="dot" />}
      </button>

      {open && (
        <div className="notif-panel">
          <strong className="notif-title">Avisos de nuevas citas</strong>

          {!supported && (
            <p className="notif-text">
              {needsInstall
                ? "En iPhone debes instalar la página: toca Compartir → «Añadir a pantalla de inicio», ábrela desde ahí y vuelve a esta opción."
                : "Este navegador no soporta notificaciones. Prueba con Chrome, Edge o Safari actualizado."}
            </p>
          )}

          {supported && needsInstall && (
            <p className="notif-text">
              En iPhone, toca Compartir → «Añadir a pantalla de inicio», abre la app desde ahí y activa las notificaciones.
            </p>
          )}

          {supported && !needsInstall && !active && (
            <>
              <p className="notif-text">
                Recibe una notificación en este dispositivo cada vez que un cliente reserve contigo.
              </p>
              <button className="notif-btn primary" disabled={busy} onClick={handleEnable}>
                {busy ? "Activando..." : "Activar notificaciones"}
              </button>
            </>
          )}

          {supported && !needsInstall && active && (
            <>
              <p className="notif-text ok">✓ Activadas en este dispositivo</p>
              <button className="notif-btn" disabled={busy} onClick={handleTest}>
                Enviar notificación de prueba
              </button>
              <button className="notif-btn danger" disabled={busy} onClick={handleDisable}>
                Desactivar
              </button>
            </>
          )}

          {message && <p className="notif-msg">{message}</p>}
        </div>
      )}
    </div>
  );
}

export default NotificationBell;

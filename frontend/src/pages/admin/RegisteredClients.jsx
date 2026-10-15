import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";

import "./RegisteredClients.css";

function RegisteredClients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoading(true);
        const response = await api.get("/users/clients");
        setClients(response.data);
        setError("");
      } catch (requestError) {
        console.error("Error cargando clientes registrados:", requestError);
        setError(
          requestError.response?.data?.message ||
          "No se pudieron cargar los clientes registrados."
        );
      } finally {
        setLoading(false);
      }
    };

    loadClients();
  }, []);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("es");
    if (!query) return clients;

    return clients.filter((client) =>
      `${client.nombre} ${client.apellido} ${client.email} ${client.telefono || ""}`
        .toLocaleLowerCase("es")
        .includes(query)
    );
  }, [clients, search]);

  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  if (loading) {
    return <div className="registered-clients-state">Cargando clientes...</div>;
  }

  return (
    <section className="registered-clients-page">
      <header className="registered-clients-header">
        <div>
          <span>ADMINISTRACIÓN</span>
          <h2>Clientes registrados</h2>
          <p>Consulta las cuentas de cliente creadas en la plataforma.</p>
        </div>
        <div className="registered-clients-total" aria-label={`${clients.length} clientes registrados`}>
          <strong>{clients.length}</strong>
          <span>{clients.length === 1 ? "cliente" : "clientes"}</span>
        </div>
      </header>

      {error ? (
        <div className="registered-clients-state error" role="alert">{error}</div>
      ) : (
        <>
          <label className="registered-clients-search">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nombre, correo o teléfono..."
              aria-label="Buscar clientes"
            />
          </label>

          <div className="registered-clients-list">
            {filteredClients.length === 0 ? (
              <p className="registered-clients-state">
                {clients.length === 0
                  ? "Aún no hay clientes registrados."
                  : "No hay clientes que coincidan con la búsqueda."}
              </p>
            ) : (
              filteredClients.map((client) => {
                const initials =
                  `${client.nombre?.charAt(0) || ""}${client.apellido?.charAt(0) || ""}`
                    .toUpperCase();

                return (
                  <article className="registered-client-card" key={client.id_usuario}>
                    <div className="registered-client-avatar">
                      {client.foto ? (
                        <img src={client.foto} alt="" />
                      ) : (
                        initials || "C"
                      )}
                    </div>
                    <div className="registered-client-info">
                      <strong>{client.nombre} {client.apellido}</strong>
                      <span>{client.email}</span>
                      <span>{client.telefono || "Sin teléfono"}</span>
                    </div>
                    <div className="registered-client-meta">
                      <span className={`registered-client-status ${client.activo ? "active" : "inactive"}`}>
                        {client.activo ? "Activo" : "Inactivo"}
                      </span>
                      <small>Registro: {formatDate(client.created_at)}</small>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </>
      )}
    </section>
  );
}

export default RegisteredClients;

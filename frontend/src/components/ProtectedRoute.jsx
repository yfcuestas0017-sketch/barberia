import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const userRoleNames = user.roles?.map((role) =>
    typeof role === "string" ? role : role.nombre
  ) || [];

  if (roles && !roles.some((role) => userRoleNames.includes(role))) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {

    const userRoles = req.user?.roles || [];

    const roleNames = userRoles.map(
      (role) => role.nombre
    );

    const hasPermission = allowedRoles.some(
      (role) => roleNames.includes(role)
    );

    if (!hasPermission) {
      return res.status(403).json({
        message: "No tienes permisos para realizar esta acción",
      });
    }

    next();
  };
};
const { verifyToken } = require('../helpers/jwt');
const { errorResponse } = require('../helpers/response');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return errorResponse(res, 'Token no proporcionado', 401);
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return errorResponse(res, 'Formato de token inválido', 401);
    }

    const decoded = verifyToken(token);

    if (!decoded || !decoded.id_usuario) {
      return errorResponse(res, 'Token inválido: id_usuario no encontrado', 401);
    }

    if (decoded.estado !== 'ACTIVO') {
      return errorResponse(res, 'Usuario sin acceso al sistema', 403);
    }

    if (!decoded.rol) {
      return errorResponse(res, 'El usuario no tiene rol asociado', 403);
    }

    // El payload ahora incluye los perfiles directamente gracias al AuthService,
    // eliminando la necesidad de consultar la base de datos en cada petición.
    req.user = {
      id_usuario: decoded.id_usuario,
      email: decoded.email,
      estado: decoded.estado,
      id_rol: decoded.id_rol,
      rol: decoded.rol,
      rol_detalle: decoded.rol_detalle,
      id_instructor: decoded.id_instructor || null,
      id_aprendiz: decoded.id_aprendiz || null,
    };

    next();
  } catch (error) {
    console.error('Error en authMiddleware:', error.message);
    return errorResponse(res, 'No autorizado', 401);
  }
};

module.exports = authMiddleware;
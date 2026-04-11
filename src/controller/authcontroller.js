const { User, Role, Person } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { successResponse, errorResponse } = require('../helpers/response');

const login = async (req, res) => {
  try {
    const { email, numero_documento, documento, password } = req.body;
    const documentValue = numero_documento || documento;

    if ((!email && !documentValue) || !password) {
      return errorResponse(res, 'Email o documento y contraseña son obligatorios', 400);
    }

    const where = email ? { email } : undefined;
    const personaWhere = documentValue ? { numero_documento: documentValue } : undefined;

    const user = await User.findOne({
      where,
      include: [
        {
          model: Role,
          as: 'rol',
          attributes: ['id_rol', 'nombre', 'descripcion'],
        },
        {
          model: Person,
          as: 'persona',
          where: personaWhere,
          required: !!personaWhere,
          attributes: ['numero_documento'],
        },
      ],
    });

    if (!user) {
      return errorResponse(res, 'Credenciales inválidas. Verifique su información.', 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return errorResponse(res, 'Credenciales inválidas. Verifique su información.', 401);
    }

    if (user.estado !== 'ACTIVO') {
      return errorResponse(res, 'Usuario inactivo. Contacta al administrador.', 403);
    }

    const token = jwt.sign(
      {
        id_usuario: user.id_usuario,
        email: user.email,
        id_rol: user.id_rol,
      },
      env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return successResponse(
      res,
      {
        token,
        user: {
          id_usuario: user.id_usuario,
          email: user.email,
          estado: user.estado,
          id_rol: user.id_rol,
          rol: user.rol ? user.rol.nombre : null,
          rol_detalle: user.rol || null,
        },
      },
      'Inicio de sesión exitoso'
    );
  } catch (error) {
    console.error('Error en login:', error);
    return errorResponse(res, 'Error en el servidor. Intente de nuevo más tarde.', 500);
  }
};

const me = async (req, res) => {
  return successResponse(res, req.user, 'Usuario autenticado obtenido correctamente');
};

module.exports = {
  login,
  me,
};
//parte del login que implemente
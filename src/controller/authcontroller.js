const { User, Role, Person } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { successResponse, errorResponse } = require('../helpers/response');

const login = async (req, res) => {
  try {
    const { numero_documento, documento, password } = req.body;
    const documentValue = (numero_documento || documento || '').trim();

    if (!documentValue || !password) {
      return errorResponse(
        res,
        'Número de documento y contraseña son obligatorios',
        400
      );
    }

    const user = await User.findOne({
      include: [
        {
          model: Role,
          as: 'rol',
          attributes: ['id_rol', 'nombre', 'descripcion'],
        },
        {
          model: Person,
          as: 'persona',
          where: { numero_documento: documentValue },
          required: true,
          attributes: [
            'id_persona',
            'tipo_documento',
            'numero_documento',
            'nombres',
            'apellidos',
            'telefono',
          ],
        },
      ],
    });

    if (!user) {
      return errorResponse(
        res,
        'Credenciales inválidas. Verifique su información.',
        401
      );
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return errorResponse(
        res,
        'Credenciales inválidas. Verifique su información.',
        401
      );
    }

    if (user.estado !== 'ACTIVO') {
      return errorResponse(
        res,
        'Usuario inactivo. Contacta al administrador.',
        403
      );
    }

    const token = jwt.sign(
      {
        id_usuario: user.id_usuario,
        id_rol: user.id_rol,
        rol: user.rol ? user.rol.nombre : null,
      },
      env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return successResponse(
      res,
      'Inicio de sesión exitoso',
      {
        token,
        user: {
          id_usuario: user.id_usuario,
          email: user.email,
          estado: user.estado,
          id_rol: user.id_rol,
          rol: user.rol ? user.rol.nombre : null,
          rol_detalle: user.rol || null,
          persona: user.persona || null,
        },
      }
    );
  } catch (error) {
    console.error('Error en login:', error);
    return errorResponse(
      res,
      'Error en el servidor. Intente de nuevo más tarde.',
      500
    );
  }
};

const me = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id_usuario, {
      include: [
        {
          model: Role,
          as: 'rol',
          attributes: ['id_rol', 'nombre', 'descripcion'],
        },
        {
          model: Person,
          as: 'persona',
          attributes: [
            'id_persona',
            'tipo_documento',
            'numero_documento',
            'nombres',
            'apellidos',
            'telefono',
          ],
        },
      ],
    });

    if (!user) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    return successResponse(
      res,
      'Usuario autenticado obtenido correctamente',
      {
        id_usuario: user.id_usuario,
        email: user.email,
        estado: user.estado,
        id_rol: user.id_rol,
        rol: user.rol?.nombre || null,
        rol_detalle: user.rol || null,
        persona: user.persona || null,
      }
    );
  } catch (error) {
    return errorResponse(res, 'Error al obtener usuario', 500, error.message);
  }
};

module.exports = {
  login,
  me,
};
const { User, Role, Person } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { successResponse, errorResponse } = require('../helpers/response');

const login = async (req, res) => {
  try {
    const { email, numero_documento, documento, password } = req.body;
    const documentValue = (numero_documento || documento || '').trim();

    if ((!email && !documentValue) || !password) {
      return errorResponse(
        res,
        'Email o Número de documento y contraseña son obligatorios',
        400
      );
    }

    // Construir la condición de búsqueda
    const where = email ? { email } : {};
    const personaWhere = documentValue ? { numero_documento: documentValue } : null;

    // Cargar usuario con rol (sin persona, para evitar error si tabla no existe)
    let user = await User.findOne({
      where,
      include: [
        {
          model: Role,
          as: 'rol',
          attributes: ['id_rol', 'nombre', 'descripcion'],
        },
      ],
    });

    // Intentar incluir persona si la tabla existe
    if (user) {
      try {
        const userConPersona = await User.findOne({
          where,
          subQuery: false,
          include: [
            {
              model: Role,
              as: 'rol',
              attributes: ['id_rol', 'nombre', 'descripcion'],
            },
            {
              model: Person,
              as: 'persona',
              where: personaWhere ? personaWhere : undefined,
              required: !!personaWhere,
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
        if (userConPersona) user = userConPersona;
      } catch (personaError) {
        // La tabla personas no existe en esta instancia de BD — continuar sin ella
        if (personaError.name !== 'SequelizeDatabaseError') throw personaError;
      }
    }

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
      500,
      error.message
    );
  }
};

const me = async (req, res) => {
  try {
    // Cargar usuario con rol básico primero
    let user = await User.findByPk(req.user.id_usuario, {
      include: [
        {
          model: Role,
          as: 'rol',
          attributes: ['id_rol', 'nombre', 'descripcion'],
        },
      ],
    });

    if (!user) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    // Intentar enriquecer con persona si la tabla existe
    try {
      const userConPersona = await User.findByPk(req.user.id_usuario, {
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
      if (userConPersona) user = userConPersona;
    } catch (personaError) {
      // La tabla personas no existe en esta instancia — continuar sin ella
      if (personaError.name !== 'SequelizeDatabaseError') throw personaError;
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

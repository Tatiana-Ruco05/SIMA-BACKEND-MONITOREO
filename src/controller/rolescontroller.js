const { Role, User } = require('../models');
const { successResponse, errorResponse } = require('../helpers/response');

const getRoles = async (req, res) => {
  try {
    const roles = await Role.findAll({
      order: [['id_rol', 'ASC']],
    });

    return successResponse(res, 'Roles obtenidos correctamente', roles);
  } catch (error) {
    return errorResponse(res, 'Error al obtener roles', 500, error.message);
  }
};

const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findByPk(id);

    if (!role) {
      return errorResponse(res, 'Rol no encontrado', 404);
    }

    return successResponse(res, 'Rol obtenido correctamente', role);
  } catch (error) {
    return errorResponse(res, 'Error al obtener el rol', 500, error.message);
  }
};

const getUsersByRole = async (req, res) => {
  try {
    const { id } = req.params;

    const role = await Role.findByPk(id, {
      include: [
        {
          model: User,
          as: 'usuarios',
          attributes: ['id_usuario', 'email', 'estado', 'created_at'],
        },
      ],
      order: [[{ model: User, as: 'usuarios' }, 'id_usuario', 'ASC']],
    });

    if (!role) {
      return errorResponse(res, 'Rol no encontrado', 404);
    }

    return successResponse(res, 'Usuarios del rol obtenidos correctamente', role);
  } catch (error) {
    return errorResponse(res, 'Error al obtener usuarios por rol', 500, error.message);
  }
};

const assignRoleToUser = async (req, res) => {
  try {
    const { idUsuario } = req.params;
    const { id_rol } = req.body;

    const user = await User.findByPk(idUsuario);
    if (!user) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    const role = await Role.findByPk(id_rol);
    if (!role) {
      return errorResponse(res, 'Rol no encontrado', 404);
    }

    await user.update({ id_rol });

    const updatedUser = await User.findByPk(idUsuario, {
      attributes: ['id_usuario', 'email', 'estado', 'id_rol'],
      include: [
        {
          model: Role,
          as: 'rol',
          attributes: ['id_rol', 'nombre', 'descripcion'],
        },
      ],
    });

    return successResponse(res, 'Rol asignado correctamente al usuario', updatedUser);
  } catch (error) {
    return errorResponse(res, 'Error al asignar rol al usuario', 500, error.message);
  }
};

module.exports = {
  getRoles,
  getRoleById,
  getUsersByRole,
  assignRoleToUser,
};
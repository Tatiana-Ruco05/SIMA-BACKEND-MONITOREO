const { User, Role, Instructor, Apprentice } = require('../models');
const { successResponse, errorResponse } = require('../helpers/response');

const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id_usuario', 'email', 'estado', 'created_at'],
      include: [
        {
          model: Role,
          as: 'rol',
          attributes: ['id_rol', 'nombre'],
        },
        {
          model: Instructor,
          as: 'instructor',
          required: false,
          attributes: ['id_instructor', 'estado'],
        },
        {
          model: Apprentice,
          as: 'aprendiz',
          required: false,
          attributes: ['id_aprendiz', 'estado', 'estado_formativo'],
        },
      ],
      order: [['id_usuario', 'ASC']],
    });

    return successResponse(res, 'Usuarios obtenidos correctamente', users);
  } catch (error) {
    return errorResponse(res, 'Error al obtener usuarios', 500, error.message);
  }
};

module.exports = {
  getUsers,
};
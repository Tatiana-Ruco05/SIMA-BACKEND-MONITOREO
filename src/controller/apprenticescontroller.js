const { Apprentice, User, Role } = require('../models');
const { successResponse, errorResponse } = require('../helpers/response');

const getApprentices = async (req, res) => {
  try {
    const apprentices = await Apprentice.findAll({
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['id_usuario', 'email', 'estado'],
          include: [
            {
              model: Role,
              as: 'rol',
              attributes: ['id_rol', 'nombre'],
            },
          ],
        },
      ],
      order: [['id_aprendiz', 'ASC']],
    });

    return successResponse(res, 'Aprendices obtenidos correctamente', apprentices);
  } catch (error) {
    return errorResponse(res, 'Error al obtener aprendices', 500, error.message);
  }
};

module.exports = {
  getApprentices,
};
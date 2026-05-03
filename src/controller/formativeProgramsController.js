const { FormativeProgram, EducationalArea } = require('../models');
const { successResponse, errorResponse } = require('../helpers/response');

// ─── GET /api/formative-programs/area/:idArea ────────────────────────────────
// Obtiene programas de formación de un área específica (para poblar selects)

const getProgramsByArea = async (req, res) => {
  try {
    const { idArea } = req.params;

// Validar que el área exista
    const area = await EducationalArea.findByPk(idArea);
    if (!area) {
      return errorResponse(res, 'Área de formación no encontrada', 404);
    }

    const programs = await FormativeProgram.findAll({
      where: { id_area: idArea },
      attributes: ['id_programa', 'nombre_programa'],
      include: [
        {
          model: EducationalArea,
          as: 'area',
          attributes: ['id_area', 'nombre_area'],
        },
      ],
      order: [['nombre_programa', 'ASC']],
    });

    return successResponse(res, 'Programas obtenidos correctamente', programs);
  } catch (error) {
    return errorResponse(res, 'Error al obtener programas de formación', 500, error.message);
  }
};

module.exports = {
  getProgramsByArea,
};

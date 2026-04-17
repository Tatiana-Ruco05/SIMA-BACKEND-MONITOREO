const { FormativeProgram, EducationalArea } = require('../models');
const { successResponse, errorResponse } = require('../helpers/response');

const getProgramsByArea = async (req, res) => {
  try {
    const { id_area } = req.params;

    const area = await EducationalArea.findByPk(id_area);
    if (!area) {
      return errorResponse(res, 'Educational area not found', 404);
    }

    const programs = await FormativeProgram.findAll({
      where: { id_area, estado: 'ACTIVO' },
      order: [['nombre_programa', 'ASC']],
    });

    return successResponse(res, 'Formative programs retrieved successfully', programs);
  } catch (error) {
    return errorResponse(res, 'Error retrieving formative programs', 500, error.message);
  }
};

module.exports = {
  getProgramsByArea,
};

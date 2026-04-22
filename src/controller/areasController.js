const { EducationalArea } = require('../models');
const { successResponse, errorResponse } = require('../helpers/response');

const getAreas = async (req, res) => {
  try {
    const areas = await EducationalArea.findAll();
    return successResponse(res, 'Áreas obtenidas correctamente', areas);
  } catch (error) {
    return errorResponse(res, 'Error al obtener áreas', 500, error.message);
  }
};

module.exports = { getAreas };

const { successResponse } = require('../helpers/response');

const me = async (req, res) => {
  return successResponse(res, 'Usuario autenticado obtenido correctamente', req.user);
};

module.exports = {
  me,
};
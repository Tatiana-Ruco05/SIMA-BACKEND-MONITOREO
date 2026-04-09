const { errorResponse } = require('../helpers/response');

const notImplemented = async (req, res) => {
  return errorResponse(
    res,
    'Este módulo no está disponible en esta versión del proyecto. El control de acceso se gestiona por roles.',
    501
  );
};

module.exports = {
  notImplemented,
};
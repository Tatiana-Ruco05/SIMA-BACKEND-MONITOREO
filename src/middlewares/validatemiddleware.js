const validateRequiredFields = (fields = []) => {
  return (req, res, next) => {
    const missingFields = fields.filter((field) => {
      return req.body[field] === undefined || req.body[field] === null || req.body[field] === '';
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        ok: false,
        message: 'Faltan campos obligatorios',
        errors: missingFields,
      });
    }

    next();
  };
};

module.exports = {
  validateRequiredFields,
};
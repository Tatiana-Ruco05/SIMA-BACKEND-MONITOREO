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


/**
 * GET /api/apprentices/fichas-activas
 * Devuelve la lista de fichas con estado ACTIVO (útil para poblar formularios)
 */
const getFichasActivas = async (_req, res) => {
  try {
    const fichas = await Group.findAll({
      where: { estado: 'ACTIVO' },
      order: [['numero_ficha', 'ASC']]
    });

    return successResponse(res, 'Fichas activas obtenidas correctamente', fichas);
  } catch (error) {
    return errorResponse(res, 'Error al consultar fichas activas', 500, error.message);
  }
};

/**
 * GET /api/apprentices/listado
 * Devuelve la lista de aprendices con datos demográficos y ficha asociada
 */
const getAprendicesListado = async (_req, res) => {
  try {
    const [filas] = await sequelize.query(
      `SELECT
         p.id_persona,
         p.tipo_documento,
         p.numero_documento,
         p.nombres,
         p.apellidos,
         u.email,
         p.telefono,
         a.estado_formativo,
         g.numero_ficha
       FROM personas p
       INNER JOIN usuarios u ON p.id_usuario = u.id_usuario
       INNER JOIN aprendices a ON a.id_usuario = u.id_usuario
       LEFT JOIN aprendiz_grupo ag ON ag.id_aprendiz = a.id_aprendiz AND ag.estado = 'ACTIVO'
       LEFT JOIN grupos_formativos g ON g.id_grupo = ag.id_grupo
       ORDER BY p.id_persona DESC`
    );

    return successResponse(res, 'Listado de aprendices obtenido correctamente', filas);
  } catch (error) {
    return errorResponse(res, 'Error al consultar listado de aprendices', 500, error.message);
  }
};

/**
 * POST /api/apprentices/registro
 * Registra un aprendiz individualmente mediante JSON
 */
const registrarIndividual = async (req, res) => {
  const erroresValidacion = validationResult(req);
  if (!erroresValidacion.isEmpty()) {
    return errorResponse(res, 'Datos inválidos', 400,
      erroresValidacion.array().map((e) => ({ campo: e.path, mensaje: e.msg }))
    );
  }

  const datos = {
    tipo_documento:   String(req.body.tipo_documento).trim().toUpperCase(),
    numero_documento: String(req.body.numero_documento).trim(),
    nombres:          String(req.body.nombres).trim(),
    apellidos:        String(req.body.apellidos).trim(),
    email:            String(req.body.email).trim().toLowerCase(),
    telefono:         req.body.telefono ? String(req.body.telefono).trim() : null,
    numero_ficha:     String(req.body.numero_ficha).trim(),
  };

  try {
    const resultado = await apprenticesService.registrarAprendiz(datos);
    return successResponse(res, resultado.mensaje, resultado, 201);
  } catch (err) {
    console.error('registrarIndividual error:', err);

    if (err.status) {
      return errorResponse(res, err.message, err.status);
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
      return errorResponse(res, 'Ya existe un usuario con ese email o número de documento', 409);
    }

    return errorResponse(res, 'Error interno al registrar el aprendiz', 500);
  }
};

/**
 * POST /api/apprentices/registro-masivo
 * Recibe un archivo .xlsx y registra los aprendices fila por fila
 */
const registrarMasivo = async (req, res) => {
  if (!req.file) {
    return errorResponse(res, "Se requiere un archivo Excel. Envía el campo 'archivo' como form-data.", 400);
  }

  try {
    const resultado = await apprenticesService.procesarRegistroMasivo(req.file.buffer);

    const status = resultado.exitosos > 0 ? 207 : 400;
    return res.status(status).json({
      ok: resultado.exitosos > 0,
      message: `Procesamiento completado: ${resultado.exitosos} exitosos, ${resultado.fallidos} fallidos`,
      data: {
        total: resultado.total,
        exitosos: resultado.exitosos,
        fallidos: resultado.fallidos,
        resultados: resultado.resultados,
      },
    });

  } catch (err) {
    console.error('Error al procesar registro masivo:', err);
    const status = err.status || 500;
    return errorResponse(res, err.message || 'Error interno al procesar el archivo Excel', status);
  }
};

module.exports = {
  getApprentices,
  getFichasActivas,
  getAprendicesListado,
  registrarIndividual,
  registrarMasivo,
};
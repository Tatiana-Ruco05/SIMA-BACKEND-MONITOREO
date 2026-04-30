const { Op } = require('sequelize');
const exceljs = require('exceljs');
const { validationResult } = require('express-validator');
const { body } = require('express-validator');
const {
  sequelize,
  Apprentice,
  ApprenticeGroup,
  CoordinatorArea,
  EducationalArea,
  Group,
  Instructor,
  Person,
  Role,
  User,
} = require('../models');
const { hashPassword } = require('../helpers/bcrypt');
const { successResponse, errorResponse } = require('../helpers/response');
const { getPagination } = require('../helpers/pagination');

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS INTERNOS
// ═══════════════════════════════════════════════════════════════════════════════

function crearError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function getTextValue(row, colIndex) {
  if (!colIndex) return '';
  const cell = row.getCell(colIndex);
  return cell && cell.value !== null && cell.value !== undefined
    ? String(cell.value).trim()
    : '';
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE NEGOCIO INTERNAS (registro)
// ═══════════════════════════════════════════════════════════════════════════════

async function obtenerGrupoActivoPorFicha(numero_ficha, transaction) {
  return Group.findOne({
    where: {
      numero_ficha,
      estado: 'ACTIVO',
    },
    transaction,
  });
}

async function validarPermisoSobreFicha(req, grupo, transaction) {
  if (req.user.rol === 'coordinador') {
    return true;
  }

  if (req.user.rol !== 'instructor') {
    throw crearError('No tienes permisos para registrar aprendices', 403);
  }

  let idInstructor = req.user.id_instructor;

  if (!idInstructor) {
    const instructor = await Instructor.findOne({
      where: {
        id_usuario: req.user.id_usuario,
        estado: 'ACTIVO',
      },
      attributes: ['id_instructor'],
      transaction,
    });

    if (!instructor) {
      throw crearError('No existe perfil activo de instructor', 403);
    }

    idInstructor = instructor.id_instructor;
  }

  if (Number(grupo.id_instructor_lider) !== Number(idInstructor)) {
    throw crearError(
      'Solo el coordinador o el instructor líder de la ficha puede registrar aprendices en esta ficha',
      403
    );
  }

  return true;
}

async function obtenerRolAprendiz(transaction) {
  return Role.findOne({
    where: { nombre: 'aprendiz' },
    transaction,
  });
}

async function registrarAprendizInterno(datos, req, transaction) {
  const {
    tipo_documento,
    numero_documento,
    nombres,
    apellidos,
    email,
    telefono,
    numero_ficha,
  } = datos;

  const grupo = await obtenerGrupoActivoPorFicha(numero_ficha, transaction);

  if (!grupo) {
    throw crearError(
      `La ficha '${numero_ficha}' no existe o no tiene estado ACTIVO`,
      400
    );
  }

  await validarPermisoSobreFicha(req, grupo, transaction);

  const rolAprendiz = await obtenerRolAprendiz(transaction);

  if (!rolAprendiz) {
    throw crearError("El rol 'aprendiz' no está configurado en el sistema", 500);
  }

  const personaExistente = await Person.findOne({
    where: { numero_documento },
    transaction,
  });

  let usuario = null;
  let aprendiz = null;
  let accion = 'registrado exitosamente';

  if (personaExistente) {
    usuario = await User.findByPk(personaExistente.id_usuario, {
      include: [
        {
          model: Role,
          as: 'rol',
          attributes: ['id_rol', 'nombre'],
        },
      ],
      transaction,
    });

    if (!usuario) {
      throw crearError(
        `El documento ${numero_documento} existe en personas pero no tiene usuario asociado`,
        500
      );
    }

    if (usuario.rol?.nombre !== 'aprendiz') {
      throw crearError(
        `El número de documento ${numero_documento} ya está asociado a un usuario con rol '${usuario.rol?.nombre || 'desconocido'}' y no puede registrarse como aprendiz`,
        409
      );
    }

    aprendiz = await Apprentice.findOne({
      where: { id_usuario: usuario.id_usuario },
      transaction,
    });

    if (!aprendiz) {
      throw crearError(
        `El usuario con documento ${numero_documento} tiene rol aprendiz pero no cuenta con perfil en aprendices`,
        500
      );
    }

    if (aprendiz.estado !== 'ACTIVO') {
      await aprendiz.update({ estado: 'ACTIVO' }, { transaction });
    }

    const matriculaExistente = await ApprenticeGroup.findOne({
      where: {
        id_aprendiz: aprendiz.id_aprendiz,
        id_grupo: grupo.id_grupo,
      },
      transaction,
    });

    if (matriculaExistente) {
      if (matriculaExistente.estado === 'ACTIVO') {
        throw crearError(
          `El documento ${numero_documento} ya está matriculado en la ficha ${numero_ficha}`,
          409
        );
      }

      await matriculaExistente.update({ estado: 'ACTIVO' }, { transaction });

      return {
        success: true,
        numero_documento,
        mensaje: 'Matrícula reactivada correctamente',
        accion: 'reactivacion_matricula',
        aprendiz: {
          id_aprendiz: aprendiz.id_aprendiz,
          id_usuario: usuario.id_usuario,
        },
        grupo: {
          id_grupo: grupo.id_grupo,
          numero_ficha: grupo.numero_ficha,
        },
      };
    }

    await ApprenticeGroup.create(
      {
        id_aprendiz: aprendiz.id_aprendiz,
        id_grupo: grupo.id_grupo,
        estado: 'ACTIVO',
      },
      { transaction }
    );

    accion = 'matriculado en nueva ficha';
  } else {
    const emailExistente = await User.findOne({
      where: { email },
      transaction,
    });

    if (emailExistente) {
      throw crearError(
        `El correo ${email} ya está registrado para otro usuario`,
        409
      );
    }

    const passwordHash = await hashPassword(numero_documento);

    usuario = await User.create(
      {
        email,
        password: passwordHash,
        id_rol: rolAprendiz.id_rol,
        estado: 'ACTIVO',
      },
      { transaction }
    );

    await Person.create(
      {
        id_usuario: usuario.id_usuario,
        tipo_documento,
        numero_documento,
        nombres,
        apellidos,
        telefono: telefono || null,
      },
      { transaction }
    );

    aprendiz = await Apprentice.create(
      {
        id_usuario: usuario.id_usuario,
        estado_formativo: 'EN_FORMACION',
        estado: 'ACTIVO',
      },
      { transaction }
    );

    await ApprenticeGroup.create(
      {
        id_aprendiz: aprendiz.id_aprendiz,
        id_grupo: grupo.id_grupo,
        estado: 'ACTIVO',
      },
      { transaction }
    );
  }

  return {
    success: true,
    numero_documento,
    mensaje: accion === 'registrado exitosamente'
      ? 'Aprendiz registrado exitosamente'
      : 'Aprendiz matriculado en una nueva ficha',
    accion,
    aprendiz: {
      id_aprendiz: aprendiz.id_aprendiz,
      id_usuario: usuario.id_usuario,
    },
    grupo: {
      id_grupo: grupo.id_grupo,
      numero_ficha: grupo.numero_ficha,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINTS DE CONSULTA
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/apprentices/grupo/:idGrupo ─────────────────────────────────────
// Consulta operativa: aprendices de un grupo específico (paginado + filtros)

const getApprenticesByGroup = async (req, res) => {
  try {
    const { idGrupo } = req.params;
    const { estado, estado_formativo, page, limit, documento, nombre } = req.query;
    const { limit: take, offset } = getPagination(page, limit);

    const grupo = await Group.findByPk(idGrupo, {
      attributes: [
        'id_grupo',
        'numero_ficha',
        'programa',
        'jornada',
        'estado',
        'id_instructor_lider',
      ],
    });

    if (!grupo) {
      return errorResponse(res, 'Grupo formativo no encontrado', 404);
    }

    // Control de acceso: instructor solo ve sus grupos
    if (req.user.rol === 'instructor') {
      let idInstructor = req.user.id_instructor;

      if (!idInstructor) {
        const instructor = await Instructor.findOne({
          where: { id_usuario: req.user.id_usuario, estado: 'ACTIVO' },
          attributes: ['id_instructor'],
        });

        if (!instructor) {
          return errorResponse(res, 'No existe perfil activo de instructor', 403);
        }

        idInstructor = instructor.id_instructor;
      }

      if (Number(grupo.id_instructor_lider) !== Number(idInstructor)) {
        return errorResponse(
          res,
          'No tienes permisos para consultar los aprendices de este grupo',
          403
        );
      }
    }

    const whereAprendiz = {};
    if (estado) whereAprendiz.estado = estado;
    if (estado_formativo) whereAprendiz.estado_formativo = estado_formativo;

    const wherePersona = {};
    if (documento) {
      wherePersona.numero_documento = { [Op.like]: `%${documento}%` };
    }

    if (nombre) {
      wherePersona[Op.or] = [
        { nombres: { [Op.like]: `%${nombre}%` } },
        { apellidos: { [Op.like]: `%${nombre}%` } },
      ];
    }

    const { count, rows } = await Apprentice.findAndCountAll({
      where: whereAprendiz,
      include: [
        {
          model: ApprenticeGroup,
          as: 'aprendiz_grupos',
          required: true,
          where: {
            id_grupo: idGrupo,
            estado: 'ACTIVO',
          },
          attributes: ['id_aprendiz_grupo', 'estado'],
        },
        {
          model: User,
          as: 'usuario',
          attributes: ['id_usuario', 'email', 'estado'],
          include: [
            {
              model: Person,
              as: 'persona',
              attributes: [
                'id_persona',
                'tipo_documento',
                'numero_documento',
                'nombres',
                'apellidos',
                'telefono',
              ],
              where: Object.keys(wherePersona).length ? wherePersona : undefined,
              required: !!Object.keys(wherePersona).length,
            },
          ],
        },
      ],
      order: [['id_aprendiz', 'DESC']],
      limit: take,
      offset,
      distinct: true,
    });

    return successResponse(res, 'Aprendices del grupo obtenidos correctamente', {
      total: count,
      pagina: Number(page) || 1,
      grupo,
      aprendices: rows,
    });
  } catch (error) {
    return errorResponse(res, 'Error al consultar aprendices del grupo', 500, error.message);
  }
};

// ─── GET /api/apprentices/listado ────────────────────────────────────────────
// Consulta administrativa global (paginado + filtros dinámicos)

const getAprendicesListado = async (req, res) => {
  try {
    const {
      page,
      limit,
      estado,
      estado_formativo,
      numero_ficha,
      documento,
      nombre,
      anio,
      programa,
      id_area,
    } = req.query;

    const { limit: take, offset } = getPagination(page, limit);

    const whereAprendiz = {};
    if (estado) whereAprendiz.estado = estado;
    if (estado_formativo) whereAprendiz.estado_formativo = estado_formativo;

    const wherePersona = {};
    if (documento) {
      wherePersona.numero_documento = { [Op.like]: `%${documento}%` };
    }

    if (nombre) {
      wherePersona[Op.or] = [
        { nombres: { [Op.like]: `%${nombre}%` } },
        { apellidos: { [Op.like]: `%${nombre}%` } },
      ];
    }

    const whereGrupo = {};
    if (numero_ficha) whereGrupo.numero_ficha = numero_ficha;
    if (programa) whereGrupo.programa = { [Op.like]: `%${programa}%` };

    if (anio) {
      whereGrupo.fecha_inicio = {
        [Op.gte]: `${anio}-01-01`,
        [Op.lte]: `${anio}-12-31`,
      };
    }

    // Filtro por áreas del coordinador
    if (req.user.rol === 'coordinador') {
      const areasAsignadas = await CoordinatorArea.findAll({
        where: {
          id_usuario: req.user.id_usuario,
          estado: 'ACTIVO',
        },
        attributes: ['id_area'],
      });

      const areaIds = areasAsignadas.map((item) => item.id_area);

      // Si el coordinador no tiene áreas asignadas, no debe ver aprendices
      if (!areaIds.length) {
        return successResponse(res, 'Listado de aprendices obtenido correctamente', {
          total: 0,
          pagina: Number(page) || 1,
          aprendices: [],
        });
      }

      // Si viene id_area, además debe pertenecer a sus áreas
      if (id_area) {
        if (!areaIds.includes(Number(id_area))) {
          return errorResponse(
            res,
            'No tienes permisos para consultar aprendices de esa área',
            403
          );
        }
        whereGrupo.id_area = Number(id_area);
      } else {
        whereGrupo.id_area = { [Op.in]: areaIds };
      }
    } else if (id_area) {
      // Por seguridad, si otro rol entra aquí y manda id_area
      whereGrupo.id_area = Number(id_area);
    }

    const includeGrupo = {
      model: ApprenticeGroup,
      as: 'aprendiz_grupos',
      required: true,
      where: {
        estado: 'ACTIVO',
      },
      attributes: ['id_aprendiz_grupo', 'estado'],
      include: [
        {
          model: Group,
          as: 'grupo',
          attributes: [
            'id_grupo',
            'numero_ficha',
            'programa',
            'jornada',
            'estado',
            'fecha_inicio',
            'fecha_fin',
            'id_area',
          ],
          where: Object.keys(whereGrupo).length ? whereGrupo : undefined,
          required: true,
          include: [
            {
              model: EducationalArea,
              as: 'area',
              attributes: ['id_area', 'nombre_area'],
            },
          ],
        },
      ],
    };

    const { count, rows } = await Apprentice.findAndCountAll({
      where: whereAprendiz,
      include: [
        includeGrupo,
        {
          model: User,
          as: 'usuario',
          attributes: ['id_usuario', 'email', 'estado'],
          include: [
            {
              model: Person,
              as: 'persona',
              attributes: [
                'id_persona',
                'tipo_documento',
                'numero_documento',
                'nombres',
                'apellidos',
                'telefono',
              ],
              where: Object.keys(wherePersona).length ? wherePersona : undefined,
              required: !!Object.keys(wherePersona).length,
            },
          ],
        },
      ],
      order: [['id_aprendiz', 'DESC']],
      limit: take,
      offset,
      distinct: true,
    });

    return successResponse(res, 'Listado de aprendices obtenido correctamente', {
      total: count,
      pagina: Number(page) || 1,
      aprendices: rows,
    });
  } catch (error) {
    return errorResponse(res, 'Error al consultar listado de aprendices', 500, error.message);
  }
};

// ─── GET /api/apprentices/fichas-activas ─────────────────────────────────────
// Fichas con estado ACTIVO (para poblar select del formulario de registro)

const getFichasActivas = async (_req, res) => {
  try {
    const fichas = await Group.findAll({
      where: { estado: 'ACTIVO' },
      attributes: [
        'id_grupo',
        'numero_ficha',
        'programa',
        'jornada',
        'fecha_inicio',
        'fecha_fin',
        'id_area',
        'id_instructor_lider',
      ],
      order: [['numero_ficha', 'ASC']],
    });

    return successResponse(res, 'Fichas activas obtenidas correctamente', fichas);
  } catch (error) {
    return errorResponse(res, 'Error al consultar fichas activas', 500, error.message);
  }
};

// ─── GET /api/apprentices/:id ────────────────────────────────────────────────
// Detalle individual de un aprendiz con historial de matrículas

const getApprenticeById = async (req, res) => {
  try {
    const { id } = req.params;

    const aprendiz = await Apprentice.findByPk(id, {
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['id_usuario', 'email', 'estado'],
          include: [
            {
              model: Person,
              as: 'persona',
              attributes: [
                'id_persona',
                'tipo_documento',
                'numero_documento',
                'nombres',
                'apellidos',
                'telefono',
              ],
            },
          ],
        },
        {
          model: ApprenticeGroup,
          as: 'aprendiz_grupos',
          required: false,
          attributes: ['id_aprendiz_grupo', 'estado'],
          include: [
            {
              model: Group,
              as: 'grupo',
              attributes: [
                'id_grupo',
                'numero_ficha',
                'programa',
                'jornada',
                'estado',
                'fecha_inicio',
                'fecha_fin',
              ],
            },
          ],
        },
      ],
    });

    if (!aprendiz) {
      return errorResponse(res, 'Aprendiz no encontrado', 404);
    }

    return successResponse(res, 'Aprendiz obtenido correctamente', aprendiz);
  } catch (error) {
    return errorResponse(res, 'Error al obtener aprendiz', 500, error.message);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINTS DE REGISTRO
// ═══════════════════════════════════════════════════════════════════════════════

// ─── POST /api/apprentices/registro ──────────────────────────────────────────

const registrarIndividual = async (req, res) => {
  const erroresValidacion = validationResult(req);

  if (!erroresValidacion.isEmpty()) {
    return errorResponse(
      res,
      'Datos inválidos',
      400,
      erroresValidacion.array().map((e) => ({
        campo: e.path,
        mensaje: e.msg,
      }))
    );
  }

  const transaction = await sequelize.transaction();

  try {
    const datos = {
      tipo_documento: String(req.body.tipo_documento).trim().toUpperCase(),
      numero_documento: String(req.body.numero_documento).trim(),
      nombres: String(req.body.nombres).trim(),
      apellidos: String(req.body.apellidos).trim(),
      email: String(req.body.email).trim().toLowerCase(),
      telefono: req.body.telefono ? String(req.body.telefono).trim() : null,
      numero_ficha: String(req.body.numero_ficha).trim(),
    };

    const resultado = await registrarAprendizInterno(datos, req, transaction);

    await transaction.commit();

    return successResponse(res, resultado.mensaje, resultado, 201);
  } catch (err) {
    await transaction.rollback();

    if (err.status) {
      return errorResponse(res, err.message, err.status);
    }

    if (err.name === 'SequelizeUniqueConstraintError') {
      return errorResponse(
        res,
        'Ya existe un usuario con ese email o número de documento',
        409
      );
    }

    return errorResponse(res, 'Error interno al registrar el aprendiz', 500, err.message);
  }
};

// ─── POST /api/apprentices/registro-masivo ───────────────────────────────────

const registrarMasivo = async (req, res) => {
  if (!req.file) {
    return errorResponse(
      res,
      "Se requiere un archivo Excel. Envía el campo 'archivo' como form-data.",
      400
    );
  }

  try {
    const workbook = new exceljs.Workbook();
    await workbook.xlsx.load(req.file.buffer);

    const worksheet = workbook.worksheets[0];

    if (!worksheet) {
      return errorResponse(res, 'El archivo Excel está vacío o es inválido', 400);
    }

    const headerRow = worksheet.getRow(1);
    const headers = {};

    headerRow.eachCell((cell, colNumber) => {
      headers[String(cell.value).toLowerCase().trim()] = colNumber;
    });

    const expectedHeaders = [
      'tipo_documento',
      'numero_documento',
      'nombres',
      'apellidos',
      'email',
      'numero_ficha',
    ];

    const missingHeaders = expectedHeaders.filter((h) => !headers[h]);

    if (missingHeaders.length > 0) {
      return errorResponse(
        res,
        `Faltan columnas requeridas en el Excel: ${missingHeaders.join(', ')}`,
        400
      );
    }

    const resultados = [];
    let exitosos = 0;
    let fallidos = 0;

    for (let i = 2; i <= worksheet.rowCount; i += 1) {
      const row = worksheet.getRow(i);

      if (!row.hasValues) continue;

      const datos = {
        tipo_documento: getTextValue(row, headers.tipo_documento).toUpperCase(),
        numero_documento: getTextValue(row, headers.numero_documento),
        nombres: getTextValue(row, headers.nombres),
        apellidos: getTextValue(row, headers.apellidos),
        email: getTextValue(row, headers.email).toLowerCase(),
        telefono: getTextValue(row, headers.telefono) || null,
        numero_ficha: getTextValue(row, headers.numero_ficha),
      };

      if (
        !datos.tipo_documento ||
        !datos.numero_documento ||
        !datos.nombres ||
        !datos.apellidos ||
        !datos.email ||
        !datos.numero_ficha
      ) {
        resultados.push({
          fila: i,
          ok: false,
          numero_documento: datos.numero_documento || null,
          error: 'Datos obligatorios faltantes en la fila',
        });
        fallidos += 1;
        continue;
      }

      const transaction = await sequelize.transaction();

      try {
        const resultado = await registrarAprendizInterno(datos, req, transaction);
        await transaction.commit();

        resultados.push({
          fila: i,
          ok: true,
          numero_documento: datos.numero_documento,
          mensaje: resultado.mensaje,
        });
        exitosos += 1;
      } catch (err) {
        await transaction.rollback();

        resultados.push({
          fila: i,
          ok: false,
          numero_documento: datos.numero_documento,
          error: err.message || 'Error interno al registrar la fila',
        });
        fallidos += 1;
      }
    }

    const totalProcesados = exitosos + fallidos;
    const mensaje = `Procesamiento completado: ${exitosos} exitosos, ${fallidos} fallidos de ${totalProcesados}`;
    const data = {
      total: totalProcesados,
      exitosos,
      fallidos,
      resultados,
    };

    if (exitosos > 0) {
      return successResponse(res, mensaje, data, 207);
    }

    return errorResponse(res, mensaje, 400, data.resultados);
  } catch (error) {
    return errorResponse(
      res,
      'Error interno al procesar el archivo Excel',
      500,
      error.message
    );
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDACIONES
// ═══════════════════════════════════════════════════════════════════════════════

const validacionesRegistro = [
  body('tipo_documento')
    .trim()
    .notEmpty()
    .withMessage('El tipo de documento es obligatorio')
    .isIn(['CC', 'TI', 'CE', 'PA', 'PEP', 'PPT'])
    .withMessage('Tipo de documento no válido. Use: CC, TI, CE, PA, PEP o PPT'),

  body('numero_documento')
    .trim()
    .notEmpty()
    .withMessage('El número de documento es obligatorio')
    .isLength({ min: 5, max: 20 })
    .withMessage('El documento debe tener entre 5 y 20 caracteres'),

  body('nombres')
    .trim()
    .notEmpty()
    .withMessage('Los nombres son obligatorios')
    .isLength({ max: 100 })
    .withMessage('Los nombres no pueden superar 100 caracteres'),

  body('apellidos')
    .trim()
    .notEmpty()
    .withMessage('Los apellidos son obligatorios')
    .isLength({ max: 100 })
    .withMessage('Los apellidos no pueden superar 100 caracteres'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('El email es obligatorio')
    .isEmail()
    .withMessage('El email no tiene un formato válido')
    .isLength({ max: 120 })
    .withMessage('El email no puede superar 120 caracteres'),

  body('telefono')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('El teléfono no puede superar 20 caracteres'),

  body('numero_ficha')
    .trim()
    .notEmpty()
    .withMessage('El número de ficha es obligatorio'),
];

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
  getApprenticesByGroup,
  getAprendicesListado,
  getFichasActivas,
  getApprenticeById,
  registrarIndividual,
  registrarMasivo,
  validacionesRegistro,
};
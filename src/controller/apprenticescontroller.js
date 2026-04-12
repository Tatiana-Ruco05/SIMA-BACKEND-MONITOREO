const exceljs = require('exceljs');
const { validationResult } = require('express-validator');
const { body } = require('express-validator');
const {
  sequelize,
  Apprentice,
  ApprenticeGroup,
  Group,
  Instructor,
  Person,
  Role,
  User,
} = require('../models');
const { hashPassword } = require('../helpers/bcrypt');
const { successResponse, errorResponse } = require('../helpers/response');

// ─── Helpers internos ───────────────────────────────────────────────────────

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

// ─── Funciones de negocio internas ──────────────────────────────────────────

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

  // 1. Validar que la ficha exista y esté activa
  const grupo = await obtenerGrupoActivoPorFicha(numero_ficha, transaction);

  if (!grupo) {
    throw crearError(
      `La ficha '${numero_ficha}' no existe o no tiene estado ACTIVO`,
      400
    );
  }

  // 2. Validar permiso sobre la ficha (coordinador o instructor líder)
  await validarPermisoSobreFicha(req, grupo, transaction);

  // 3. Obtener el rol 'aprendiz' — estricto, sin tolerancias
  const rolAprendiz = await obtenerRolAprendiz(transaction);

  if (!rolAprendiz) {
    throw crearError("El rol 'aprendiz' no está configurado en el sistema", 500);
  }

  // 4. Verificar si la persona ya existe por su documento
  const personaExistente = await Person.findOne({
    where: { numero_documento },
    transaction,
  });

  let usuario = null;
  let aprendiz = null;
  let accion = 'registrado exitosamente';

  if (personaExistente) {
    // El perfil demográfico ya existe — buscar usuario con su rol
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

    // Verificar que el usuario tenga rol de aprendiz
    if (usuario.rol?.nombre !== 'aprendiz') {
      throw crearError(
        `El número de documento ${numero_documento} ya está asociado a un usuario con rol '${usuario.rol?.nombre || 'desconocido'}' y no puede registrarse como aprendiz`,
        409
      );
    }

    // Buscar perfil de aprendiz
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

    // Reactivar perfil de aprendiz si está inactivo
    if (aprendiz.estado !== 'ACTIVO') {
      await aprendiz.update({ estado: 'ACTIVO' }, { transaction });
    }

    // Verificar matrícula existente en este grupo (manejar soft-delete)
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

      // Reactivar matrícula inactiva (soft-delete recovery)
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

    // Crear nueva matrícula para usuario existente
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
    // La persona no existe: crear todo desde cero
    // (mismo patrón que userscontroller.createUser)

    // Verificar que el email no esté en uso
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

    // Crear usuario (password = documento hasheado)
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

    // Crear persona
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

    // Crear perfil de aprendiz
    aprendiz = await Apprentice.create(
      {
        id_usuario: usuario.id_usuario,
        estado_formativo: 'EN_FORMACION',
        estado: 'ACTIVO',
      },
      { transaction }
    );

    // Crear matrícula
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

// ─── GET /api/apprentices/ ──────────────────────────────────────────────────

const getApprentices = async (_req, res) => {
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
      ],
      order: [['id_aprendiz', 'ASC']],
    });

    return successResponse(res, 'Aprendices obtenidos correctamente', apprentices);
  } catch (error) {
    return errorResponse(res, 'Error al obtener aprendices', 500, error.message);
  }
};

// ─── GET /api/apprentices/fichas-activas ─────────────────────────────────────

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

// ─── GET /api/apprentices/listado ────────────────────────────────────────────

const getAprendicesListado = async (_req, res) => {
  try {
    const apprentices = await Apprentice.findAll({
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
          where: { estado: 'ACTIVO' },
          attributes: ['id_aprendiz_grupo', 'estado'],
          include: [
            {
              model: Group,
              as: 'grupo',
              attributes: ['id_grupo', 'numero_ficha', 'programa', 'jornada', 'estado'],
            },
          ],
        },
      ],
      order: [['id_aprendiz', 'DESC']],
    });

    const filas = apprentices.map((item) => ({
      id_aprendiz: item.id_aprendiz,
      id_usuario: item.usuario?.id_usuario || null,
      tipo_documento: item.usuario?.persona?.tipo_documento || null,
      numero_documento: item.usuario?.persona?.numero_documento || null,
      nombres: item.usuario?.persona?.nombres || null,
      apellidos: item.usuario?.persona?.apellidos || null,
      email: item.usuario?.email || null,
      telefono: item.usuario?.persona?.telefono || null,
      estado_formativo: item.estado_formativo,
      fichas: (item.aprendiz_grupos || []).map((ag) => ({
        id_grupo: ag.grupo?.id_grupo || null,
        numero_ficha: ag.grupo?.numero_ficha || null,
        programa: ag.grupo?.programa || null,
        jornada: ag.grupo?.jornada || null,
        estado: ag.grupo?.estado || null,
      })),
    }));

    return successResponse(res, 'Listado de aprendices obtenido correctamente', filas);
  } catch (error) {
    return errorResponse(res, 'Error al consultar listado de aprendices', 500, error.message);
  }
};

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

    // Mapeo dinámico de cabeceras (fila 1)
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

    // Procesar fila por fila (cada una con su propia transacción)
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

      // Validar 6 campos obligatorios antes de intentar registrar
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

// ─── Validaciones reutilizables para el registro individual ─────────────────

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

module.exports = {
  getApprentices,
  getFichasActivas,
  getAprendicesListado,
  registrarIndividual,
  registrarMasivo,
  validacionesRegistro,
};
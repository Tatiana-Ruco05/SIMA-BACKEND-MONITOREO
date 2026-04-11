const { Op } = require('sequelize');
const { GrupoFormativo, AreaFormacion, AprendizGrupo, InstructorGrupo, Instructor, Apprentice } = require('../models');
const { successResponse, errorResponse } = require('../helpers/response');
const { getPagination } = require('../helpers/pagination');

const calcularFechaFin = (fechaInicio, trimestres) => {
  if (!fechaInicio || trimestres === undefined || trimestres === null) return null;

  const fecha = new Date(fechaInicio);
  fecha.setMonth(fecha.getMonth() + trimestres * 3);

  return fecha.toISOString().split('T')[0];
};

const includeRelations = [
  {
    model: AreaFormacion,
    as: 'area',
    attributes: ['id_area', 'nombre_area'],
  },
];

const getGrupos = async (req, res) => {
  try {
    const { jornada, estado, page, limit } = req.query;
    const { limit: take, offset } = getPagination(page, limit);

    const where = {};
    if (jornada) where.jornada = { [Op.like]: `%${jornada}%` };
    if (estado) where.estado = estado;

    const { count, rows } = await GrupoFormativo.findAndCountAll({
      where,
      include: includeRelations,
      order: [['id_grupo', 'DESC']],
      limit: take,
      offset,
    });

    return successResponse(res, 'Grupos formativos obtenidos correctamente', {
      total: count,
      pagina: Number(page) || 1,
      grupos: rows,
    });
  } catch (error) {
    return errorResponse(res, 'Error al obtener los grupos formativos', 500, error.message);
  }
};

const verificarNumeroFicha = async (req, res) => {
  try {
    const { numero_ficha } = req.params;

    const fichaExistente = await GrupoFormativo.findOne({
      where: { numero_ficha },
      attributes: ['id_grupo'],
    });

    return res.json({ disponible: !fichaExistente });
  } catch (error) {
    return errorResponse(res, 'Error al verificar el numero de ficha', 500, error.message);
  }
};

const getGrupoById = async (req, res) => {
  try {
    const { id } = req.params;

    const grupo = await GrupoFormativo.findByPk(id, {
      include: includeRelations,
    });

    if (!grupo) {
      return errorResponse(res, 'Grupo formativo no encontrado', 404);
    }

    return successResponse(res, 'Grupo formativo obtenido correctamente', grupo);
  } catch (error) {
    return errorResponse(res, 'Error al obtener el grupo formativo', 500, error.message);
  }
};

const createGrupo = async (req, res) => {
  try {
    const {
      numero_ficha,
      id_area,
      programa,
      jornada,
      trimestres,
      fecha_inicio,
      id_ambiente,
      id_instructor_lider,
    } = req.body;

    const trimestresNumero = Number(trimestres);
    if (!Number.isInteger(trimestresNumero) || trimestresNumero <= 0) {
      return errorResponse(res, 'El campo trimestres debe ser un entero mayor a 0', 400);
    }

    const area = await AreaFormacion.findByPk(id_area);
    if (!area) {
      return errorResponse(res, 'El area de formacion no existe', 404);
    }

    const fichaExistente = await GrupoFormativo.findOne({ where: { numero_ficha } });
    if (fichaExistente) {
      return errorResponse(
        res,
        `El numero de ficha "${numero_ficha}" ya esta registrado en el sistema`,
        409
      );
    }

    const fechaInicioFinal = fecha_inicio || new Date().toISOString().split('T')[0];
    const fecha_fin = calcularFechaFin(fechaInicioFinal, trimestresNumero);
    const nuevoGrupo = await GrupoFormativo.create({
      numero_ficha,
      id_area,
      programa,
      jornada,
      fecha_inicio: fechaInicioFinal,
      fecha_fin,
      id_ambiente: id_ambiente || null,
      id_instructor_lider: id_instructor_lider || null,
      estado: 'ACTIVO',
      trimestres: trimestresNumero,
    });

    const grupoCreado = await GrupoFormativo.findByPk(nuevoGrupo.id_grupo, {
      include: includeRelations,
    });

    return successResponse(res, 'Grupo formativo registrado correctamente', grupoCreado, 201);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return errorResponse(res, 'El numero de ficha ya existe en el sistema', 409, error.message);
    }

    return errorResponse(res, 'Error al registrar el grupo formativo', 500, error.message);
  }
};

const updateGrupo = async (req, res) => {
  try {
    const { id } = req.params;
    const { numero_ficha, id_area, programa, jornada, trimestres, fecha_inicio, id_ambiente, id_instructor_lider } = req.body;

    const grupo = await GrupoFormativo.findByPk(id);
    if (!grupo) {
      return errorResponse(res, 'Grupo formativo no encontrado', 404);
    }

    if (numero_ficha && numero_ficha !== grupo.numero_ficha) {
      const fichaExistente = await GrupoFormativo.findOne({
        where: { numero_ficha, id_grupo: { [Op.ne]: id } },
      });
      if (fichaExistente) {
        return errorResponse(
          res,
          `El numero de ficha "${numero_ficha}" ya pertenece a otro grupo`,
          409
        );
      }
    }

    if (id_area) {
      const area = await AreaFormacion.findByPk(id_area);
      if (!area) return errorResponse(res, 'El area de formacion no existe', 404);
    }

    const nuevosTrimestres = trimestres !== undefined ? Number(trimestres) : null;
    if (nuevosTrimestres !== null && (!Number.isInteger(nuevosTrimestres) || nuevosTrimestres <= 0)) {
      return errorResponse(res, 'El campo trimestres debe ser un entero mayor a 0', 400);
    }

    const fechaInicioFinal = fecha_inicio !== undefined ? fecha_inicio : grupo.fecha_inicio;
    const fechaFinActualizada = nuevosTrimestres !== null ? calcularFechaFin(fechaInicioFinal, nuevosTrimestres) : grupo.fecha_fin;

    await grupo.update({
      ...(numero_ficha !== undefined && { numero_ficha }),
      ...(id_area !== undefined && { id_area }),
      ...(programa !== undefined && { programa }),
      ...(jornada !== undefined && { jornada }),
      ...(fecha_inicio !== undefined && { fecha_inicio: fecha_inicio }),
      ...(id_ambiente !== undefined && { id_ambiente: id_ambiente || null }),
      ...(id_instructor_lider !== undefined && { id_instructor_lider: id_instructor_lider || null }),
      ...(nuevosTrimestres !== null && { trimestres: nuevosTrimestres }),
      fecha_fin: fechaFinActualizada,
    });

    const grupoActualizado = await GrupoFormativo.findByPk(id, {
      include: includeRelations,
    });

    return successResponse(res, 'Grupo formativo actualizado correctamente', grupoActualizado);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return errorResponse(res, 'El numero de ficha ya existe en el sistema', 409, error.message);
    }
    return errorResponse(res, 'Error al actualizar el grupo formativo', 500, error.message);
  }
};

const changeEstadoGrupo = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const estadosPermitidos = ['ACTIVO', 'CERRADO', 'SUSPENDIDO'];
    if (!estadosPermitidos.includes(estado)) {
      return errorResponse(
        res,
        `Estado invalido. Los estados permitidos son: ${estadosPermitidos.join(', ')}`,
        400
      );
    }

    const grupo = await GrupoFormativo.findByPk(id);
    if (!grupo) {
      return errorResponse(res, 'Grupo formativo no encontrado', 404);
    }

    await grupo.update({ estado });

    return successResponse(res, `Estado del grupo actualizado a "${estado}"`, {
      id_grupo: grupo.id_grupo,
      numero_ficha: grupo.numero_ficha,
      estado: grupo.estado,
    });
  } catch (error) {
    return errorResponse(res, 'Error al cambiar el estado del grupo', 500, error.message);
  }
};

const getAreasFormacion = async (req, res) => {
  try {
    const areas = await AreaFormacion.findAll({
      order: [['nombre_area', 'ASC']],
    });

    return successResponse(res, 'Areas de formacion obtenidas correctamente', areas);
  } catch (error) {
    return errorResponse(res, 'Error al obtener las areas de formacion', 500, error.message);
  }
};

const asignarAprendiz = async (req, res) => {
  try {
    const { id } = req.params;
    const { id_aprendiz } = req.body;

    const grupo = await GrupoFormativo.findByPk(id);
    if (!grupo) return errorResponse(res, 'Grupo formativo no encontrado', 404);

    const aprendiz = await Apprentice.findByPk(id_aprendiz);
    if (!aprendiz) return errorResponse(res, 'Aprendiz no encontrado', 404);

    const [relacion, created] = await AprendizGrupo.findOrCreate({
      where: { id_grupo: id, id_aprendiz: id_aprendiz },
      defaults: { estado: 'ACTIVO' }
    });

    if (!created && relacion.estado === 'INACTIVO') {
      await relacion.update({ estado: 'ACTIVO' });
    } else if (!created) {
      return errorResponse(res, 'El aprendiz ya está activo en este grupo', 409);
    }

    return successResponse(res, 'Aprendiz vinculado exitosamente', relacion, 201);
  } catch (error) {
    return errorResponse(res, 'Error al asignar aprendiz al grupo', 500, error.message);
  }
};

const retirarAprendiz = async (req, res) => {
  try {
    const { id, id_aprendiz } = req.params;

    const relacion = await AprendizGrupo.findOne({
      where: { id_grupo: id, id_aprendiz: id_aprendiz }
    });

    if (!relacion || relacion.estado === 'INACTIVO') {
      return errorResponse(res, 'El aprendiz no está activo en este grupo', 404);
    }

    await relacion.update({ estado: 'INACTIVO' });

    return successResponse(res, 'Aprendiz retirado del grupo exitosamente', null);
  } catch (error) {
    return errorResponse(res, 'Error al retirar aprendiz del grupo', 500, error.message);
  }
};

const getGruposInstructor = async (req, res) => {
  try {
    // id_instructor ya viene resuelto del authMiddleware
    const id_instructor = req.user.id_instructor;

    if (!id_instructor) {
      return errorResponse(res, 'El usuario no tiene perfil de instructor activo', 403);
    }

    const gruposLider = await GrupoFormativo.findAll({
      where: { id_instructor_lider: id_instructor },
      include: includeRelations,
    });

    const asignados = await GrupoFormativo.findAll({
      include: [
        ...includeRelations,
        {
          model: Instructor,
          as: 'instructores',
          where: { id_instructor },
          through: { where: { estado: 'ACTIVO' } },
        },
      ],
    });

    // Combinar y eliminar duplicados
    const map = new Map();
    gruposLider.forEach((g) => map.set(g.id_grupo, g));
    asignados.forEach((g) => map.set(g.id_grupo, g));

    return successResponse(res, 'Grupos obtenidos correctamente', Array.from(map.values()));
  } catch (error) {
    return errorResponse(res, 'Error al obtener los grupos del instructor', 500, error.message);
  }
};

const getMisGruposAprendiz = async (req, res) => {
  try {
    // id_aprendiz ya viene resuelto del authMiddleware
    const id_aprendiz = req.user.id_aprendiz;

    if (!id_aprendiz) {
      return errorResponse(res, 'El usuario no tiene perfil de aprendiz activo', 403);
    }

    const misGrupos = await GrupoFormativo.findAll({
      include: [
        ...includeRelations,
        {
          model: Apprentice,
          as: 'aprendices',
          where: { id_aprendiz },
          through: { where: { estado: 'ACTIVO' }, attributes: [] },
        },
      ],
    });

    return successResponse(res, 'Tus grupos obtenidos correctamente', misGrupos);
  } catch (error) {
    return errorResponse(res, 'Error al obtener tus grupos formativos', 500, error.message);
  }
};

module.exports = {
  getGrupos,
  verificarNumeroFicha,
  getGrupoById,
  createGrupo,
  updateGrupo,
  changeEstadoGrupo,
  getAreasFormacion,
  asignarAprendiz,
  retirarAprendiz,
  getGruposInstructor,
  getMisGruposAprendiz,
};

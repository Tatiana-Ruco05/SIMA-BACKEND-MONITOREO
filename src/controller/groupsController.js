const { Op } = require('sequelize');
const { Group, FormativeProgram, EducationalArea, Instructor } = require('../models');
const { successResponse, errorResponse } = require('../helpers/response');
const { getPagination } = require('../helpers/pagination');

const calculateEndDate = (startDate, trimesters) => {
  if (!startDate || trimesters === undefined || trimesters === null) return null;

  const date = new Date(startDate);
  date.setMonth(date.getMonth() + trimesters * 3);

  return date.toISOString().split('T')[0];
};

const includeRelations = [
  {
    model: FormativeProgram,
    as: 'programa_formacion',
    attributes: ['id_programa', 'nombre_programa'],
    include: [
      {
        model: EducationalArea,
        as: 'area',
        attributes: ['id_area', 'nombre_area'],
      },
    ],
  },
  {
    model: Instructor,
    as: 'instructor_lider',
    attributes: ['id_instructor', 'id_usuario', 'codigo_instructor', 'especialidad'],
  }
];

const getGroups = async (req, res) => {
  try {
    const { jornada, estado, page, limit } = req.query;
    const { limit: take, offset } = getPagination(page, limit);

    const where = {};
    if (jornada) where.jornada = { [Op.like]: `%${jornada}%` };
    if (estado) where.estado = estado;

    const { count, rows } = await Group.findAndCountAll({
      where,
      include: includeRelations,
      order: [['id_grupo', 'DESC']],
      limit: take,
      offset,
    });

    return successResponse(res, 'Training groups retrieved successfully', {
      total: count,
      pagina: Number(page) || 1,
      grupos: rows,
    });
  } catch (error) {
    return errorResponse(res, 'Error retrieving training groups', 500, error.message);
  }
};

const verifyFichaNumber = async (req, res) => {
  try {
    const { numero_ficha } = req.params;

    const existingFicha = await Group.findOne({
      where: { numero_ficha },
      attributes: ['id_grupo'],
    });

    return successResponse(res, 'Verification successful', { disponible: !existingFicha });
  } catch (error) {
    return errorResponse(res, 'Error verifying ficha number', 500, error.message);
  }
};

const getGroupById = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findByPk(id, {
      include: includeRelations,
    });

    if (!group) {
      return errorResponse(res, 'Training group not found', 404);
    }

    return successResponse(res, 'Training group retrieved successfully', group);
  } catch (error) {
    return errorResponse(res, 'Error retrieving training group', 500, error.message);
  }
};

const createGroup = async (req, res) => {
  try {
    const {
      numero_ficha,
      id_programa,
      jornada,
      trimestres,
      fecha_inicio,
      id_ambiente,
      id_instructor_lider,
    } = req.body;

    const trimestersNumber = Number(trimestres);
    if (!Number.isInteger(trimestersNumber) || trimestersNumber <= 0) {
      return errorResponse(res, 'Trimesters must be an integer greater than 0', 400);
    }

    const program = await FormativeProgram.findByPk(id_programa);
    if (!program) {
      return errorResponse(res, 'Formative program not found', 404);
    }

    if (id_instructor_lider) {
      const instructor = await Instructor.findByPk(id_instructor_lider);
      if (!instructor) {
        return errorResponse(res, 'The selected instructor does not exist', 404);
      }
    }

    const existingFicha = await Group.findOne({ where: { numero_ficha } });
    if (existingFicha) {
      return errorResponse(
        res,
        `Ficha number "${numero_ficha}" is already registered in the system`,
        409
      );
    }

    const finalStartDate = fecha_inicio || new Date().toISOString().split('T')[0];
    const fecha_fin = calculateEndDate(finalStartDate, trimestersNumber);
    
    const newGroup = await Group.create({
      numero_ficha,
      id_programa,
      jornada,
      fecha_inicio: finalStartDate,
      fecha_fin,
      id_ambiente: id_ambiente || null,
      id_instructor_lider: id_instructor_lider || null,
      estado: 'ACTIVO',
      trimestres: trimestersNumber,
    });

    const createdGroup = await Group.findByPk(newGroup.id_grupo, {
      include: includeRelations,
    });

    return successResponse(res, 'Training group successfully created', createdGroup, 201);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return errorResponse(res, 'Ficha number already exists in the system', 409, error.message);
    }

    return errorResponse(res, 'Error creating training group', 500, error.message);
  }
};

const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      numero_ficha,
      id_programa,
      jornada,
      trimestres,
      fecha_inicio,
      id_ambiente,
      id_instructor_lider,
    } = req.body;

    const group = await Group.findByPk(id);
    if (!group) {
      return errorResponse(res, 'Training group not found', 404);
    }

    if (numero_ficha && numero_ficha !== group.numero_ficha) {
      const existingFicha = await Group.findOne({
        where: { numero_ficha, id_grupo: { [Op.ne]: id } },
      });
      if (existingFicha) {
        return errorResponse(
          res,
          `Ficha number "${numero_ficha}" already belongs to another group`,
          409
        );
      }
    }

    if (id_programa) {
      const program = await FormativeProgram.findByPk(id_programa);
      if (!program) return errorResponse(res, 'Formative program not found', 404);
    }

    if (id_instructor_lider !== undefined && id_instructor_lider !== null) {
      const instructor = await Instructor.findByPk(id_instructor_lider);
      if (!instructor) return errorResponse(res, 'The selected instructor does not exist', 404);
    }

    const newTrimesters = trimestres !== undefined ? Number(trimestres) : null;
    if (newTrimesters !== null && (!Number.isInteger(newTrimesters) || newTrimesters <= 0)) {
      return errorResponse(res, 'Trimesters must be an integer greater than 0', 400);
    }

    const finalStartDate = fecha_inicio !== undefined ? fecha_inicio : group.fecha_inicio;
    const updatedEndDate = newTrimesters !== null ? calculateEndDate(finalStartDate, newTrimesters) : group.fecha_fin;

    await group.update({
      ...(numero_ficha !== undefined && { numero_ficha }),
      ...(id_programa !== undefined && { id_programa }),
      ...(jornada !== undefined && { jornada }),
      ...(fecha_inicio !== undefined && { fecha_inicio }),
      ...(id_ambiente !== undefined && { id_ambiente: id_ambiente || null }),
      ...(id_instructor_lider !== undefined && { id_instructor_lider: id_instructor_lider || null }),
      ...(newTrimesters !== null && { trimestres: newTrimesters }),
      fecha_fin: updatedEndDate,
    });

    const updatedGroup = await Group.findByPk(id, {
      include: includeRelations,
    });

    return successResponse(res, 'Training group successfully updated', updatedGroup);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return errorResponse(res, 'Ficha number already exists in the system', 409, error.message);
    }
    return errorResponse(res, 'Error updating training group', 500, error.message);
  }
};

const changeGroupStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    const allowedStatuses = ['ACTIVO', 'CERRADO', 'SUSPENDIDO'];
    if (!allowedStatuses.includes(estado)) {
      return errorResponse(
        res,
        `Invalid status. Allowed statuses are: ${allowedStatuses.join(', ')}`,
        400
      );
    }

    const group = await Group.findByPk(id);
    if (!group) {
      return errorResponse(res, 'Training group not found', 404);
    }

    await group.update({ estado });

    return successResponse(res, `Training group status updated to "${estado}"`, {
      id_grupo: group.id_grupo,
      numero_ficha: group.numero_ficha,
      estado: group.estado,
    });
  } catch (error) {
    return errorResponse(res, 'Error changing training group status', 500, error.message);
  }
};

module.exports = {
  getGroups,
  verifyFichaNumber,
  getGroupById,
  createGroup,
  updateGroup,
  changeGroupStatus,
};

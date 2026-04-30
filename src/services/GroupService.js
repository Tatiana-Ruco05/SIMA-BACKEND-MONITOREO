const { Op } = require('sequelize');

const {
  Group,
  FormativeProgram,
  EducationalArea,
  Environment,
  Instructor,
  User,
  Person,
} = require('../models');
const { getPagination } = require('../helpers/pagination');
const {
  getCoordinatorAreaIds,
  checkCoordinatorProgramAccess,
  checkCoordinatorGroupAccess,
  getAccessibleGroupIdsForRequester,
  assertRequesterCanAccessGroup,
} = require('../helpers/coordinatorAuth');

class GroupService {
  static _calculateEndDate(startDate, trimesters) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + trimesters * 3);
    return date.toISOString().split('T')[0];
  }

  static get _includeRelations() {
    return [
      {
        model: FormativeProgram,
        as: 'programa_formacion',
        attributes: ['id_programa', 'nombre_programa'],
        include: [{ model: EducationalArea, as: 'area', attributes: ['id_area', 'nombre_area'] }],
      },
      { model: Environment, as: 'ambiente', attributes: ['id_ambiente', 'nombre_ambiente', 'ubicacion'] },
      {
        model: Instructor,
        as: 'instructor_lider',
        attributes: ['id_instructor', 'codigo_instructor', 'especialidad'],
        include: [
          {
            model: User,
            as: 'usuario',
            attributes: ['id_usuario', 'email'],
            include: [{ model: Person, as: 'persona', attributes: ['nombres', 'apellidos'] }],
          },
        ],
      },
    ];
  }

  static async _getAccessibleGroupIdsForRequester(requester) {
    return getAccessibleGroupIdsForRequester(requester);
  }

  static async _assertRequesterCanAccessGroup(requester, id_grupo) {
    return assertRequesterCanAccessGroup(
      requester,
      id_grupo,
      'No tienes permisos para consultar este grupo'
    );
  }

  static async _assertCoordinatorCanManageProgram(requester, id_programa) {
    const tieneAcceso = await checkCoordinatorProgramAccess(requester.id_usuario, id_programa);
    if (!tieneAcceso) {
      throw { status: 403, message: 'No tienes permisos para crear grupos en el area asociada a este programa de formacion' };
    }
  }

  static async _assertCoordinatorCanManageGroup(requester, id_grupo, message) {
    const tieneAcceso = await checkCoordinatorGroupAccess(requester.id_usuario, id_grupo);
    if (!tieneAcceso) {
      throw { status: 403, message };
    }
  }

  static async _findGroupOrFail(id) {
    const group = await Group.findByPk(id);
    if (!group) throw { status: 404, message: 'Grupo formativo no encontrado' };
    return group;
  }

  static async _findProgramOrFail(id_programa) {
    const program = await FormativeProgram.findByPk(id_programa);
    if (!program) throw { status: 404, message: 'El programa de formacion no existe' };
    return program;
  }

  static async _findEnvironmentOrFail(id_ambiente) {
    const environment = await Environment.findByPk(id_ambiente);
    if (!environment) throw { status: 404, message: 'El ambiente seleccionado no existe' };
    return environment;
  }

  static async _findActiveInstructorOrFail(id_instructor) {
    const instructor = await Instructor.findByPk(id_instructor, {
      where: { estado: 'ACTIVO' },
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['id_usuario', 'email'],
          include: [{ model: Person, as: 'persona', attributes: ['nombres', 'apellidos'] }],
        },
      ],
    });

    if (!instructor) throw { status: 404, message: 'El instructor no existe o no esta activo' };
    return instructor;
  }

  static async getGroups(filters, requester) {
    const { page, limit, estado, jornada, numero_ficha, id_programa, id_area } = filters;
    const { limit: take, offset } = getPagination(page, limit);

    const whereGrupo = {};
    if (estado) whereGrupo.estado = estado;
    if (jornada) whereGrupo.jornada = jornada;
    if (numero_ficha) whereGrupo.numero_ficha = { [Op.like]: `%${numero_ficha}%` };

    const wherePrograma = {};
    if (id_programa) wherePrograma.id_programa = id_programa;

    const whereAreaPrograma = {};

    if (requester.rol === 'coordinador') {
      const areaIds = await getCoordinatorAreaIds(requester.id_usuario);

      if (!areaIds.length) {
        return { total: 0, pagina: Number(page) || 1, grupos: [] };
      }

      if (id_area) {
        if (!areaIds.includes(Number(id_area))) {
          throw { status: 403, message: 'No tienes permisos para consultar grupos de esa area' };
        }
        whereAreaPrograma.id_area = Number(id_area);
      } else {
        whereAreaPrograma.id_area = { [Op.in]: areaIds };
      }
    } else if (id_area) {
      whereAreaPrograma.id_area = Number(id_area);
    }

    if (requester.rol === 'instructor') {
      const allGroupIds = await this._getAccessibleGroupIdsForRequester(requester);

      if (!allGroupIds.length) {
        return { total: 0, pagina: Number(page) || 1, grupos: [] };
      }

      whereGrupo.id_grupo = { [Op.in]: allGroupIds };
    }

    const includeFormativeProgram = {
      model: FormativeProgram,
      as: 'programa_formacion',
      attributes: ['id_programa', 'nombre_programa'],
      required: true,
      include: [
        {
          model: EducationalArea,
          as: 'area',
          attributes: ['id_area', 'nombre_area'],
          ...(Object.keys(whereAreaPrograma).length ? { where: whereAreaPrograma } : {}),
        },
      ],
      ...(Object.keys(wherePrograma).length ? { where: wherePrograma } : {}),
    };

    const { count, rows } = await Group.findAndCountAll({
      where: whereGrupo,
      include: [
        includeFormativeProgram,
        { model: Environment, as: 'ambiente', attributes: ['id_ambiente', 'nombre_ambiente'] },
        {
          model: Instructor,
          as: 'instructor_lider',
          attributes: ['id_instructor', 'codigo_instructor'],
          include: [
            {
              model: User,
              as: 'usuario',
              attributes: ['id_usuario'],
              include: [{ model: Person, as: 'persona', attributes: ['nombres', 'apellidos'] }],
            },
          ],
        },
      ],
      order: [['numero_ficha', 'ASC']],
      limit: take,
      offset,
      distinct: true,
    });

    return { total: count, pagina: Number(page) || 1, grupos: rows };
  }

  static async getGroupById(id, requester) {
    const group = await Group.findByPk(id, { include: this._includeRelations });
    if (!group) throw { status: 404, message: 'Grupo formativo no encontrado' };

    if (requester.rol === 'coordinador' || requester.rol === 'instructor') {
      await this._assertRequesterCanAccessGroup(requester, id);
    }

    return group;
  }

  static async verifyFichaNumber(numero_ficha) {
    const existingFicha = await Group.findOne({
      where: { numero_ficha },
      attributes: ['id_grupo', 'numero_ficha'],
    });

    return { disponible: !existingFicha };
  }

  static async createGroup(data, requester) {
    const { numero_ficha, id_programa, jornada, trimestres, fecha_inicio, id_ambiente, id_instructor_lider } = data;

    await this._assertCoordinatorCanManageProgram(requester, id_programa);
    await this._findProgramOrFail(id_programa);

    const existingFicha = await Group.findOne({ where: { numero_ficha } });
    if (existingFicha) throw { status: 409, message: 'El numero de ficha ya esta registrado' };

    if (id_ambiente) {
      await this._findEnvironmentOrFail(id_ambiente);
    }

    if (id_instructor_lider) {
      await this._findActiveInstructorOrFail(id_instructor_lider);
    }

    const fecha_fin = this._calculateEndDate(fecha_inicio, trimestres);

    const newGroup = await Group.create({
      numero_ficha,
      id_programa,
      jornada,
      trimestres,
      fecha_inicio,
      fecha_fin,
      id_ambiente: id_ambiente || null,
      id_instructor_lider: id_instructor_lider || null,
      estado: 'ACTIVO',
    });

    return Group.findByPk(newGroup.id_grupo, { include: this._includeRelations });
  }

  static async updateGroup(id, data, requester) {
    const { numero_ficha, id_programa, jornada, trimestres, fecha_inicio, id_ambiente } = data;

    const group = await this._findGroupOrFail(id);
    await this._assertCoordinatorCanManageGroup(requester, id, 'No tienes permisos para actualizar este grupo');

    if (id_programa !== undefined) {
      await this._findProgramOrFail(id_programa);
    }

    if (numero_ficha !== undefined && numero_ficha !== group.numero_ficha) {
      const existingFicha = await Group.findOne({ where: { numero_ficha } });
      if (existingFicha) throw { status: 409, message: 'El numero de ficha ya esta registrado' };
    }

    if (id_ambiente !== undefined && id_ambiente !== null) {
      await this._findEnvironmentOrFail(id_ambiente);
    }

    const finalStartDate = fecha_inicio !== undefined ? fecha_inicio : group.fecha_inicio;
    const finalTrimesters = trimestres !== undefined ? trimestres : group.trimestres;
    const updatedEndDate =
      fecha_inicio !== undefined || trimestres !== undefined
        ? this._calculateEndDate(finalStartDate, finalTrimesters)
        : group.fecha_fin;

    await group.update({
      ...(numero_ficha !== undefined && { numero_ficha }),
      ...(id_programa !== undefined && { id_programa }),
      ...(jornada !== undefined && { jornada }),
      ...(trimestres !== undefined && { trimestres }),
      ...(fecha_inicio !== undefined && { fecha_inicio }),
      fecha_fin: updatedEndDate,
      ...(id_ambiente !== undefined && { id_ambiente }),
    });

    return Group.findByPk(id, { include: this._includeRelations });
  }

  static async changeGroupStatus(id, estado, requester) {
    const allowedStates = ['ACTIVO', 'CERRADO', 'SUSPENDIDO'];
    if (!estado || !allowedStates.includes(estado)) {
      throw { status: 400, message: 'El estado es obligatorio y debe ser ACTIVO, CERRADO o SUSPENDIDO' };
    }

    const group = await this._findGroupOrFail(id);
    await this._assertCoordinatorCanManageGroup(requester, id, 'No tienes permisos para actualizar este grupo');

    await group.update({ estado });
    return group;
  }

  static async assignInstructorLeader(id, id_instructor, requester) {
    await this._assertCoordinatorCanManageGroup(requester, id, 'No tienes permisos para asignar lider a este grupo');

    await this._findGroupOrFail(id);
    await this._findActiveInstructorOrFail(id_instructor);

    const group = await Group.findByPk(id);
    await group.update({ id_instructor_lider: id_instructor });

    return Group.findByPk(id, { include: this._includeRelations });
  }

  static async getAvailableInstructors() {
    return Instructor.findAll({
      where: { estado: 'ACTIVO' },
      attributes: ['id_instructor', 'codigo_instructor', 'especialidad'],
      include: [
        {
          model: User,
          as: 'usuario',
          attributes: ['id_usuario', 'email'],
          include: [{ model: Person, as: 'persona', attributes: ['nombres', 'apellidos'] }],
        },
      ],
      order: [['id_instructor', 'ASC']],
    });
  }
}

module.exports = GroupService;

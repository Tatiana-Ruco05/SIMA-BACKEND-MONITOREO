const { Op, fn, col, literal } = require('sequelize');
const {
  sequelize,
  CoordinatorArea,
  EducationalArea,
  Group,
  ApprenticeGroup,
  Apprentice,
  Alert,
  Observation,
  ValidAbsencesView,
} = require('../models');
const { successResponse, errorResponse } = require('../helpers/response');

const getAssignedAreaIds = async (id_usuario) => {
  const assignments = await CoordinatorArea.findAll({
    where: {
      id_usuario,
      estado: 'ACTIVO',
    },
    attributes: ['id_area'],
  });

  return assignments.map((item) => item.id_area);
};

const getCoordinatorSummary = async (req, res) => {
  try {
    const id_usuario = req.user.id_usuario;

    const areaIds = await getAssignedAreaIds(id_usuario);

    if (!areaIds.length) {
      return successResponse(res, 'Resumen obtenido correctamente', {
        kpis: {
          total_areas: 0,
          total_programas: 0,
          total_grupos_activos: 0,
          total_aprendices_activos: 0,
          total_alertas_activas: 0,
          total_observaciones_abiertas: 0,
          total_inasistencias_validas: 0,
        },
        areas: [],
        programas: [],
      });
    }

    const totalAreas = areaIds.length;

    const totalProgramsResult = await Group.count({
      distinct: true,
      col: 'programa',
      where: {
        id_area: { [Op.in]: areaIds },
      },
    });

    const totalActiveGroups = await Group.count({
      where: {
        id_area: { [Op.in]: areaIds },
        estado: 'ACTIVO',
      },
    });

    const activeGroups = await Group.findAll({
      attributes: ['id_grupo'],
      where: {
        id_area: { [Op.in]: areaIds },
      },
    });

    const groupIds = activeGroups.map((g) => g.id_grupo);

    let totalActiveApprentices = 0;
    let totalActiveAlerts = 0;
    let totalOpenObservations = 0;
    let totalValidAbsences = 0;

    if (groupIds.length) {
      totalActiveApprentices = await ApprenticeGroup.count({
        where: {
          id_grupo: { [Op.in]: groupIds },
          estado: 'ACTIVO',
        },
        distinct: true,
        col: 'id_aprendiz',
      });

      totalActiveAlerts = await Alert.count({
        include: [
          {
            model: Apprentice,
            as: 'aprendiz',
            required: true,
            include: [
              {
                model: ApprenticeGroup,
                as: 'aprendiz_grupos',
                required: true,
                where: {
                  id_grupo: { [Op.in]: groupIds },
                  estado: 'ACTIVO',
                },
                attributes: [],
              },
            ],
            attributes: [],
          },
        ],
        where: {
          estado: 'ACTIVA',
        },
      });

      totalOpenObservations = await Observation.count({
        include: [
          {
            model: Apprentice,
            as: 'aprendiz',
            required: true,
            include: [
              {
                model: ApprenticeGroup,
                as: 'aprendiz_grupos',
                required: true,
                where: {
                  id_grupo: { [Op.in]: groupIds },
                  estado: 'ACTIVO',
                },
                attributes: [],
              },
            ],
            attributes: [],
          },
        ],
        where: {
          estado: 'ABIERTA',
        },
      });

      totalValidAbsences = await ValidAbsencesView.count({
        where: {
          id_grupo: { [Op.in]: groupIds },
        },
      });
    }

    const areasSummary = await Group.findAll({
      attributes: [
        'id_area',
        [col('area.nombre_area'), 'nombre_area'],
        [fn('COUNT', col('Group.id_grupo')), 'total_grupos'],
      ],
      include: [
        {
          model: EducationalArea,
          as: 'area',
          attributes: [],
        },
      ],
      where: {
        id_area: { [Op.in]: areaIds },
      },
      group: ['id_area', 'area.nombre_area'],
      raw: true,
    });

    const programsSummary = await Group.findAll({
      attributes: [
        'id_area',
        'programa',
        [col('area.nombre_area'), 'nombre_area'],
        [fn('COUNT', col('Group.id_grupo')), 'total_grupos'],
      ],
      include: [
        {
          model: EducationalArea,
          as: 'area',
          attributes: [],
        },
      ],
      where: {
        id_area: { [Op.in]: areaIds },
      },
      group: ['id_area', 'programa', 'area.nombre_area'],
      order: [['programa', 'ASC']],
      raw: true,
    });

    return successResponse(res, 'Resumen del coordinador obtenido correctamente', {
      kpis: {
        total_areas: totalAreas,
        total_programas: totalProgramsResult,
        total_grupos_activos: totalActiveGroups,
        total_aprendices_activos: totalActiveApprentices,
        total_alertas_activas: totalActiveAlerts,
        total_observaciones_abiertas: totalOpenObservations,
        total_inasistencias_validas: totalValidAbsences,
      },
      areas: areasSummary,
      programas: programsSummary,
    });
  } catch (error) {
    return errorResponse(res, 'Error al obtener resumen del coordinador', 500, error.message);
  }
};

const getAreaDetail = async (req, res) => {
  try {
    const id_usuario = req.user.id_usuario;
    const { idArea } = req.params;

    const assignment = await CoordinatorArea.findOne({
      where: {
        id_usuario,
        id_area: idArea,
        estado: 'ACTIVO',
      },
    });

    if (!assignment) {
      return errorResponse(res, 'No tienes esta área asignada', 403);
    }

    const area = await EducationalArea.findByPk(idArea, {
      attributes: ['id_area', 'nombre_area'],
    });

    const groups = await Group.findAll({
      where: {
        id_area: idArea,
      },
      attributes: [
        'id_grupo',
        'numero_ficha',
        'programa',
        'jornada',
        'fecha_inicio',
        'fecha_fin',
        'estado',
      ],
      order: [['programa', 'ASC'], ['numero_ficha', 'ASC']],
    });

    return successResponse(res, 'Detalle del área obtenido correctamente', {
      area,
      grupos: groups,
    });
  } catch (error) {
    return errorResponse(res, 'Error al obtener detalle del área', 500, error.message);
  }
};

module.exports = {
  getCoordinatorSummary,
  getAreaDetail,
};
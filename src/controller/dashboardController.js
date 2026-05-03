const { Op, fn, col } = require('sequelize');
const {
  sequelize,
  CoordinatorArea,
  EducationalArea,
  FormativeProgram,
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

// Include reutilizable para filtrar grupos por áreas del coordinador
const includeFormativeProgramByAreas = (areaIds, extraAttrs = []) => ({
  model: FormativeProgram,
  as: 'programa_formacion',
  attributes: ['id_programa', 'nombre_programa', ...extraAttrs],
  required: true,
  include: [
    {
      model: EducationalArea,
      as: 'area',
      attributes: ['id_area', 'nombre_area'],
    },
  ],
  where: {
    id_area: { [Op.in]: areaIds },
  },
});

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

    // Programas únicos con grupos activos en las áreas del coordinador
    const totalProgramsResult = await Group.count({
      distinct: true,
      col: 'id_programa',
      where: { estado: 'ACTIVO' },
      include: [
        {
          model: FormativeProgram,
          as: 'programa_formacion',
          attributes: [],
          required: true,
          where: {
            id_area: { [Op.in]: areaIds },
          },
        },
      ],
    });

    const totalActiveGroups = await Group.count({
      where: { estado: 'ACTIVO' },
      include: [
        {
          model: FormativeProgram,
          as: 'programa_formacion',
          attributes: [],
          required: true,
          where: {
            id_area: { [Op.in]: areaIds },
          },
        },
      ],
    });

    const activeGroups = await Group.findAll({
      attributes: ['id_grupo'],
      include: [
        {
          model: FormativeProgram,
          as: 'programa_formacion',
          attributes: [],
          required: true,
          where: {
            id_area: { [Op.in]: areaIds },
          },
        },
      ],
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

    // Resumen por área: contar grupos agrupados por área (vía programa)
    const areasSummary = await Group.findAll({
      attributes: [
        [fn('COUNT', col('Group.id_grupo')), 'total_grupos'],
      ],
      include: [
        {
          model: FormativeProgram,
          as: 'programa_formacion',
          attributes: [],
          required: true,
          where: {
            id_area: { [Op.in]: areaIds },
          },
          include: [
            {
              model: EducationalArea,
              as: 'area',
              attributes: ['id_area', 'nombre_area'],
            },
          ],
        },
      ],
      group: [
        'programa_formacion.area.id_area',
        'programa_formacion.area.nombre_area',
      ],
      raw: true,
      nest: true,
    });

    // Reformatear para mantener la estructura de respuesta actual
    const areasFormatted = areasSummary.map((row) => ({
      id_area: row.programa_formacion.area.id_area,
      nombre_area: row.programa_formacion.area.nombre_area,
      total_grupos: row.total_grupos,
    }));

    // Resumen por programa: contar grupos agrupados por programa
    const programsSummary = await Group.findAll({
      attributes: [
        [fn('COUNT', col('Group.id_grupo')), 'total_grupos'],
      ],
      include: [
        {
          model: FormativeProgram,
          as: 'programa_formacion',
          attributes: ['id_programa', 'nombre_programa'],
          required: true,
          where: {
            id_area: { [Op.in]: areaIds },
          },
          include: [
            {
              model: EducationalArea,
              as: 'area',
              attributes: ['id_area', 'nombre_area'],
            },
          ],
        },
      ],
      group: [
        'programa_formacion.id_programa',
        'programa_formacion.nombre_programa',
        'programa_formacion.area.id_area',
        'programa_formacion.area.nombre_area',
      ],
      order: [[{ model: FormativeProgram, as: 'programa_formacion' }, 'nombre_programa', 'ASC']],
      raw: true,
      nest: true,
    });

    const programsFormatted = programsSummary.map((row) => ({
      id_programa: row.programa_formacion.id_programa,
      nombre_programa: row.programa_formacion.nombre_programa,
      id_area: row.programa_formacion.area.id_area,
      nombre_area: row.programa_formacion.area.nombre_area,
      total_grupos: row.total_grupos,
    }));

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
      areas: areasFormatted,
      programas: programsFormatted,
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
      include: [
        {
          model: FormativeProgram,
          as: 'programa_formacion',
          attributes: ['id_programa', 'nombre_programa'],
          required: true,
          where: {
            id_area: idArea,
          },
        },
      ],
      attributes: [
        'id_grupo',
        'numero_ficha',
        'jornada',
        'fecha_inicio',
        'fecha_fin',
        'estado',
      ],
      order: [
        [{ model: FormativeProgram, as: 'programa_formacion' }, 'nombre_programa', 'ASC'],
        ['numero_ficha', 'ASC'],
      ],
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
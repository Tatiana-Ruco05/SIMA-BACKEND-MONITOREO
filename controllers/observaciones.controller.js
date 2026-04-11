import * as service from "../services/observaciones.service.js";


// ==============================
// CREAR OBSERVACIÓN (H07)
// ==============================
export const crearObservacion = async (req, res) => {
  try {
    const {
      id_aprendiz,
      tipo_observacion,
      severidad,
      descripcion
    } = req.body;

    // 🔥 Simulación lista para JWT
    const id_instructor = req.user?.id || 1;

    // Validar campos obligatorios
    if (!id_aprendiz || !tipo_observacion || !severidad || !descripcion) {
      return res.status(400).json({
        msg: "Todos los campos son obligatorios"
      });
    }

    await service.crearObservacion({
      id_aprendiz,
      id_instructor,
      tipo_observacion,
      severidad,
      descripcion
    });

    return res.status(201).json({
      msg: "Observación registrada correctamente"
    });

  } catch (error) {

    if (error.sqlMessage) {
      return res.status(400).json({
        msg: error.sqlMessage
      });
    }

    return res.status(500).json({
      msg: "Error interno del servidor",
      error: error.message
    });
  }
};



// ==============================
// CONSULTAR OBSERVACIONES (H08)
// ==============================
export const obtenerObservaciones = async (req, res) => {
  try {
    const {
      id_aprendiz,
      tipo,
      fecha_inicio,
      fecha_fin
    } = req.query;

    // 🔥 Simulación lista para JWT
    const id_instructor = req.user?.id || 1;

    const data = await service.obtenerObservaciones({
      id_instructor,
      id_aprendiz,
      tipo,
      fecha_inicio,
      fecha_fin
    });

    return res.json(data);

  } catch (error) {
    return res.status(500).json({
      msg: "Error al obtener observaciones",
      error: error.message
    });
  }
};

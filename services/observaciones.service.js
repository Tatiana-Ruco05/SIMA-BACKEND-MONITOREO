import db from "../config/db.js";


// ==============================
// CREAR OBSERVACIÓN (H07)
// ==============================
export const crearObservacion = async (data) => {

  if (data.descripcion.trim().length < 10) {
    throw new Error("Descripción muy corta");
  }

  // Validar que el instructor tenga el aprendiz en su grupo
  const [validacion] = await db.query(`
    SELECT COUNT(*) as total
    FROM instructor_grupo ig
    JOIN aprendiz_grupo ag ON ig.id_grupo = ag.id_grupo
    WHERE ig.id_instructor = ?
      AND ag.id_aprendiz = ?
      AND ig.estado = 'ACTIVO'
      AND ag.estado = 'ACTIVO'
  `, [data.id_instructor, data.id_aprendiz]);

  if (validacion[0].total === 0) {
    throw new Error("No tienes permiso sobre este aprendiz");
  }

  await db.query(`
    INSERT INTO observaciones
    (id_aprendiz, id_instructor, tipo_observacion, severidad, descripcion)
    VALUES (?, ?, ?, ?, ?)
  `, [
    data.id_aprendiz,
    data.id_instructor,
    data.tipo_observacion,
    data.severidad,
    data.descripcion
  ]);
};



// ==============================
// CONSULTAR OBSERVACIONES (H08)
// ==============================
export const obtenerObservaciones = async (filtros) => {

  let query = `
    SELECT
      o.id_observacion,
      o.tipo_observacion,
      o.severidad,
      o.descripcion,
      o.fecha_observacion,

      -- 👇 nombre completo aprendiz
      CONCAT(pa.nombres, ' ', pa.apellidos) AS aprendiz,

      -- 👇 nombre completo instructor (autor)
      CONCAT(pi.nombres, ' ', pi.apellidos) AS instructor

    FROM observaciones o

    -- aprendiz
    JOIN aprendices a ON o.id_aprendiz = a.id_aprendiz
    JOIN usuarios ua ON a.id_usuario = ua.id_usuario
    JOIN personas pa ON ua.id_usuario = pa.id_usuario

    -- instructor
    JOIN instructores i ON o.id_instructor = i.id_instructor
    JOIN usuarios ui ON i.id_usuario = ui.id_usuario
    JOIN personas pi ON ui.id_usuario = pi.id_usuario

    -- 🔥 seguridad por grupo
    JOIN instructor_grupo ig ON ig.id_instructor = i.id_instructor
    JOIN aprendiz_grupo ag 
      ON ag.id_grupo = ig.id_grupo 
      AND ag.id_aprendiz = a.id_aprendiz

    WHERE ig.id_instructor = ?
  `;

  let params = [filtros.id_instructor];

  if (filtros.id_aprendiz) {
    query += " AND o.id_aprendiz = ?";
    params.push(filtros.id_aprendiz);
  }

  if (filtros.tipo) {
    query += " AND o.tipo_observacion = ?";
    params.push(filtros.tipo);
  }

  if (filtros.fecha_inicio && filtros.fecha_fin) {
    query += " AND DATE(o.fecha_observacion) BETWEEN ? AND ?";
    params.push(filtros.fecha_inicio, filtros.fecha_fin);
  }

  query += " ORDER BY o.fecha_observacion DESC";

  const [rows] = await db.query(query, params);
  return rows;
};

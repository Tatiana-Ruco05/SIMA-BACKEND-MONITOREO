const exceljs = require('exceljs');
const { sequelize, Role, User, Person, Apprentice, Group, ApprenticeGroup } = require('../models');
const { hashPassword } = require('../helpers/bcrypt');

// Helper: crea un error de negocio con código HTTP
function crearError(mensaje, status = 400) {
  const err = new Error(mensaje);
  err.status = status;
  return err;
}

/**
 * Registra un aprendiz individual o lo matricula si ya existe.
 * Aplica lógica de re-uso de perfiles.
 *
 * @param {Object} datos - Datos del aprendiz (tipo_documento, numero_documento, etc.)
 * @param {Object} t - (Opcional) Transacción de Sequelize heredada
 */
async function registrarAprendiz(datos, t = null) {
  const {
    tipo_documento,
    numero_documento,
    nombres,
    apellidos,
    email,
    telefono,
    numero_ficha,
  } = datos;

  const isLocalTransaction = !t;
  const transaction = isLocalTransaction ? await sequelize.transaction() : t;

  try {
    // 1. Validar Ficha
    const grupo = await Group.findOne({
      where: { numero_ficha, estado: 'ACTIVO' },
      transaction
    });

    if (!grupo) {
      throw crearError(`La ficha '${numero_ficha}' no existe o no tiene estado ACTIVO`, 400);
    }

    // 2. Obtener el rol "Aprendiz" dinámicamente
    const rol = await Role.findOne({
      where: { nombre: ['Aprendiz', 'aprendiz', 'estudiante', 'ESTUDIANTE'] },
      transaction
    });

    if (!rol) {
      throw crearError("El rol 'Aprendiz' no está configurado en el sistema", 500);
    }

    // 3. Buscar si el usuario ya existe por su documento
    const personaExistente = await Person.findOne({
      where: { numero_documento },
      transaction
    });

    let id_aprendiz = null;

    if (personaExistente) {
      // El perfil demográfico existe, busquemos su ID de aprendiz
      const aprendizExistente = await Apprentice.findOne({
        where: { id_usuario: personaExistente.id_usuario },
        transaction
      });

      if (!aprendizExistente) {
        throw crearError(`El documento ${numero_documento} existe pero no tiene rol de aprendiz activo.`, 400);
      }

      id_aprendiz = aprendizExistente.id_aprendiz;

      // Comprobar que no esté ya matriculado en este mismo grupo
      const matriculaExistente = await ApprenticeGroup.findOne({
        where: { id_aprendiz, id_grupo: grupo.id_grupo },
        transaction
      });

      if (matriculaExistente) {
        throw crearError(`El documento ${numero_documento} ya está matriculado en la ficha ${numero_ficha}.`, 400);
      }

    } else {
      // El perfil no existe, procedemos a crearlo todo desde cero

      // Chequear colisión de email
      const userConEmail = await User.findOne({ where: { email }, transaction });
      if (userConEmail) {
        throw crearError(`El correo ${email} ya está registrado para otro usuario.`, 400);
      }

      const passwordHash = await hashPassword(numero_documento);

      const nuevoUsuario = await User.create({
        email,
        password: passwordHash,
        id_rol: rol.id_rol,
        estado: 'ACTIVO'
      }, { transaction });

      await Person.create({
        id_usuario: nuevoUsuario.id_usuario,
        tipo_documento,
        numero_documento,
        nombres,
        apellidos,
        telefono: telefono || null
      }, { transaction });

      const nuevoAprendiz = await Apprentice.create({
        id_usuario: nuevoUsuario.id_usuario,
        estado_formativo: 'EN_FORMACION',
        estado: 'ACTIVO'
      }, { transaction });

      id_aprendiz = nuevoAprendiz.id_aprendiz;
    }

    // 4. Inserción final: Matrícula en aprendiz_grupo
    await ApprenticeGroup.create({
      id_aprendiz,
      id_grupo: grupo.id_grupo,
      estado: 'ACTIVO'
    }, { transaction });

    if (isLocalTransaction) await transaction.commit();

    return { 
      success: true, 
      numero_documento, 
      mensaje: personaExistente ? 'Matriculado en nueva ficha' : 'Registrado exitosamente' 
    };

  } catch (error) {
    if (isLocalTransaction) await transaction.rollback();
    throw error;
  }
}

/**
 * Procesa masivamente un buffer de memoria de un archivo Excel.
 * 
 * @param {Buffer} fileBuffer - El archivo en memoria provisto por Multer
 */
async function procesarRegistroMasivo(fileBuffer) {
  const workbook = new exceljs.Workbook();
  await workbook.xlsx.load(fileBuffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw crearError("El archivo Excel está vacío o es inválido", 400);
  }

  const exitosos = [];
  const fallidos = [];

  // Mapeo dinámico de cabeceras de la fila 1
  const headerRow = worksheet.getRow(1);
  const headers = {};
  headerRow.eachCell((cell, colNumber) => {
    headers[cell.value.toString().toLowerCase().trim()] = colNumber;
  });

  const expectedHeaders = ['tipo_documento', 'numero_documento', 'nombres', 'apellidos', 'email', 'numero_ficha'];
  const missingHeaders = expectedHeaders.filter(h => !headers[h]);

  if (missingHeaders.length > 0) {
    throw crearError(`Faltan columnas requeridas en el Excel: ${missingHeaders.join(', ')}`, 400);
  }

  // Procesamos cada fila a partir de la fila 2 de manera independiente
  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    if (!row.hasValues) continue; 

    const datos = {
      tipo_documento: getTextValue(row, headers['tipo_documento']),
      numero_documento: getTextValue(row, headers['numero_documento']),
      nombres: getTextValue(row, headers['nombres']),
      apellidos: getTextValue(row, headers['apellidos']),
      email: getTextValue(row, headers['email']),
      telefono: getTextValue(row, headers['telefono']) || null, 
      numero_ficha: getTextValue(row, headers['numero_ficha'])
    };

    if (!datos.numero_documento || !datos.email || !datos.numero_ficha) {
      fallidos.push({ fila: i, error: "Datos críticos faltantes en la fila" });
      continue;
    }

    try {
      await registrarAprendiz(datos);
      exitosos.push({ fila: i, numero_documento: datos.numero_documento, ok: true });
    } catch (err) {
      fallidos.push({ fila: i, numero_documento: datos.numero_documento, error: err.message, ok: false });
    }
  }

  return {
    total: exitosos.length + fallidos.length,
    exitosos: exitosos.length,
    fallidos: fallidos.length,
    resultados: [...exitosos, ...fallidos].sort((a, b) => a.fila - b.fila)
  };
}

// Helper para extraer el valor en texto sin importar si el excel lo puso como número o string
function getTextValue(row, colIndex) {
  if (!colIndex) return '';
  const cell = row.getCell(colIndex);
  return cell.value ? cell.value.toString().trim() : '';
}

module.exports = {
  registrarAprendiz,
  procesarRegistroMasivo
};

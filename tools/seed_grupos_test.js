/**
 * seed_grupos_test.js
 * Inserta datos de prueba para el módulo de grupos formativos.
 * Ejecutar con: node tools/seed_grupos_test.js
 */

require('../src/config/env');
const { sequelize } = require('../src/models');
const bcrypt = require('bcrypt');

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos:', process.env.DB_NAME || 'sigma_mvp');

    // ── 1. Verificar/insertar rol instructor ────────────────────────────
    const [roles] = await sequelize.query(`SELECT id_rol, nombre FROM roles`);
    let rolInstructor = roles.find((r) => r.nombre === 'instructor');

    if (!rolInstructor) {
      await sequelize.query(
        `INSERT INTO roles (nombre, descripcion) VALUES ('instructor', 'Rol de Instructor SENA')`
      );
      const [newRoles] = await sequelize.query(`SELECT id_rol, nombre FROM roles WHERE nombre = 'instructor'`);
      rolInstructor = newRoles[0];
      console.log('✅ Rol instructor creado con id_rol:', rolInstructor.id_rol);
    } else {
      console.log('ℹ️  Rol instructor ya existe, id_rol:', rolInstructor.id_rol);
    }

    // ── 2. Verificar/insertar usuario instructor ────────────────────────
    const [usersExist] = await sequelize.query(
      `SELECT id_usuario FROM usuarios WHERE email = 'instructor@sima.com'`
    );

    let idUsuarioInstructor;

    if (usersExist.length === 0) {
      const hashPass = await bcrypt.hash('123456', 10);
      await sequelize.query(
        `INSERT INTO usuarios (email, password, estado, id_rol, created_at)
         VALUES ('instructor@sima.com', ?, 'ACTIVO', ?, NOW())`,
        { replacements: [hashPass, rolInstructor.id_rol] }
      );
      const [newUser] = await sequelize.query(
        `SELECT id_usuario FROM usuarios WHERE email = 'instructor@sima.com'`
      );
      idUsuarioInstructor = newUser[0].id_usuario;
      console.log('✅ Usuario instructor creado, id_usuario:', idUsuarioInstructor);
    } else {
      idUsuarioInstructor = usersExist[0].id_usuario;
      console.log('ℹ️  Usuario instructor ya existe, id_usuario:', idUsuarioInstructor);
    }

    // ── 3. Verificar/insertar perfil instructor ─────────────────────────
    const [instrExist] = await sequelize.query(
      `SELECT id_instructor FROM instructores WHERE id_usuario = ?`,
      { replacements: [idUsuarioInstructor] }
    );

    if (instrExist.length === 0) {
      await sequelize.query(
        `INSERT INTO instructores (id_usuario, codigo_instructor, especialidad, estado)
         VALUES (?, 'INS-001', 'Desarrollo de Software', 'ACTIVO')`,
        { replacements: [idUsuarioInstructor] }
      );
      console.log('✅ Perfil instructor creado');
    } else {
      console.log('ℹ️  Perfil instructor ya existe');
    }

    // ── 4. Verificar/insertar áreas de formación ────────────────────────
    const [areasExist] = await sequelize.query(`SELECT COUNT(*) as total FROM areas_formacion`);
    if (areasExist[0].total === 0) {
      const areas = [
        'Tecnología e Informática',
        'Manufactura y Mecánica',
        'Salud y Ciencias de la Vida',
        'Gestión Empresarial',
        'Construcción e Infraestructura',
      ];
      for (const nombre of areas) {
        await sequelize.query(
          `INSERT INTO areas_formacion (nombre_area) VALUES (?)`,
          { replacements: [nombre] }
        );
      }
      console.log('✅ Áreas de formación insertadas:', areas.length);
    } else {
      console.log('ℹ️  Áreas de formación ya existen:', areasExist[0].total);
    }

    // ── Resumen final ───────────────────────────────────────────────────
    console.log('\n=== CREDENCIALES DE PRUEBA ===');
    console.log('Coordinador : coordinador@sima.com  / (password actual en DB)');
    console.log('Instructor  : instructor@sima.com   / 123456');
    console.log('Aprendiz    : aprendiz_prueba@sima.com / (password actual en DB)');
    console.log('===============================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error en seed:', error.message);
    process.exit(1);
  }
}

seed();

-- =======================================================================
-- SEED DE DATOS COMPLETO (INCLUYE USUARIOS PARA LOGIN Y H05)
-- Contraseña global para todos los usuarios: 123456
-- =======================================================================
USE `sigma_mvp`;

SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;

-- 1. Insertar Roles
INSERT IGNORE INTO `roles` (`nombre`, `descripcion`) VALUES 
('coordinador', 'Coordinador Académico'),
('instructor', 'Instructor de Formación'),
('aprendiz', 'Aprendiz SENA'),
('administrador', 'Administrador del Sistema');

-- 2. Insertar Usuarios (Password: 123456)
-- OJO: Revisa si tu tabla usuarios requiere 'email' o 'numero_documento' en login.
-- En tu schema actual el login busca en la tabla personas por 'documento', 
-- pero el AuthController asocia el user a la tabla Personas.
INSERT IGNORE INTO `usuarios` (`email`, `password`, `id_rol`, `estado`) VALUES 
('coordinador@sena.edu.co', '$2b$10$XKYcEoftJhjkeDC7d2JNuuIE0kWlGavFiWZuD8w.Qe8b6kOWwhbUO', (SELECT id_rol FROM roles WHERE nombre = 'coordinador'), 'ACTIVO'),
('instructor@sena.edu.co', '$2b$10$XKYcEoftJhjkeDC7d2JNuuIE0kWlGavFiWZuD8w.Qe8b6kOWwhbUO', (SELECT id_rol FROM roles WHERE nombre = 'instructor'), 'ACTIVO'),
('aprendiz@sena.edu.co', '$2b$10$XKYcEoftJhjkeDC7d2JNuuIE0kWlGavFiWZuD8w.Qe8b6kOWwhbUO', (SELECT id_rol FROM roles WHERE nombre = 'aprendiz'), 'ACTIVO');

-- 3. Insertar Personas (Datos para el Login)
-- Documentos: Coordinador-> 111111, Instructor-> 222222, Aprendiz-> 333333
INSERT IGNORE INTO `personas` (`id_usuario`, `tipo_documento`, `numero_documento`, `nombres`, `apellidos`, `telefono`) VALUES 
((SELECT id_usuario FROM usuarios WHERE email = 'coordinador@sena.edu.co'), 'CC', '111111', 'Carlos', 'Coordinador', '3000000001'),
((SELECT id_usuario FROM usuarios WHERE email = 'instructor@sena.edu.co'), 'CC', '222222', 'Ivan', 'Instructor', '3000000002'),
((SELECT id_usuario FROM usuarios WHERE email = 'aprendiz@sena.edu.co'), 'TI', '333333', 'Andres', 'Aprendiz', '3000000003');

-- 4. Asociar un Instructor al usuario instructor
INSERT IGNORE INTO `instructores` (`id_usuario`, `codigo_instructor`, `especialidad`, `estado`) VALUES 
((SELECT id_usuario FROM usuarios WHERE email = 'instructor@sena.edu.co'), 'INST-001', 'Desarrollo de Software', 'ACTIVO');

-- 5. Insertar Áreas de Formación
INSERT IGNORE INTO `areas_formacion` (`nombre_area`) VALUES 
('Tecnologías de la Información (TIC)'),
('Administración y Finanzas'),
('Diseño y Contenidos Digitales');

-- 6. Insertar Programas de Formación asociados a las áreas
INSERT IGNORE INTO `programas_formacion` (`nombre_programa`, `id_area`, `estado`) VALUES
('Tecnólogo en Análisis y Desarrollo de Software (ADSO)', (SELECT id_area FROM areas_formacion WHERE nombre_area = 'Tecnologías de la Información (TIC)'), 'ACTIVO'),
('Técnico en Programación de Software', (SELECT id_area FROM areas_formacion WHERE nombre_area = 'Tecnologías de la Información (TIC)'), 'ACTIVO'),
('Tecnólogo en Gestión Administrativa', (SELECT id_area FROM areas_formacion WHERE nombre_area = 'Administración y Finanzas'), 'ACTIVO'),
('Tecnólogo en Animación 3D', (SELECT id_area FROM areas_formacion WHERE nombre_area = 'Diseño y Contenidos Digitales'), 'ACTIVO');

-- 7. Insertar Ambientes de prueba (Opcional, puede usarse al crear grupos)
INSERT IGNORE INTO `ambientes` (`nombre_ambiente`, `ubicacion`, `capacidad`, `estado`) VALUES
('Ambiente 201 - Sistemas', 'Bloque TIC', 30, 'ACTIVO'),
('Ambiente 202 - Redes', 'Bloque TIC', 25, 'ACTIVO'),
('Ambiente 301 - Administrativo', 'Bloque Central', 35, 'ACTIVO');

SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;

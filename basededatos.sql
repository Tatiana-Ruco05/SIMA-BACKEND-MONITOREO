SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE;
SET SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

DROP DATABASE IF EXISTS `sigma_mvp`;
CREATE DATABASE IF NOT EXISTS `sigma_mvp`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `sigma_mvp`;

-- -----------------------------------------------------
-- roles
-- -----------------------------------------------------
CREATE TABLE `roles` (
  `id_rol` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre` VARCHAR(50) NOT NULL,
  `descripcion` VARCHAR(150) DEFAULT NULL,
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `uk_roles_nombre` (`nombre`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- usuarios
-- -----------------------------------------------------
CREATE TABLE `usuarios` (
  `id_usuario` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(120) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `id_rol` BIGINT UNSIGNED NOT NULL,
  `estado` ENUM('ACTIVO', 'INACTIVO', 'BLOQUEADO') NOT NULL DEFAULT 'ACTIVO',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `uk_usuarios_email` (`email`),
  KEY `fk_usuarios_rol` (`id_rol`),
  CONSTRAINT `fk_usuarios_rol`
    FOREIGN KEY (`id_rol`)
    REFERENCES `roles` (`id_rol`)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- ambientes
-- -----------------------------------------------------
CREATE TABLE `ambientes` (
  `id_ambiente` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre_ambiente` VARCHAR(80) NOT NULL,
  `ubicacion` VARCHAR(150) DEFAULT NULL,
  `capacidad` INT DEFAULT NULL,
  `estado` ENUM('ACTIVO', 'MANTENIMIENTO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (`id_ambiente`),
  UNIQUE KEY `uk_ambientes_nombre` (`nombre_ambiente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- areas_formacion
-- -----------------------------------------------------
CREATE TABLE `areas_formacion` (
  `id_area` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre_area` VARCHAR(150) NOT NULL,
  PRIMARY KEY (`id_area`),
  UNIQUE KEY `uk_areas_nombre` (`nombre_area`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- programas_formacion (NUEVA ENTIDAD)
-- -----------------------------------------------------
CREATE TABLE `programas_formacion` (
  `id_programa` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_area` BIGINT UNSIGNED NOT NULL,
  `nombre_programa` VARCHAR(150) NOT NULL,
  PRIMARY KEY (`id_programa`),
  UNIQUE KEY `uk_programas_nombre` (`nombre_programa`),
  KEY `fk_programas_area` (`id_area`),
  CONSTRAINT `fk_programas_area`
    FOREIGN KEY (`id_area`)
    REFERENCES `areas_formacion` (`id_area`)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- instructores
-- -----------------------------------------------------
CREATE TABLE `instructores` (
  `id_instructor` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_usuario` BIGINT UNSIGNED NOT NULL,
  `codigo_instructor` VARCHAR(30) DEFAULT NULL,
  `especialidad` VARCHAR(100) DEFAULT NULL,
  `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (`id_instructor`),
  UNIQUE KEY `uk_instructores_usuario` (`id_usuario`),
  UNIQUE KEY `uk_instructores_codigo` (`codigo_instructor`),
  CONSTRAINT `fk_instructores_usuario`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `usuarios` (`id_usuario`)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Ccoordinador area
-- -----------------------------------------------------
CREATE TABLE coordinador_area (
  id_coordinador_area BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  id_usuario BIGINT UNSIGNED NOT NULL,
  id_area BIGINT UNSIGNED NOT NULL,
  estado ENUM('ACTIVO','INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (id_coordinador_area),
  UNIQUE KEY uk_coordinador_area (id_usuario, id_area),
  CONSTRAINT fk_coord_area_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON UPDATE CASCADE,
  CONSTRAINT fk_coord_area_area FOREIGN KEY (id_area) REFERENCES areas_formacion(id_area) ON UPDATE CASCADE
);

-- -----------------------------------------------------
-- grupos_formativos 
-- -----------------------------------------------------
CREATE TABLE `grupos_formativos` (
  `id_grupo` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `numero_ficha` VARCHAR(30) NOT NULL,
  `id_programa` BIGINT UNSIGNED NOT NULL, -- Ahora apunta al Programa
  `jornada` VARCHAR(30) NOT NULL,
  `fecha_inicio` DATE NOT NULL,
  `fecha_fin` DATE NOT NULL,
  `id_ambiente` BIGINT UNSIGNED DEFAULT NULL,
  `id_instructor_lider` BIGINT UNSIGNED DEFAULT NULL,
  `estado` ENUM('ACTIVO', 'CERRADO', 'SUSPENDIDO') NOT NULL DEFAULT 'ACTIVO',
  `trimestres` INT(1) NOT NULL DEFAULT 3,
  PRIMARY KEY (`id_grupo`),
  UNIQUE KEY `uk_grupo_ficha` (`numero_ficha`),
  KEY `fk_grupos_ambiente` (`id_ambiente`),
  KEY `fk_grupos_programa` (`id_programa`), -- Nuevo índice
  KEY `fk_grupos_instructor_lider` (`id_instructor_lider`),
  CONSTRAINT `fk_grupos_ambiente`
    FOREIGN KEY (`id_ambiente`)
    REFERENCES `ambientes` (`id_ambiente`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_grupos_programa` -- Nueva restricción
    FOREIGN KEY (`id_programa`)
    REFERENCES `programas_formacion` (`id_programa`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_grupos_instructor_lider`
    FOREIGN KEY (`id_instructor_lider`)
    REFERENCES `instructores` (`id_instructor`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- horarios_formacion
-- -----------------------------------------------------
CREATE TABLE `horarios_formacion` (
  `id_horario` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_grupo` BIGINT UNSIGNED NOT NULL,
  `id_instructor` BIGINT UNSIGNED NOT NULL,
  `id_ambiente` BIGINT UNSIGNED NOT NULL,
  `dia_semana` TINYINT UNSIGNED NOT NULL COMMENT '1=Lunes ... 7=Domingo',
  `hora_inicio` TIME NOT NULL,
  `hora_fin` TIME NOT NULL,
  `tolerancia_minutos` INT NOT NULL DEFAULT 15,
  `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  `trimestre` INT(1) NOT NULL,
  `horarios_formacioncol` VARCHAR(45) DEFAULT NULL,
  PRIMARY KEY (`id_horario`),
  KEY `fk_horario_grupo` (`id_grupo`),
  KEY `fk_horario_instructor` (`id_instructor`),
  KEY `fk_horario_ambiente` (`id_ambiente`),
  CONSTRAINT `fk_horario_ambiente`
    FOREIGN KEY (`id_ambiente`)
    REFERENCES `ambientes` (`id_ambiente`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_horario_grupo`
    FOREIGN KEY (`id_grupo`)
    REFERENCES `grupos_formativos` (`id_grupo`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_horario_instructor`
    FOREIGN KEY (`id_instructor`)
    REFERENCES `instructores` (`id_instructor`)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- horario_reg
-- -----------------------------------------------------
CREATE TABLE `horario_reg` (
  `id_horario_reg` INT NOT NULL AUTO_INCREMENT,
  `fecha_creacion` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `id_usuario` BIGINT UNSIGNED NOT NULL,
  `id_horario` BIGINT UNSIGNED NOT NULL,
  PRIMARY KEY (`id_horario_reg`),
  KEY `fk_horario_reg_usuarios_idx` (`id_usuario`),
  KEY `fk_horario_reg_horarios_formacion1_idx` (`id_horario`),
  CONSTRAINT `fk_horario_reg_usuarios`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `usuarios` (`id_usuario`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_horario_reg_horarios_formacion1`
    FOREIGN KEY (`id_horario`)
    REFERENCES `horarios_formacion` (`id_horario`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- dispositivos_iot
-- -----------------------------------------------------
CREATE TABLE `dispositivos_iot` (
  `id_dispositivo` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `codigo_dispositivo` VARCHAR(50) NOT NULL,
  `id_ambiente` BIGINT UNSIGNED NOT NULL,
  `tipo_dispositivo` ENUM('ESP32_HUELLA') NOT NULL DEFAULT 'ESP32_HUELLA',
  `estado` ENUM('ACTIVO', 'INACTIVO', 'MANTENIMIENTO') NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (`id_dispositivo`),
  UNIQUE KEY `uk_dispositivos_codigo` (`codigo_dispositivo`),
  KEY `fk_dispositivos_ambiente` (`id_ambiente`),
  CONSTRAINT `fk_dispositivos_ambiente`
    FOREIGN KEY (`id_ambiente`)
    REFERENCES `ambientes` (`id_ambiente`)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- accesos_ambiente
-- -----------------------------------------------------
CREATE TABLE `accesos_ambiente` (
  `id_acceso` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_usuario` BIGINT UNSIGNED DEFAULT NULL,
  `id_dispositivo` BIGINT UNSIGNED NOT NULL,
  `tipo_evento` ENUM('ENTRADA', 'SALIDA', 'INTENTO_FALLIDO') NOT NULL,
  `resultado` ENUM('PERMITIDO', 'DENEGADO') NOT NULL,
  `fecha_hora` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `observacion` VARCHAR(255) DEFAULT NULL,
  `sincronizado` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id_acceso`),
  KEY `idx_accesos_fecha` (`fecha_hora`),
  KEY `fk_accesos_usuario` (`id_usuario`),
  KEY `fk_accesos_dispositivo` (`id_dispositivo`),
  CONSTRAINT `fk_accesos_dispositivo`
    FOREIGN KEY (`id_dispositivo`)
    REFERENCES `dispositivos_iot` (`id_dispositivo`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_accesos_usuario`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `usuarios` (`id_usuario`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- aprendices
-- -----------------------------------------------------
CREATE TABLE `aprendices` (
  `id_aprendiz` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_usuario` BIGINT UNSIGNED NOT NULL,
  `estado_formativo` ENUM('EN_FORMACION', 'CONDICIONADO', 'CANCELADO', 'APLAZADO', 'CERTIFICADO') NOT NULL DEFAULT 'EN_FORMACION',
  `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (`id_aprendiz`),
  UNIQUE KEY `uk_aprendices_usuario` (`id_usuario`),
  CONSTRAINT `fk_aprendices_usuario`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `usuarios` (`id_usuario`)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- observaciones
-- -----------------------------------------------------
CREATE TABLE `observaciones` (
  `id_observacion` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_aprendiz` BIGINT UNSIGNED NOT NULL,
  `id_instructor` BIGINT UNSIGNED NOT NULL,
  `tipo_observacion` ENUM('ACADEMICA', 'CONVIVENCIAL') NOT NULL,
  `severidad` ENUM('LEVE', 'MODERADA', 'GRAVE') NOT NULL DEFAULT 'MODERADA',
  `descripcion` TEXT NOT NULL,
  `fecha_observacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` ENUM('ABIERTA', 'CERRADA') NOT NULL DEFAULT 'ABIERTA',
  PRIMARY KEY (`id_observacion`),
  KEY `fk_obs_aprendiz` (`id_aprendiz`),
  KEY `fk_obs_instructor` (`id_instructor`),
  CONSTRAINT `fk_obs_aprendiz`
    FOREIGN KEY (`id_aprendiz`)
    REFERENCES `aprendices` (`id_aprendiz`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_obs_instructor`
    FOREIGN KEY (`id_instructor`)
    REFERENCES `instructores` (`id_instructor`)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- alertas
-- -----------------------------------------------------
CREATE TABLE `alertas` (
  `id_alerta` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_aprendiz` BIGINT UNSIGNED NOT NULL,
  `id_observacion` BIGINT UNSIGNED DEFAULT NULL,
  `tipo_alerta` ENUM('INASISTENCIA', 'OBSERVACIONES_RECURRENTES', 'MANUAL') NOT NULL,
  `regla_disparo` ENUM('3_CONSECUTIVAS', '5_DISTINTOS_DIAS', 'OBSERVACIONES_RECURRENTES', 'MANUAL') DEFAULT NULL,
  `origen` ENUM('AUTOMATICA', 'MANUAL') NOT NULL,
  `severidad` ENUM('LEVE', 'MODERADA', 'GRAVE', 'CRITICA') NOT NULL DEFAULT 'MODERADA',
  `descripcion` TEXT NOT NULL,
  `estado` ENUM('ACTIVA', 'EN_SEGUIMIENTO', 'CERRADA') NOT NULL DEFAULT 'ACTIVA',
  `fecha_alerta` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_inicio_evaluada` DATE DEFAULT NULL,
  `fecha_fin_evaluada` DATE DEFAULT NULL,
  `creada_por` BIGINT UNSIGNED DEFAULT NULL,
  PRIMARY KEY (`id_alerta`),
  KEY `fk_alertas_aprendiz` (`id_aprendiz`),
  KEY `fk_alertas_obs` (`id_observacion`),
  CONSTRAINT `fk_alertas_aprendiz`
    FOREIGN KEY (`id_aprendiz`)
    REFERENCES `aprendices` (`id_aprendiz`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_alertas_obs`
    FOREIGN KEY (`id_observacion`)
    REFERENCES `observaciones` (`id_observacion`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- aprendiz_grupo
-- -----------------------------------------------------
CREATE TABLE `aprendiz_grupo` (
  `id_aprendiz_grupo` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_aprendiz` BIGINT UNSIGNED NOT NULL,
  `id_grupo` BIGINT UNSIGNED NOT NULL,
  `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (`id_aprendiz_grupo`),
  UNIQUE KEY `uk_aprendiz_grupo` (`id_aprendiz`, `id_grupo`),
  KEY `fk_ag_grupo` (`id_grupo`),
  CONSTRAINT `fk_ag_aprendiz`
    FOREIGN KEY (`id_aprendiz`)
    REFERENCES `aprendices` (`id_aprendiz`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ag_grupo`
    FOREIGN KEY (`id_grupo`)
    REFERENCES `grupos_formativos` (`id_grupo`)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- sesiones_formacion
-- -----------------------------------------------------
CREATE TABLE `sesiones_formacion` (
  `id_sesion_formacion` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_horario` BIGINT UNSIGNED NOT NULL,
  `id_grupo` BIGINT UNSIGNED NOT NULL,
  `id_instructor` BIGINT UNSIGNED NOT NULL,
  `id_ambiente` BIGINT UNSIGNED NOT NULL,
  `fecha_clase` DATE NOT NULL,
  `hora_inicio_programada` TIME NOT NULL,
  `hora_fin_programada` TIME NOT NULL,
  `hora_inicio_real` DATETIME DEFAULT NULL,
  `hora_fin_real` DATETIME DEFAULT NULL,
  `estado` ENUM('PROGRAMADA', 'ABIERTA', 'CERRADA', 'CANCELADA') NOT NULL DEFAULT 'PROGRAMADA',
  `origen_apertura` ENUM('AUTOMATICA_LOGIN', 'AUTOMATICA_ACCESO', 'MANUAL_RESPALDO') NOT NULL DEFAULT 'AUTOMATICA_LOGIN',
  `id_acceso_apertura` BIGINT UNSIGNED DEFAULT NULL,
  `id_acceso_cierre` BIGINT UNSIGNED DEFAULT NULL,
  PRIMARY KEY (`id_sesion_formacion`),
  UNIQUE KEY `uk_sesion_horario_fecha` (`id_horario`, `fecha_clase`),
  KEY `fk_sesion_grupo` (`id_grupo`),
  KEY `fk_sesion_instructor` (`id_instructor`),
  KEY `fk_sesion_ambiente` (`id_ambiente`),
  KEY `fk_sesion_apertura` (`id_acceso_apertura`),
  KEY `fk_sesion_cierre` (`id_acceso_cierre`),
  CONSTRAINT `fk_sesion_ambiente`
    FOREIGN KEY (`id_ambiente`)
    REFERENCES `ambientes` (`id_ambiente`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_sesion_apertura`
    FOREIGN KEY (`id_acceso_apertura`)
    REFERENCES `accesos_ambiente` (`id_acceso`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_sesion_cierre`
    FOREIGN KEY (`id_acceso_cierre`)
    REFERENCES `accesos_ambiente` (`id_acceso`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_sesion_grupo`
    FOREIGN KEY (`id_grupo`)
    REFERENCES `grupos_formativos` (`id_grupo`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_sesion_horario`
    FOREIGN KEY (`id_horario`)
    REFERENCES `horarios_formacion` (`id_horario`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_sesion_instructor`
    FOREIGN KEY (`id_instructor`)
    REFERENCES `instructores` (`id_instructor`)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- asistencias
-- -----------------------------------------------------
CREATE TABLE `asistencias` (
  `id_asistencia` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_aprendiz` BIGINT UNSIGNED NOT NULL,
  `id_acceso` BIGINT UNSIGNED DEFAULT NULL,
  `estado_asistencia` ENUM('PENDIENTE', 'PRESENTE', 'TARDE', 'INASISTENTE', 'JUSTIFICADA') NOT NULL DEFAULT 'PENDIENTE',
  `hora_registro` TIME DEFAULT NULL,
  `origen` ENUM('BIOMETRICO', 'MANUAL', 'AUTOMATICO_CIERRE') NOT NULL,
  `observacion` VARCHAR(255) DEFAULT NULL,
  `creado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `id_grupo` BIGINT UNSIGNED NOT NULL,
  `id_horario` BIGINT UNSIGNED NOT NULL,
  `fecha_clase` DATE NOT NULL,
  PRIMARY KEY (`id_asistencia`),
  UNIQUE KEY `uk_asistencia_aprendiz_horario_fecha` (`id_aprendiz`, `id_horario`, `fecha_clase`),
  KEY `fk_asistencias_aprendiz` (`id_aprendiz`),
  KEY `fk_asistencias_acceso` (`id_acceso`),
  KEY `fk_asistencias_grupo_idx` (`id_grupo`),
  KEY `fk_asistencias_horario_idx` (`id_horario`),
  KEY `fk_asistencias_sesion_compuesta_idx` (`id_horario`, `fecha_clase`),
  CONSTRAINT `fk_asistencias_acceso`
    FOREIGN KEY (`id_acceso`)
    REFERENCES `accesos_ambiente` (`id_acceso`)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  CONSTRAINT `fk_asistencias_aprendiz`
    FOREIGN KEY (`id_aprendiz`)
    REFERENCES `aprendices` (`id_aprendiz`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_asistencias_grupo`
    FOREIGN KEY (`id_grupo`)
    REFERENCES `grupos_formativos` (`id_grupo`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_asistencias_horario`
    FOREIGN KEY (`id_horario`)
    REFERENCES `horarios_formacion` (`id_horario`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_asistencias_sesion_compuesta`
    FOREIGN KEY (`id_horario`, `fecha_clase`)
    REFERENCES `sesiones_formacion` (`id_horario`, `fecha_clase`)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- huellas_biometricas
-- -----------------------------------------------------
CREATE TABLE `huellas_biometricas` (
  `id_huella` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_usuario` BIGINT UNSIGNED NOT NULL,
  `id_dispositivo` BIGINT UNSIGNED NOT NULL,
  `codigo_huella` VARCHAR(100) NOT NULL,
  `fecha_enrolamiento` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enrolado_por` BIGINT UNSIGNED NOT NULL,
  `estado` ENUM('ACTIVA', 'INACTIVA') NOT NULL DEFAULT 'ACTIVA',
  PRIMARY KEY (`id_huella`),
  UNIQUE KEY `uk_huella_dispositivo` (`id_dispositivo`, `codigo_huella`),
  UNIQUE KEY `uk_usuario_dispositivo` (`id_usuario`, `id_dispositivo`),
  KEY `fk_hb_enrolador` (`enrolado_por`),
  CONSTRAINT `fk_hb_dispositivo`
    FOREIGN KEY (`id_dispositivo`)
    REFERENCES `dispositivos_iot` (`id_dispositivo`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_hb_enrolador`
    FOREIGN KEY (`enrolado_por`)
    REFERENCES `usuarios` (`id_usuario`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_hb_usuario`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `usuarios` (`id_usuario`)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- instructor_grupo
-- -----------------------------------------------------
CREATE TABLE `instructor_grupo` (
  `id_instructor_grupo` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_instructor` BIGINT UNSIGNED NOT NULL,
  `id_grupo` BIGINT UNSIGNED NOT NULL,
  `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (`id_instructor_grupo`),
  UNIQUE KEY `uk_instructor_grupo` (`id_instructor`, `id_grupo`),
  KEY `fk_ig_grupo` (`id_grupo`),
  CONSTRAINT `fk_ig_grupo`
    FOREIGN KEY (`id_grupo`)
    REFERENCES `grupos_formativos` (`id_grupo`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_ig_instructor`
    FOREIGN KEY (`id_instructor`)
    REFERENCES `instructores` (`id_instructor`)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- justificaciones_asistencia
-- -----------------------------------------------------
CREATE TABLE `justificaciones_asistencia` (
  `id_justificacion` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_asistencia` BIGINT UNSIGNED NOT NULL,
  `id_aprendiz` BIGINT UNSIGNED NOT NULL,
  `archivo_url` VARCHAR(255) NOT NULL,
  `comentario_aprendiz` TEXT DEFAULT NULL,
  `estado` ENUM('PENDIENTE', 'APROBADA', 'RECHAZADA') NOT NULL DEFAULT 'PENDIENTE',
  `fecha_envio` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revisada_por` BIGINT UNSIGNED DEFAULT NULL,
  `fecha_revision` DATETIME DEFAULT NULL,
  `comentario_instructor` TEXT DEFAULT NULL,
  PRIMARY KEY (`id_justificacion`),
  UNIQUE KEY `uk_justificacion_asistencia` (`id_asistencia`),
  KEY `fk_just_aprendiz` (`id_aprendiz`),
  KEY `fk_just_instructor` (`revisada_por`),
  CONSTRAINT `fk_just_aprendiz`
    FOREIGN KEY (`id_aprendiz`)
    REFERENCES `aprendices` (`id_aprendiz`)
    ON UPDATE CASCADE,
  CONSTRAINT `fk_just_asistencia`
    FOREIGN KEY (`id_asistencia`)
    REFERENCES `asistencias` (`id_asistencia`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_just_instructor`
    FOREIGN KEY (`revisada_por`)
    REFERENCES `instructores` (`id_instructor`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- notificaciones
-- -----------------------------------------------------
CREATE TABLE `notificaciones` (
  `id_notificacion` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_usuario` BIGINT UNSIGNED NOT NULL,
  `id_alerta` BIGINT UNSIGNED DEFAULT NULL,
  `titulo` VARCHAR(120) NOT NULL,
  `mensaje` VARCHAR(255) NOT NULL,
  `tipo` ENUM('ALERTA', 'CITACION', 'ASISTENCIA', 'OBSERVACION') NOT NULL,
  `leida` TINYINT(1) NOT NULL DEFAULT 0,
  `fecha_envio` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_lectura` DATETIME DEFAULT NULL,
  PRIMARY KEY (`id_notificacion`),
  KEY `fk_notificaciones_alerta` (`id_alerta`),
  KEY `idx_notificaciones_usuario` (`id_usuario`),
  KEY `idx_notificaciones_leida` (`leida`),
  CONSTRAINT `fk_notificaciones_alerta`
    FOREIGN KEY (`id_alerta`)
    REFERENCES `alertas` (`id_alerta`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_notificaciones_usuario`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `usuarios` (`id_usuario`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- personas
-- -----------------------------------------------------
CREATE TABLE `personas` (
  `id_persona` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_usuario` BIGINT UNSIGNED NOT NULL,
  `tipo_documento` VARCHAR(10) NOT NULL,
  `numero_documento` VARCHAR(20) NOT NULL,
  `nombres` VARCHAR(100) NOT NULL,
  `apellidos` VARCHAR(100) NOT NULL,
  `telefono` VARCHAR(20) DEFAULT NULL,
  PRIMARY KEY (`id_persona`),
  UNIQUE KEY `uk_personas_usuario` (`id_usuario`),
  UNIQUE KEY `uk_personas_documento` (`numero_documento`),
  CONSTRAINT `fk_personas_usuario`
    FOREIGN KEY (`id_usuario`)
    REFERENCES `usuarios` (`id_usuario`)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Vista
-- -----------------------------------------------------
DROP VIEW IF EXISTS `vw_inasistencias_validas`;

CREATE VIEW `vw_inasistencias_validas` AS
SELECT
    a.`id_asistencia`,
    a.`id_aprendiz`,
    a.`id_grupo`,
    a.`id_horario`,
    a.`fecha_clase`,
    a.`estado_asistencia`
FROM `asistencias` a
LEFT JOIN `justificaciones_asistencia` j
    ON j.`id_asistencia` = a.`id_asistencia`
   AND j.`estado` = 'APROBADA'
WHERE a.`estado_asistencia` = 'INASISTENTE'
  AND j.`id_justificacion` IS NULL;

DELIMITER $$

CREATE TRIGGER `trg_validar_acceso_permitido`
BEFORE INSERT ON `accesos_ambiente`
FOR EACH ROW
BEGIN
    DECLARE v_estado VARCHAR(20);
    DECLARE v_tiene_huella INT DEFAULT 0;

    IF NEW.resultado = 'PERMITIDO' AND NEW.id_usuario IS NOT NULL THEN

        SELECT estado
          INTO v_estado
        FROM usuarios
        WHERE id_usuario = NEW.id_usuario;

        IF v_estado IS NULL THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El usuario asociado al acceso no existe';
        END IF;

        IF v_estado <> 'ACTIVO' THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No se permite acceso a usuarios inactivos';
        END IF;

        SELECT COUNT(*)
          INTO v_tiene_huella
        FROM huellas_biometricas
        WHERE id_usuario = NEW.id_usuario
          AND id_dispositivo = NEW.id_dispositivo
          AND estado = 'ACTIVA';

        IF v_tiene_huella = 0 THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El usuario no tiene huella activa enrolada en este dispositivo';
        END IF;
    END IF;
END$$

CREATE TRIGGER `trg_no_eliminar_observaciones`
BEFORE DELETE ON `observaciones`
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Las observaciones registradas no pueden eliminarse del historial';
END$$

CREATE TRIGGER `trg_validar_asistencia_biometrica_ins`
BEFORE INSERT ON `asistencias`
FOR EACH ROW
BEGIN
    IF NEW.origen = 'BIOMETRICO' AND NEW.id_acceso IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'La asistencia biométrica requiere un acceso asociado';
    END IF;

    IF NEW.fecha_clase IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'La asistencia requiere fecha_clase';
    END IF;
END$$

CREATE TRIGGER `trg_validar_asistencia_biometrica_upd`
BEFORE UPDATE ON `asistencias`
FOR EACH ROW
BEGIN
    IF NEW.origen = 'BIOMETRICO' AND NEW.id_acceso IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'La asistencia biométrica requiere un acceso asociado';
    END IF;

    IF NEW.fecha_clase IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'La asistencia requiere fecha_clase';
    END IF;
END$$

CREATE TRIGGER `trg_validar_huella_usuario`
BEFORE INSERT ON `huellas_biometricas`
FOR EACH ROW
BEGIN
    DECLARE v_rol VARCHAR(50);
    DECLARE v_estado_usuario VARCHAR(20);
    DECLARE v_estado_formativo VARCHAR(20);

    SELECT r.nombre, u.estado
      INTO v_rol, v_estado_usuario
    FROM usuarios u
    JOIN roles r ON r.id_rol = u.id_rol
    WHERE u.id_usuario = NEW.id_usuario;

    IF v_estado_usuario IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El usuario a enrolar no existe';
    END IF;

    IF v_estado_usuario <> 'ACTIVO' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Usuario inactivo no puede enrolar huella';
    END IF;

    IF UPPER(v_rol) = 'APRENDIZ' THEN
        SELECT estado_formativo
          INTO v_estado_formativo
        FROM aprendices
        WHERE id_usuario = NEW.id_usuario;

        IF v_estado_formativo IS NULL THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El usuario con rol aprendiz no tiene registro en aprendices';
        END IF;

        IF v_estado_formativo NOT IN ('EN_FORMACION', 'CONDICIONADO') THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El estado formativo del aprendiz no permite enrolamiento';
        END IF;
    END IF;
END$$

DELIMITER ;

SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;

-- 1. ROLES (Incluyendo los roles específicos de tu proyecto)
INSERT INTO `roles` (`nombre`, `descripcion`) VALUES 
('coordinador', 'Control total del sistema y gestión de usuarios'),
('instructor', 'Gestión de ambientes, grupos y registro de observaciones'),
('aprendiz', 'Consulta de asistencias y registro de justificaciones');

-- 2. USUARIOS
-- Nota: Las contraseñas son: Admin123, Franco123, Jorge123
INSERT INTO `usuarios` (`email`, `password`, `id_rol`, `estado`) VALUES 
('coordinador@sena.edu.co', '$2b$10$BbEVitY6RmOumhkfGbrKGOe/LJLtS8KLgi72mtsg8XB1345.K..t6', 1, 'ACTIVO'),
('instructor_franco@sena.edu.co', '$2b$10$8M1zdNStdTSIWMMK6fGw9.TqadN2nE4UASbu.8//sy6Lfe6TXlAYK', 2, 'ACTIVO'),
('jorge.estudiante@sena.edu.co', '$2b$10$8dktn0gRraHr9nx2Gh6zf.s7brDmKLrOlrr/4H.nn/vQAhvdyNF8i', 3, 'ACTIVO');

-- 3. PERSONAS (Información personal vinculada a usuarios)
INSERT INTO `personas` (`id_usuario`, `tipo_documento`, `numero_documento`, `nombres`, `apellidos`, `telefono`) VALUES 
(1, 'CC', '1000000001', 'Admin', 'Sistema', '3001112233'),
(2, 'CC', '1000000002', 'Franco', 'Reina', '3114445566'),
(3, 'CC', '1000000003', 'Jorge', 'Crucerira', '3227778899');

-- 4. AREAS DE FORMACIÓN
INSERT INTO `areas_formacion` (`nombre_area`) VALUES 
('Análisis y Desarrollo de Software'),
('Internet de las Cosas (IoT)'),
('Redes y Telecomunicaciones');

-- 4.1. COORDINADOR_AREA (Permisos del Coordinador)
INSERT INTO `coordinador_area` (`id_usuario`, `id_area`, `estado`) VALUES 
(1, 1, 'ACTIVO'),
(1, 2, 'ACTIVO'),
(1, 3, 'ACTIVO');

-- 4.5. PROGRAMAS DE FORMACION
INSERT INTO `programas_formacion` (`id_area`, `nombre_programa`) VALUES 
(1, 'ADSO'),
(2, 'IoT Aplicado');

-- 5. AMBIENTES
INSERT INTO `ambientes` (`nombre_ambiente`, `ubicacion`, `capacidad`, `estado`) VALUES 
('Laboratorio de Software 1', 'Piso 2, Ala Sur', 30, 'ACTIVO'),
('Taller de Electrónica', 'Piso 1, Ala Norte', 20, 'ACTIVO'),
('Ambiente de Conectividad', 'Piso 2, Edificio B', 25, 'MANTENIMIENTO');

-- 6. INSTRUCTORES
INSERT INTO `instructores` (`id_usuario`, `codigo_instructor`, `especialidad`, `estado`) VALUES 
(2, 'INS-001', 'Desarrollo Fullstack y Arquitectura', 'ACTIVO');

-- 7. GRUPOS FORMATIVOS (INYECCIÓN ACTUALIZADA)
INSERT INTO `grupos_formativos` (`numero_ficha`, `id_programa`, `jornada`, `fecha_inicio`, `fecha_fin`, `id_ambiente`, `id_instructor_lider`, `trimestres`) VALUES 
('3064975', 1, 'Mañana', '2025-01-20', '2026-06-20', 1, 1, 6),
('2850312', 2, 'Tarde', '2024-05-15', '2025-11-15', 2, 1, 4);

-- 8. APRENDICES
INSERT INTO `aprendices` (`id_usuario`, `estado_formativo`, `estado`) VALUES 
(3, 'EN_FORMACION', 'ACTIVO');

-- 9. APRENDIZ_GRUPO (Vincular Jorge a la ficha ADSO)
INSERT INTO `aprendiz_grupo` (`id_aprendiz`, `id_grupo`, `estado`) VALUES 
(1, 1, 'ACTIVO');

-- 10. DISPOSITIVOS IOT
INSERT INTO `dispositivos_iot` (`codigo_dispositivo`, `id_ambiente`, `tipo_dispositivo`, `estado`) VALUES 
('ESP32-LAB-001', 1, 'ESP32_HUELLA', 'ACTIVO'),
('ESP32-TALLER-002', 2, 'ESP32_HUELLA', 'ACTIVO');

-- 11. HORARIOS DE FORMACIÓN
INSERT INTO `horarios_formacion` (`id_grupo`, `id_instructor`, `id_ambiente`, `dia_semana`, `hora_inicio`, `hora_fin`, `trimestre`) VALUES 
(1, 1, 1, 1, '07:00:00', '13:00:00', 3),
(1, 1, 1, 2, '07:00:00', '13:00:00', 3);

-- 12. HUELLAS BIOMETRICAS (Simulando enrolamiento)
-- Nota: El trigger 'trg_validar_huella_usuario' validará que el usuario esté activo.
INSERT INTO `huellas_biometricas` (`id_usuario`, `id_dispositivo`, `codigo_huella`, `enrolado_por`, `estado`) VALUES 
(3, 1, 'FINGERPRINT_DATA_SAMPLE_001', 1, 'ACTIVA');

-- 13. ACCESOS AMBIENTE
INSERT INTO `accesos_ambiente` (`id_usuario`, `id_dispositivo`, `tipo_evento`, `resultado`, `observacion`) VALUES 
(3, 1, 'ENTRADA', 'PERMITIDO', 'Ingreso normal a clase'),
(3, 1, 'SALIDA', 'PERMITIDO', 'Salida de jornada');

-- 14. SESIONES DE FORMACIÓN (Necesaria para referenciar en asistencias)
INSERT INTO `sesiones_formacion` (`id_horario`, `id_grupo`, `id_instructor`, `id_ambiente`, `fecha_clase`, `hora_inicio_programada`, `hora_fin_programada`, `estado`) VALUES 
(1, 1, 1, 1, '2026-04-10', '07:00:00', '13:00:00', 'CERRADA');

-- 15. ASISTENCIAS
INSERT INTO `asistencias` (`id_aprendiz`, `id_acceso`, `estado_asistencia`, `hora_registro`, `origen`, `id_grupo`, `id_horario`, `fecha_clase`) VALUES 
(1, 1, 'PRESENTE', '07:05:00', 'BIOMETRICO', 1, 1, '2026-04-10');

-- 16. OBSERVACIONES
INSERT INTO `observaciones` (`id_aprendiz`, `id_instructor`, `tipo_observacion`, `severidad`, `descripcion`) VALUES 
(1, 1, 'ACADEMICA', 'LEVE', 'Excelente desempeño en el desarrollo de la lógica de base de datos.');

-- 17. ALERTAS
INSERT INTO `alertas` (`id_aprendiz`, `id_observacion`, `tipo_alerta`, `origen`, `severidad`, `descripcion`) VALUES 
(1, 1, 'MANUAL', 'MANUAL', 'LEVE', 'Seguimiento por desempeño académico sobresaliente.');

-- 18. NOTIFICACIONES
INSERT INTO `notificaciones` (`id_usuario`, `titulo`, `mensaje`, `tipo`) VALUES 
(3, 'Nueva Observación', 'Se ha registrado una observación académica en tu perfil.', 'OBSERVACION');
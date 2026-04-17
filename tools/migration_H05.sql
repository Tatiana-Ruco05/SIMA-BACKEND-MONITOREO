-- =======================================================================
-- MIGRATION SCRIPT FOR H05 (OPTION A)
-- Ejecuta este script en tu base de datos `sigma_mvp` para 
-- crear la nueva tabla `programas_formacion` y actualizar
-- la estructura de la tabla `grupos_formativos`.
-- =======================================================================

USE `sigma_mvp`;

SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;

-- 1. Crear tabla programas_formacion
CREATE TABLE IF NOT EXISTS `programas_formacion` (
  `id_programa` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nombre_programa` VARCHAR(150) NOT NULL,
  `id_area` BIGINT UNSIGNED NOT NULL,
  `estado` ENUM('ACTIVO', 'INACTIVO') NOT NULL DEFAULT 'ACTIVO',
  PRIMARY KEY (`id_programa`),
  UNIQUE KEY `uk_programa_nombre` (`nombre_programa`),
  KEY `fk_programa_area` (`id_area`),
  CONSTRAINT `fk_programa_area`
    FOREIGN KEY (`id_area`)
    REFERENCES `areas_formacion` (`id_area`)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Modificar la tabla grupos_formativos
-- Si ya borraste la tabla, puedes reemplazar este ALTER por un CREATE TABLE
ALTER TABLE `grupos_formativos`
  DROP FOREIGN KEY `fk_grupos_area`,
  DROP KEY `fk_grupos_area`,
  DROP COLUMN `id_area`,
  DROP COLUMN `programa`,
  ADD COLUMN `id_programa` BIGINT UNSIGNED NOT NULL AFTER `numero_ficha`,
  ADD KEY `fk_grupos_programa` (`id_programa`),
  ADD CONSTRAINT `fk_grupos_programa`
    FOREIGN KEY (`id_programa`)
    REFERENCES `programas_formacion` (`id_programa`)
    ON UPDATE CASCADE;

SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;

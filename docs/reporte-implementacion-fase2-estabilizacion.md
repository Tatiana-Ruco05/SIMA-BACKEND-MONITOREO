# Reporte de implementacion Fase 2 - Estabilizacion biometrica e IoT

## Resumen ejecutivo

Se inicio la Fase 2 por la subfase F2.0/F2.1, enfocada en estabilizar la columna vertebral de base de datos, modelos Sequelize y backlog antes de implementar nuevas pantallas, endpoints o servicio local Windows.

El cambio principal fue alinear `basededatos.sql` con el modelo backend ya existente `iotAttendanceAttempts.js`, adoptando `intentos_asistencia_iot` como entidad oficial para intentos biometricos de asistencia.

No se implementaron endpoints finales, servicio local BioMini, pantallas web ni pantallas moviles en este bloque.

## Archivos modificados

| Archivo | Tipo de cambio |
|---|---|
| `SIMA-BACKEND-MONITOREO/basededatos.sql` | Alineacion de modelo IoT, huellas, evidencias, notificaciones, seeds y triggers |
| `backlog/epica3.md` | Correccion de alcance de notificaciones |
| `backlog/epica4.md` | Correccion de alcance de notificaciones |
| `SIMA-BACKEND-MONITOREO/docs/reporte-implementacion-fase2-estabilizacion.md` | Reporte tecnico de cambios |

## Cambios aplicados

| Modulo | Cambio realizado | Motivo funcional | Finalidad tecnica | Riesgo resuelto |
|---|---|---|---|---|
| Intentos IoT | Se reemplazo la tabla `eventos_iot` por `intentos_asistencia_iot` en el SQL | El intento biometrico no representa acceso fisico a un ambiente | Alinear SQL con Sequelize y backlog | Backend apuntando a tabla inexistente |
| Intentos IoT | Se cambio `id_evento_iot` por `id_intento_iot` en evidencias y notificaciones | La trazabilidad debe apuntar al intento oficial | Mantener FK consistente con modelo `IoTAttendanceAttempt` | Evidencias/notificaciones colgantes |
| Intentos IoT | Se agregaron `evento_uuid`, `nonce`, `firma_evento`, `fecha_origen` y `expira_en` | Preparar contrato seguro HTTP servicio local -> backend | Soportar idempotencia, firma y anti-replay | Asistencia falsa o repetida |
| Intentos IoT | Se agrego `calidad_captura` al intento | Diagnosticar capturas exitosas o fallidas | Alinear con el modelo Sequelize | Fallos sin trazabilidad tecnica |
| Huellas | Se agrego `calidad_captura` a `huellas_biometricas` | Registrar calidad del enrolamiento exitoso | Alinear SQL con `biometricFingerprints.js` | Modelo esperando campo inexistente |
| Huellas | Se agrego validacion de calidad entre 0 y 100 | Evitar datos tecnicamente invalidos | Control declarativo en BD | Calidad fuera de rango |
| Asistencias | Se eliminaron reglas que obligaban `id_acceso` para `IOT_HUELLA` | La asistencia por huella depende del intento biometrico, no de acceso fisico | Separar `accesos_ambiente` del flujo IoT de asistencia | Mezcla de dominios |
| Seeds | Se actualizaron inserts de huellas con `calidad_captura` | Mantener datos iniciales compatibles | Evitar error por columna NOT NULL | Script de BD roto |
| Seeds | Se actualizaron inserts IoT a `intentos_asistencia_iot` | Mantener ejemplo coherente con modelo oficial | Validar relaciones intento-asistencia-evidencia | Seeds con tabla obsoleta |
| Backlog EP03 | Se cambio notificacion obligatoria en tiempo real por notificacion historica y emision inmediata si existe canal | Alinear con Fase 2 sin bloquear biometria | Eliminar contradiccion con EP06/EP07 | Sobrealcance de notificaciones |
| Backlog EP04 | Se normalizo el alcance de notificaciones de alertas | Separar registro obligatorio de canal push/tiempo real | Cerrar contradiccion MVP vs Fase 2 | QA con criterios incompatibles |

## Decisiones funcionales respetadas

- La huella es institucional por usuario, no por dispositivo.
- El dispositivo de enrolamiento queda como trazabilidad opcional.
- `intentos_asistencia_iot` es la fuente oficial de intentos biometricos.
- `accesos_ambiente` no debe mezclarse con asistencia biometrica.
- No se almacena imagen RAW.
- No se usa Cloudinary para biometria.
- QR y registro manual siguen siendo fallback.
- Facial SIMA productivo queda fuera de este bloque.
- Push completo queda fuera de este bloque.

## Validaciones ejecutadas

| Validacion | Resultado |
|---|---|
| Busqueda de `eventos_iot`, `id_evento_iot` y mensaje de trigger obsoleto en SQL/backend/backlog principal | Sin coincidencias obsoletas |
| Carga de modelos Sequelize con Node.js | Exitosa |
| Verificacion de `intentos_asistencia_iot`, `id_intento_iot` y `calidad_captura` en SQL | Presente |
| Verificacion de contradicciones fuertes de notificaciones en EP03/EP04 | Corregidas en reglas principales |
| Ejecucion real del SQL en MySQL | Pendiente: el cliente `mysql` no esta instalado en el entorno local de Codex |

## Pendientes para el siguiente bloque

1. Ejecutar `basededatos.sql` completo en MySQL Workbench o entorno objetivo.
2. Si el SQL ejecuta limpio, iniciar F2.2 con contrato final servicio local Windows -> backend.
3. Definir rutas/controladores reales para enrolamiento, revocacion e intentos IoT.
4. Implementar validacion de firma, nonce, timestamp, expiracion e idempotencia.
5. Probar regresion QR/manual antes de integrar flujo IoT real.
6. Preparar QA con lector BioMini fisico.

## Veredicto

La subfase inicial de estabilizacion queda avanzada: el SQL ya habla el mismo lenguaje que los modelos backend para intentos IoT, evidencias y notificaciones. El siguiente bloqueo real es validar la ejecucion completa del script en MySQL objetivo antes de implementar endpoints o servicio local.

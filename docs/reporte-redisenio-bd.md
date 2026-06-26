# Reporte de redisenio de base de datos SIMA

## Resumen ejecutivo

Se actualizo `basededatos.sql` para alinear la base de datos con el backlog vigente EP01-EP07. El redisenio incorpora el rol `SUPER_ADMIN`, controles de auditoria privilegiada, administracion de coordinadores por area, historial de lider instructor, sesiones y asistencias con anulacion funcional, justificaciones con metadatos de archivo, observaciones y alertas con trazabilidad, notificaciones historicas, y soporte IoT/biometrico dentro del MVP.

La implementacion mantiene el alcance solicitado: solo base de datos y documentacion. No se modifico backend, frontend ni aplicacion movil.

## Archivos modificados

| Archivo | Tipo de cambio | Finalidad |
| --- | --- | --- |
| `SIMA-BACKEND-MONITOREO/basededatos.sql` | Redisenio estructural completo | Soportar EP01-EP07 en esquema, restricciones, triggers y seeds. |
| `SIMA-BACKEND-MONITOREO/docs/reporte-redisenio-bd.md` | Documento nuevo | Dejar trazabilidad de cambios, motivos, riesgos resueltos y validaciones. |

## Decisiones funcionales consolidadas

| Decision | Aplicacion en BD |
| --- | --- |
| El primer `SUPER_ADMIN` nace por seed de datos. | Se crea rol `SUPER_ADMIN`, usuario seed y bandera `debe_cambiar_password = TRUE`. |
| No puede quedar el sistema sin `SUPER_ADMIN` activo. | Triggers bloquean desactivar, bloquear, cambiar rol o eliminar el ultimo `SUPER_ADMIN` activo. |
| Un coordinador solo puede tener un area activa y cada area solo un coordinador activo. | `coordinador_area` usa llaves unicas condicionales para asignaciones activas. |
| Los registros historicos no se eliminan fisicamente. | FKs restrictivas o `SET NULL`, anulaciones funcionales y ausencia de `ON DELETE CASCADE`. |
| Trimestre conserva `CANCELADO` como estado excepcional. | `grupo_trimestre.estado` admite `PROGRAMADO`, `ACTIVO`, `COMPLETADO`, `CANCELADO`. |
| Las huellas se almacenan en SIMA como plantilla cifrada por aplicacion. | `huellas_biometricas` usa `plantilla_biometrica_cifrada` y `plantilla_hash`; no existe campo de imagen cruda. |
| El dispositivo no almacena plantillas. | Las plantillas pertenecen al usuario en SIMA; el dispositivo solo queda como origen de enrolamiento/evento. |
| Intentos IoT fallidos no identificados deben conservarse. | `intentos_asistencia_iot.id_usuario` permite `NULL`; `accesos_ambiente` queda separado para trazabilidad de acceso fisico fuera del intento oficial. |
| `PENDIENTE` puede no tener origen. | `asistencias` permite `origen = NULL` solo cuando `estado_asistencia = 'PENDIENTE'`. |
| Las notificaciones son historicas. | No se eliminan en cascada; las referencias opcionales usan `ON DELETE SET NULL`. |

## Cambios por modulo

| Modulo | Cambio realizado | Motivo funcional | Finalidad tecnica | Epica / historia | Riesgo resuelto |
| --- | --- | --- | --- | --- | --- |
| Roles y usuarios | Se agrego rol `SUPER_ADMIN` y seed inicial con password bcrypt temporal. | Iniciar la jerarquia administrativa sin depender de un coordinador. | Permitir aprovisionamiento inicial reproducible. | EP07-H01, EP07-H02 | Arranque inseguro o ausencia de administrador global. |
| Roles y usuarios | Se agrego `debe_cambiar_password` a usuarios. | Forzar cambio de credencial temporal. | Separar credencial seed de credencial definitiva. | EP07-H01 | Uso prolongado de password inicial. |
| Roles y usuarios | Triggers protegen el ultimo `SUPER_ADMIN` activo. | Evitar bloqueo institucional total. | Rechazar actualizaciones/eliminaciones que dejen cero administradores activos. | EP07-H02 | Perdida de acceso del unico superadministrador. |
| Auditoria | Se creo `auditoria_privilegiada`. | Registrar acciones de alto impacto. | Guardar responsable, accion, entidad, valores, motivo, resultado y detalle. | EP07-H07 | Cambios sensibles sin trazabilidad. |
| Coordinadores y areas | Se redisenio `coordinador_area`. | Un coordinador activo por area y una sola area activa por coordinador. | Llaves generadas condicionales e historial por estado/fechas. | EP07-H03, EP02 | Areas con multiples responsables activos o coordinadores duplicados. |
| Coordinadores y areas | Se agregaron responsable de asignacion, cierre, fecha fin y motivo. | Conservar trazabilidad administrativa minima. | Campos `asignado_por`, `cerrado_por`, `fecha_fin`, `motivo_cierre`. | EP07-H03 | Cambios de asignacion sin responsable o motivo. |
| Trimestres | Estados oficiales: `PROGRAMADO`, `ACTIVO`, `COMPLETADO`, `CANCELADO`. | Mantener `COMPLETADO` y documentar cancelacion excepcional. | Enum consistente con reglas aprobadas. | EP02 | Inconsistencia entre backlog y esquema. |
| Trimestres | Trigger impide mas de un trimestre activo por grupo. | Evitar solapamientos academicos. | Validacion antes de insertar o actualizar. | EP02 | Sesiones y horarios apuntando a ciclos activos duplicados. |
| Horarios | Se agrego `id_ambiente`. | La sesion y el lector fisico requieren ambiente asociado. | FK contra `ambientes_formacion`. | EP05, EP07-H08 | Falta de ubicacion tecnica para IoT/asistencia. |
| Horarios | Se bloquean horarios si el grupo no esta en formacion o el trimestre no esta `PROGRAMADO`/`ACTIVO`. | Impedir horarios en trimestres completados/cancelados y grupos no operativos. | Triggers `trg_validar_horario_formacion_*`. | EP02 | Horarios activos en periodos cerrados. |
| Lider instructor | Se creo `instructor_lider_historial`. | Conservar ciclos historicos separados del lider vigente. | Tabla historica con fechas, responsable, estado y motivo. | EP02, EP07-H05 | Perdida de trazabilidad al cambiar lider. |
| Grupos | Se mantiene `grupos_formativos.id_instructor_lider` como lider vigente. | Consultas operativas necesitan acceso directo al lider actual. | Relacion vigente mas historial separado. | EP02 | Consultas complejas o ambiguas para lider actual. |
| Sesiones | Estados oficiales: `PROGRAMADA`, `ABIERTA`, `CERRADA`, `CANCELADA`. | Conservar cancelacion como anulacion funcional. | Enum de sesion y campos de motivo/responsable de cancelacion. | EP05 | Eliminacion fisica o estados no uniformes. |
| Asistencias | Estados oficiales: `PENDIENTE`, `PRESENTE`, `TARDE`, `INASISTENCIA`, `JUSTIFICADO`. | Eliminar `INASISTENTE` y `JUSTIFICADA`. | Enum corregido. | EP05-H07, EP05-H14, EP05-H15 | Incompatibilidad con backlog y portal aprendiz. |
| Asistencias | `origen = NULL` solo para `PENDIENTE`; origen obligatorio para marcas consolidadas. | Permitir lista base al abrir sesion sin falsificar metodo de registro. | Check constraint `chk_asistencia_origen`. | EP05-H14 | Marcas sin origen o pendientes con origen artificial. |
| Asistencias | Se agrego anulacion funcional. | Cancelar sesiones o corregir errores sin borrar evidencia. | Campos `anulada`, `fecha_anulacion`, `anulada_por`, `motivo_anulacion`. | EP05-H11 | Perdida de historial por eliminacion fisica. |
| Asistencias | Trigger impide asistencia activa en sesion cancelada. | Una sesion cancelada no debe generar asistencia vigente. | Validaciones de insert/update. | EP05-H11 | Registros validos sobre sesiones anuladas. |
| QR | Se conserva `qr_token_hash` sin semantica de expiracion corta. | El QR sigue siendo evidencia tecnica sin acoplarse a caducidad rigida. | Campo hash en sesion. | EP05 | Exposicion de token o regla temporal incorrecta. |
| Evidencias | Se amplio `evidencias_asistencia`. | Registrar QR, IoT, manual, geolocalizacion, validacion facial y resultado. | FK a intento IoT/dispositivo, detalle y metodo; `accesos_ambiente` queda como referencia heredada no oficial para Fase 1 biometrica. | EP05, EP06, EP07-H09 | Evidencia dispersa o destructiva. |
| Justificaciones | Estados `PENDIENTE`, `APROBADA`, `RECHAZADA`. | Alinear flujo aprobado. | Enum definitivo. | EP05-H15, EP06 | Estados ambiguos. |
| Justificaciones | Se agregaron metadatos de archivo. | Controlar soporte sin entrar aun a versionado completo. | Nombre original, MIME, tamano y hash. | EP05-H15 | Archivos sobrescritos sin trazabilidad minima. |
| Justificaciones | Una justificacion activa por asistencia. | Evitar multiples soportes inconsistentes vigentes. | `UNIQUE KEY uk_justificacion_asistencia_activa`. | EP05-H15 | Doble revision o estados contradictorios. |
| Observaciones | Tipos limitados a `ACADEMICA` y `CONVIVENCIAL`. | No existe tipo asistencial de observacion. | Enum corregido. | EP03, EP04 | Contradiccion con flujo de alertas asistenciales. |
| Observaciones | Se agrego origen, sesion asociada y llave unica para automaticas por aprendiz/sesion. | La inasistencia genera observacion academica automatica leve. | Campos `origen`, `id_sesion_formacion` e indice unico condicional. | EP03 | Duplicacion de observaciones automaticas. |
| Observaciones | Se agrego anulacion funcional. | Corregir observaciones abiertas no escaladas sin borrar historial. | Campos de anulacion y trigger de validacion. | EP03, EP07-H06 | Correcciones administrativas sin control. |
| Observaciones | Se impide eliminar observaciones. | Conservar evidencia historica. | Trigger `trg_no_eliminar_observaciones`. | EP03 | Borrado fisico de trazabilidad. |
| Observaciones-alertas | Se mantiene `alerta_observaciones` como relacion oficial. | Saber que observaciones soportan cada alerta. | Tabla puente con FK restrictivas. | EP04 | Alertas sin evidencia consultable. |
| Observaciones-alertas | Al asociar una observacion a alerta se cierra la observacion. | Mantener cierre automatico de observaciones escaladas. | Trigger `trg_cerrar_observacion_al_escalar`. | EP03, EP04 | Observaciones escaladas aun abiertas. |
| Alertas | Se evita alerta abierta duplicada por aprendiz, grupo y tipo. | La acumulacion debe actualizar una alerta abierta existente. | Llave unica condicional `uk_alerta_abierta_tipo`. | EP04 | Alertas repetidas por el mismo riesgo. |
| Alertas | Se conservan datos de cierre y reapertura. | Solo coordinador o SUPER_ADMIN puede cerrar/reabrir con motivo. | Campos de justificacion, fecha y responsable. | EP04, EP07-H05 | Cierres sin responsable o reaperturas sin contexto. |
| Notificaciones | Tipos ampliados: alerta, observacion, asistencia, sesion, justificacion, IoT y sistema. | Fase 1 exige respuesta inmediata y deja notificaciones historicas/push para Fase 2. | Enum ampliado y FKs opcionales para evolucion posterior. | EP06, EP07-H09 | Eventos MVP sin trazabilidad futura. |
| Notificaciones | Se retiro cualquier cascada destructiva. | La notificacion debe sobrevivir aunque la entidad se inactive o se limpie. | `ON DELETE SET NULL` o `RESTRICT`. | EP06 | Perdida de historial del aprendiz o del administrador. |
| Dispositivos IoT | Se completo monitoreo de conexion, sincronizacion, fallos y recuperacion. | Detectar fallos sin inspeccion manual. | Campos `ultima_conexion`, `ultima_sincronizacion`, `ultimo_fallo`, `fallos_consecutivos`, `fecha_recuperacion`. | EP07-H08, EP07-H09 | Incidentes IoT invisibles. |
| Dispositivos IoT | Estados `ACTIVO`, `INACTIVO`, `MANTENIMIENTO`. | Controlar operacion del lector. | Enum y validaciones en accesos/eventos. | EP07-H08 | Eventos desde dispositivos no operativos. |
| Intentos IoT | Se define `intentos_asistencia_iot` como fuente oficial. | Conservar intentos biometricos exitosos y fallidos sin tratarlos como acceso fisico. | Permite usuario nulo, sesion/dispositivo, resultado, calidad, firma, nonce, expiracion, motivo y detalle. | EP07-H09, EP05 | Fallos sin evidencia para soporte o eventos falsificables. |
| Accesos ambiente | `id_usuario` permite `NULL` en intentos no identificados. | Una huella fallida puede no mapearse a usuario. | FK opcional con resultado. | EP07-H09 | Imposibilidad de auditar intentos anonimos. |
| Huellas | `codigo_huella` se reemplazo por `plantilla_biometrica_cifrada`. | Aclarar que no es slot ni codigo externo, sino plantilla protegida. | `VARBINARY(4096)` para plantilla cifrada por aplicacion y `plantilla_hash` para unicidad. | EP07-H10 | Ambiguedad critica de seguridad biometrica. |
| Huellas | Estados `ACTIVA`, `REVOCADA`. | Eliminar `INACTIVA` del dominio de huellas. | Enum definitivo. | EP07-H10, EP07-H11 | Estados incoherentes con revocacion. |
| Huellas | Maximo dos huellas activas por usuario institucional, no por dispositivo. | Cumplir decision funcional de lector portable. | Triggers de insert/update. | EP07-H10 | Enrolamientos ilimitados o dependencia incorrecta del lector. |
| Huellas | Revocacion con responsable, fecha y motivo. | Renovar plantilla sin perder trazabilidad. | Check constraint estricto. | EP07-H11 | Revocaciones sin auditoria. |
| Seeds | Se ajustaron roles, usuarios, perfiles, area, grupo, lider, horario, dispositivo, huellas, eventos y asistencia. | Permitir levantar una base coherente con las nuevas restricciones. | Datos iniciales compatibles con llaves y triggers. | EP01-EP07 | Seeds rotos o contradictorios. |

## Restricciones y triggers principales

| Objeto | Proposito |
| --- | --- |
| `trg_proteger_ultimo_superadmin_upd` | Bloquea desactivar, bloquear o cambiar rol al ultimo `SUPER_ADMIN` activo. |
| `trg_proteger_ultimo_superadmin_del` | Bloquea eliminar el ultimo `SUPER_ADMIN` activo. |
| `trg_validar_grupo_trimestre_activo_ins/upd` | Evita mas de un trimestre activo por grupo. |
| `trg_validar_horario_formacion_ins/upd` | Impide horarios en grupos/trimestres no habilitados. |
| `trg_validar_asistencia_ins/upd` | Controla sesion cancelada, sesion abierta para marcas y evidencia IoT. |
| `trg_validar_justificacion_aprendiz_ins/upd` | Garantiza que la justificacion corresponda al aprendiz de la asistencia. |
| `trg_validar_anulacion_observacion` | Permite anular solo observaciones abiertas, no escaladas y con responsable/motivo. |
| `trg_cerrar_observacion_al_escalar` | Cierra la observacion cuando se asocia a una alerta. |
| `trg_validar_huella_ins/upd` | Exige usuario activo y maximo dos huellas activas. |
| `trg_validar_acceso_permitido` | Rechaza accesos desde dispositivos no activos y usuarios no habilitados. |

## Validaciones ejecutadas

| Validacion | Resultado |
| --- | --- |
| Conteo de tablas con `rg -c "^CREATE TABLE"` | 32 tablas. |
| Conteo de triggers con `rg -c "^CREATE TRIGGER"` | 16 triggers. |
| Conteo de llaves foraneas con `rg -c "FOREIGN KEY"` | 89 FKs. |
| Conteo de indices unicos con `rg -c "UNIQUE KEY"` | 33 indices unicos. |
| Busqueda de `INASISTENTE` | Sin coincidencias. |
| Busqueda de `JUSTIFICADA` | Sin coincidencias. |
| Busqueda de `codigo_huella` | Sin coincidencias. |
| Busqueda de `qr_expira` | Sin coincidencias. |
| Busqueda de `ON DELETE CASCADE` | Sin coincidencias. |
| Verificacion de `SUPER_ADMIN` | Rol, seed y protecciones presentes. |
| Verificacion de anulacion de observaciones | Campos y trigger presentes. |
| Verificacion de anulacion de asistencias | Campos y checks presentes. |
| Verificacion de intentos IoT | Tabla `intentos_asistencia_iot`, FKs, firma, nonce y usuario nullable presentes. |
| Verificacion de revocacion de huellas | Estado, responsable, fecha y motivo presentes. |

## Pendientes y recomendaciones futuras

| Tema | Recomendacion |
| --- | --- |
| Cifrado de plantillas | Implementar cifrado en capa de aplicacion con manejo seguro de llaves antes de persistir `plantilla_biometrica_cifrada`. La BD queda lista, pero no cifra por si misma. |
| Migraciones incrementales | Convertir este script base en migraciones versionadas antes de usarlo sobre datos productivos. |
| Versionado de soportes de justificacion | La BD conserva metadatos minimos; el versionado completo puede agregarse en una fase posterior. |
| Historial detallado de ciclos de alerta | Actualmente se conservan campos de cierre/reapertura vigentes; si se requieren multiples ciclos detallados, crear tabla de eventos de alerta. |
| Traslado historico de dispositivos | El dispositivo queda asociado a un ambiente vigente; el historial de traslados puede modelarse en fase posterior. |
| Biometria facial | Mantener contrato pendiente hasta recibir el proyecto facial; no se almaceno imagen cruda facial. |
| Pruebas con motor MySQL real | Ejecutar el script en una instancia MySQL/MariaDB objetivo para validar compatibilidad exacta de generated columns, checks y triggers. |

## Veredicto final

El esquema queda alineado documental y estructuralmente con las decisiones del backlog EP01-EP07: `SUPER_ADMIN` tiene alcance global auditado, coordinadores quedan restringidos por area, `COMPLETADO` se mantiene para trimestres, las asistencias soportan lista base `PENDIENTE`, las observaciones y alertas conservan trazabilidad, las notificaciones son historicas, y el flujo IoT/huella queda dentro del MVP con plantillas protegidas y eventos auditables.

La principal precaucion tecnica pendiente es ejecutar el SQL contra el motor definitivo y convertirlo en migraciones controladas si ya existen datos reales.

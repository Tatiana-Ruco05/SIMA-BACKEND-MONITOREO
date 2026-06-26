# Reporte de Implementacion - Fase 1 Biometria e IoT

## Resumen ejecutivo

Se implemento la alineacion inicial de Fase 1 para que SIMA use huella institucional por usuario, intentos biometricos IoT como evidencia tecnica y servicio local Windows como frontera futura con BioMini SDK. No se integro el SDK en el backend principal y se mantuvo QR/manual como fallback.

## Cambios aplicados

| Modulo | Cambio | Motivo | Finalidad |
|---|---|---|---|
| Backlog EP05 | Huella IoT deja de depender del dispositivo; respuesta inmediata reemplaza notificacion obligatoria | Decision funcional consolidada | Evitar validaciones incorrectas y sobrealcance |
| Backlog EP06 | Notificaciones completas pasan a Fase 2; huella consultada por usuario | Fase 1 debe cerrar sin push | Separar MVP biometrico de mensajeria completa |
| Backlog EP07 | Enrolamiento institucional por usuario; maximo dos huellas activas; `intentos_asistencia_iot` oficial | Lector portable | Corregir contradiccion por dispositivo |
| Base de datos | `huellas_biometricas` agrega `calidad_captura` | QA y diagnostico tecnico | Trazabilidad de calidad sin score obligatorio |
| Base de datos | `eventos_iot` se reemplaza por `intentos_asistencia_iot` | El evento no es acceso fisico | Fuente oficial para intentos biometricos |
| Base de datos | Evidencias y notificaciones referencian `id_intento_iot` | Alinear evidencias con intento oficial | Trazabilidad tecnica de asistencia |
| Base de datos | Asistencia IoT ya no exige `id_acceso` | `accesos_ambiente` no representa asistencia | Evitar dependencia de acceso fisico |
| Backend modelos | Huellas alineadas a plantilla cifrada/hash/calidad/estado `REVOCADA` | Modelo Sequelize estaba obsoleto | Compatibilidad con SQL vigente |
| Backend modelos | Nuevo modelo `IoTAttendanceAttempt` | Necesario para `intentos_asistencia_iot` | Preparar contrato backend |
| Backend modelos | Evidencias agregan `FACIAL_SIMA` e `id_intento_iot` | Facial SIMA queda como contrato | Persistir resultado funcional |
| Backend asistencia | Estados antiguos `INASISTENTE/JUSTIFICADA` migrados a `INASISTENCIA/JUSTIFICADO` | Estados oficiales del backlog | Evitar conversiones incorrectas |
| Backend asistencia | Manual solo permite `PRESENTE` o `TARDE` | `JUSTIFICADO` solo por soporte aprobado | Cumplir EP05 |
| Backend justificaciones | Se guardan metadatos de archivo y hash | SQL los exige | Evitar fallo runtime al cargar soporte |
| Documentacion | Se crea documento Fase 1 biometria/IoT | Formalizar contrato y QA | Reducir ambiguedad antes de SDK real |

## Riesgos resueltos

- Validar huellas por dispositivo cuando el lector sera portable.
- Guardar RAW o subir biometria a Cloudinary.
- Romper QR/manual por fallos del lector.
- Mantener estados de asistencia antiguos en backend.
- Mezclar acceso fisico a ambiente con intento biometrico de asistencia.
- Exigir notificaciones push/historicas para cerrar Fase 1.

## Pendientes controlados

- Implementar endpoint real para recibir intentos IoT firmados.
- Implementar verificacion criptografica de `firma_evento`.
- Implementar servicio local Windows productivo.
- Ejecutar pruebas con lector BioMini real.
- Definir integracion productiva de Facial SIMA.
- Implementar notificaciones push/historicas en Fase 2.

## Veredicto

La Fase 1 queda documental y estructuralmente alineada. El proyecto puede continuar con implementacion backend del contrato IoT y servicio local Windows sin volver a decisiones por dispositivo.

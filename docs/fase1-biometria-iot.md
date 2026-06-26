# Fase 1 - Biometria e IoT SIMA

## Resumen

Este documento formaliza la Fase 1 del modulo biometrico e IoT de SIMA. La fase deja preparada la columna vertebral funcional y tecnica sin integrar productivamente el SDK BioMini dentro del backend principal.

## Decisiones cerradas

| Decision | Resultado Fase 1 |
|---|---|
| Enrolamiento de huella | Institucional por usuario |
| Dependencia del dispositivo | No depende del dispositivo |
| Dispositivo de enrolamiento | Opcional, solo trazabilidad |
| Limite de huellas | Maximo 2 huellas `ACTIVA` por usuario |
| Plantilla | Cifrada/protegida, binaria, no expuesta por API |
| Hash | `plantilla_hash` global |
| Calidad de captura | Obligatoria como metadato tecnico |
| Score de matching | Fuera del MVP |
| Imagen RAW | Prohibida en SIMA, disco local y servicios externos |
| Cloudinary | Prohibido para huella y facial en Fase 1 |
| Servicio BioMini | Servicio local Windows separado |
| Backend SIMA | Valida reglas de negocio y persistencia |
| Intentos IoT | `intentos_asistencia_iot` |
| Notificaciones | Respuesta inmediata en Fase 1; push/historicas en Fase 2 |
| Facial SIMA | Contrato funcional y evidencia `FACIAL_SIMA`; integracion real posterior |

## Contrato funcional de intento IoT

El intento IoT representa un intento biometrico de asistencia, no un acceso fisico a un ambiente.

Campos minimos esperados:

| Campo | Regla |
|---|---|
| `id_dispositivo` | Dispositivo IoT registrado y `ACTIVO` |
| `id_sesion_formacion` | Opcional para fallos tecnicos; requerido para asistencia consolidable |
| `id_usuario` | Usuario identificado o `NULL` si no se identifica |
| `id_asistencia` | Solo si el intento exitoso consolida asistencia |
| `tipo_intento` | `ASISTENCIA`, `ENROLAMIENTO`, `REVOCACION`, `CONEXION`, `SINCRONIZACION`, `FALLO` |
| `resultado` | `EXITOSO`, `FALLIDO`, `RECHAZADO`, `RECUPERADO` |
| `calidad_captura` | 0 a 100 cuando aplica |
| `evento_uuid` | Identificador unico del evento |
| `nonce` | Valor unico anti-replay |
| `firma_evento` | Firma enviada por el servicio local |
| `fecha_origen` / `expira_en` | Ventana de validez del evento |
| `motivo` | Causa controlada |
| `detalle` | Descripcion tecnica sin biometria sensible |

## Responsabilidades por componente

| Componente | Responsabilidad |
|---|---|
| Servicio local Windows | Comunicarse con BioMini SDK, capturar en memoria, extraer plantilla, calcular calidad, firmar eventos y no persistir RAW |
| Backend SIMA | Validar dispositivo, sesion, usuario, lista base, duplicidad, evidencia, auditoria y persistencia |
| App movil | Mantener QR y biometria local; mostrar respuesta inmediata; no enviar biometria local real |
| Frontend web | Mantener registro manual y consulta administrativa sin depender del lector |
| Base de datos | Persistir huellas protegidas, intentos IoT, evidencias y trazabilidad sin datos biometricos crudos |

## Reglas de seguridad minima

- El servicio local debe autenticarse con credencial propia.
- Cada intento debe incluir `evento_uuid`, `nonce`, `firma_evento`, `fecha_origen` y `expira_en`.
- El backend debe rechazar eventos vencidos, repetidos o sin firma valida.
- La plantilla biometrica no debe exponerse por API, logs, auditoria ni listados.
- No se debe guardar imagen RAW en disco, base de datos, Cloudinary ni otro servicio externo.
- La demo facial de `Ejemplohuella` no es modulo productivo.
- Facial SIMA en Fase 1 solo persiste resultado funcional: `APROBADO`, `RECHAZADO` o `NO_DISPONIBLE`.

## QA minimo de Fase 1

| Caso | Resultado esperado |
|---|---|
| QR valido | Registra `PRESENTE` o `TARDE` sin depender del lector |
| Registro manual | Solo permite `PRESENTE` o `TARDE` en sesion `ABIERTA` |
| Lector caido | No bloquea QR ni registro manual |
| Intento IoT exitoso | Crea intento, evidencia y asistencia consolidada |
| Intento fallido identificado | Conserva usuario y causa controlada sin asistencia |
| Intento fallido no identificado | Conserva usuario `NULL`, dispositivo y causa controlada |
| Usuario inactivo | Rechaza enrolamiento e intento valido |
| Huella duplicada | Rechaza por `plantilla_hash` global |
| Tercera huella activa | Rechaza por limite de dos activas por usuario |
| RAW/Cloudinary | No existe archivo ni carga externa biometrica |
| Replay | Evento duplicado o vencido rechazado |

## Fuera de Fase 1

- Integracion productiva completa del SDK BioMini.
- Servicio local instalable final.
- Matching facial productivo.
- Notificaciones push/historicas completas.
- Dashboard avanzado IoT.
- Analitica biometrica.
- Score de matching obligatorio.
- Cloudinary para biometria.

# Reporte de Implementacion Fase 2.5 - Integracion Operativa Biometria IoT

## Resumen ejecutivo

Fase 2.5 reduce la brecha operativa entre la UI web y el lector BioMini. La pantalla de huellas deja de depender de pegar manualmente una plantilla base64 y pasa a usar un servicio local HTTP controlado en `127.0.0.1`, que captura con BioMini sin persistir RAW ni plantillas en disco.

Tambien se agregan manuales y checklist para ejecutar el flujo E2E real:

```txt
enrolar -> cifrar -> matching 1:N -> evento firmado -> intento IoT -> asistencia -> evidencia IOT_HUELLA
```

## Cambios implementados

| Area | Cambio | Motivo | Riesgo mitigado |
|---|---|---|---|
| Servicio local | Nuevo `biomini_local_service.py` con `/health`, `/capture/enrollment`, `/attendance/match`. | Permitir operacion desde UI sin pegar base64. | Enrolamiento manual inseguro. |
| Servicio local | CORS restringido a localhost de desarrollo. | Evitar invocacion desde origenes arbitrarios. | Exposicion local innecesaria. |
| Servicio local | Captura de enrolamiento devuelve plantilla solo en memoria de respuesta local. | La UI debe enviar al backend sin mostrar plantilla. | RAW/archivo local. |
| Frontend web | Nueva integracion `localBiominiService.js`. | Consumir el servicio local BioMini. | Operacion por scripts aislados. |
| Frontend web | `HuellasBiometricas.jsx` elimina textarea de plantilla. | Evitar pegar o visualizar base64. | Fuga o error operativo. |
| Frontend web | Estados visuales del lector. | Guiar al operador. | Operacion ciega. |
| Documentacion | Manual operativo F2.5. | Ejecutar pruebas reales repetibles. | Dependencia oral. |
| Documentacion | Checklist despliegue local F2.5. | Verificar Windows, SDK, backend, BD, frontend y seguridad. | Despliegue incompleto. |

## Evidencia tecnica esperada al ejecutar E2E

| Paso | Evidencia |
|---|---|
| Enrolamiento | Registro `huellas_biometricas` en estado `ACTIVA`. |
| Cifrado | `plantilla_biometrica_cifrada` no contiene plantilla plana. |
| Matching | Servicio local devuelve `MATCH_OK` solo si `UFMatcher.dll` identifica candidato. |
| Evento firmado | Backend responde al intento IoT firmado. |
| Intento | Registro en `intentos_asistencia_iot`. |
| Asistencia | Registro en `asistencias` pasa de `PENDIENTE` a `PRESENTE` o `TARDE`. |
| Evidencia | Registro en `evidencias_asistencia` con metodo `IOT_HUELLA`. |
| Auditoria | Registro en `auditoria_privilegiada` sin plantilla ni RAW. |

## Validaciones que requieren entorno fisico

- Captura real desde lector BioMini usando la UI.
- Enrolamiento contra backend y BD levantados.
- Matching local 1:N con plantillas reales.
- Asistencia IoT real sobre sesion `ABIERTA`.
- Regresion QR/manual antes y despues del flujo IoT.

## Pendientes controlados

1. Ejecutar el primer caso E2E con lector, BD, backend y frontend levantados.
2. Validar reemplazo atomico si se decide corregirlo en esta misma fase.
3. Automatizar pruebas de firma invalida, nonce duplicado, evento vencido y evento duplicado.
4. Convertir el servicio local en servicio residente/instalable en una fase posterior.

## Veredicto

La implementacion deja Fase 2.5 lista para prueba operativa real. El bloqueo restante no es documental ni de estructura: es ejecutar el caso E2E con hardware, datos reales de prueba y base de datos levantada.

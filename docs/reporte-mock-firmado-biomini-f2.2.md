# Reporte F2.2 - Mock local firmado BioMini

## Resumen ejecutivo

Se implemento un flujo local minimo para cerrar la frontera tecnica entre el lector BioMini y el futuro backend IoT de SIMA.

El nuevo flujo captura la huella con el SDK BioMini, extrae la plantilla en memoria, descarta el buffer sensible, arma un evento funcional sin biometria y lo valida contra un mock local con firma HMAC, `nonce`, `evento_uuid`, expiracion e idempotencia.

No se implementaron endpoints productivos, base de datos, pantallas ni persistencia real. Este entregable prepara la Fase 2.3.

## Archivos creados

| Archivo | Finalidad |
|---|---|
| `Ejemplohuella/Fast_api/app/biomini_probe.py` | Prueba segura de SDK, captura, calidad y extraccion de plantilla en memoria. |
| `Ejemplohuella/Fast_api/app/biomini_signed_mock.py` | Flujo de evento firmado y mock local con validacion anti-replay. |
| `SIMA-BACKEND-MONITOREO/docs/reporte-mock-firmado-biomini-f2.2.md` | Reporte de cierre tecnico del mock firmado. |

## Cambios realizados

| Cambio | Motivo | Finalidad |
|---|---|---|
| Se agrego `biomini_probe.py` | Evitar depender del demo `capturar.py`, que guarda RAW y plantillas `.dat`. | Validar el lector sin persistir biometria. |
| Se agrego `biomini_signed_mock.py` | Preparar el contrato seguro previo al backend real. | Simular evento SIMA firmado, idempotente y sin datos sensibles. |
| Se agrego firma HMAC SHA-256 | Evitar que un evento HTTP futuro pueda falsificarse trivialmente. | Dejar lista la regla que F2.3 debe validar. |
| Se agrego `evento_uuid` y `nonce` | Controlar duplicidad y replay. | Permitir rechazo de eventos repetidos. |
| Se agrego expiracion `expira_en` | Limitar la vida util de un evento capturado localmente. | Reducir riesgo de reenvio tardio. |
| Se agrego mock local en memoria | Validar contrato sin invadir F2.3. | Probar aceptacion, firma invalida futura y replay sin backend productivo. |
| Se prohibio enviar plantilla, RAW o imagen | Cumplir decisiones biometrica de Fase 1/Fase 2.2. | Reducir riesgo de fuga biometrica. |

## Payload funcional generado

El evento firmado incluye metadatos operativos y excluye biometria sensible:

```json
{
  "evento_uuid": "...",
  "nonce": "...",
  "fecha_origen": "...",
  "expira_en": "...",
  "id_dispositivo": "BIOMINI-LOCAL-001",
  "id_sesion_formacion": null,
  "id_usuario": null,
  "scanner_id": "...",
  "scanner_type": "...",
  "operacion": "ASISTENCIA_IOT_HUELLA",
  "resultado": "CAPTURA_OK",
  "motivo": "HUELLA_CAPTURADA",
  "calidad_captura": 100,
  "template_size": 576,
  "template_type": "SUPREMA",
  "lectores_encontrados": 1,
  "biometria_incluida": false,
  "firma_evento": "..."
}
```

Campos prohibidos en el payload:

- Plantilla biometrica.
- Imagen RAW.
- Imagen de huella.
- Secretos HMAC.
- Buffers internos del SDK.

## Validaciones ejecutadas

```powershell
python -m py_compile Ejemplohuella/Fast_api/app/biomini_signed_mock.py
python Ejemplohuella/Fast_api/app/biomini_signed_mock.py --help
python Ejemplohuella/Fast_api/app/biomini_signed_mock.py --mock-capture --simulate-replay
```

Resultado de la prueba simulada:

```txt
Mock backend respuesta: EVENTO_VALIDO
Mock backend replay: EVENTO_DUPLICADO
Firma generada: SI
RAW enviado: NO
Plantilla enviada: NO
Resultado: OK
```

## Comandos de uso

Prueba con lector real:

```powershell
cd C:\Users\usuario\Desktop\inex\Ejemplohuella\Fast_api\app
python .\biomini_signed_mock.py --simulate-replay
```

Prueba sin lector:

```powershell
python .\biomini_signed_mock.py --mock-capture --simulate-replay
```

Usar secreto de prueba desde entorno:

```powershell
$env:SIMA_BIOMINI_MOCK_SECRET="cambiar-por-secreto-local"
python .\biomini_signed_mock.py --mock-capture --simulate-replay
```

## Riesgos resueltos

| Riesgo | Estado |
|---|---|
| Copiar demo que guarda RAW | Mitigado. |
| Enviar plantilla al mock/backend | Mitigado. |
| Evento sin firma | Mitigado en mock. |
| Replay por reenvio del mismo evento | Mitigado en mock por `evento_uuid` y `nonce`. |
| Mezclar SDK BioMini dentro del backend Node.js | Evitado. |

## Pendientes para F2.3

- Crear endpoint backend real para recibir intentos IoT.
- Persistir eventos en `intentos_asistencia_iot`.
- Registrar evidencias `IOT_HUELLA`.
- Validar dispositivo activo contra base de datos.
- Validar sesion abierta, usuario activo y no duplicidad de asistencia.
- Reemplazar secreto de desarrollo por gestion segura de secretos.
- Definir respuesta funcional para usuario no identificado, mala calidad y sesion invalida.

## Veredicto

Fase 2.2 queda tecnicamente lista para avanzar a Fase 2.3 cuando el flujo real con lector ejecute correctamente `biomini_signed_mock.py`.

El proyecto ya cuenta con:

- Captura local segura.
- Extraccion de plantilla en memoria.
- Evento funcional sin biometria sensible.
- Firma HMAC.
- `nonce` y `evento_uuid`.
- Mock local anti-replay.

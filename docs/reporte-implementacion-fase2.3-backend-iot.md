# Reporte de implementacion Fase 2.3 - Backend IoT real

## Resumen ejecutivo

Se implemento el primer backend real para recibir intentos biometricos IoT firmados desde el servicio local BioMini.

El nuevo flujo expone `POST /api/iot/attendance-attempts`, valida firma HMAC, `evento_uuid`, `nonce`, ventana temporal, dispositivo activo, sesion abierta, aprendiz activo, pertenencia al grupo, calidad minima y asistencia pendiente. Si todo es valido, actualiza la fila base de asistencia a `PRESENTE` o `TARDE`, registra intento en `intentos_asistencia_iot` y crea evidencia `IOT_HUELLA`.

No se almacena RAW, imagen, plantilla, embedding ni biometria sensible en el payload, logs o evidencias.

## Archivos modificados o creados

| Archivo | Cambio |
|---|---|
| `src/config/env.js` | Agrega configuracion `SIMA_IOT_*`, secretos por dispositivo y calidad minima. |
| `src/helpers/iotSignature.js` | Nuevo helper HMAC compatible con el mock Python. |
| `src/services/IoTAttendanceService.js` | Nuevo servicio transaccional de recepcion, validacion y conversion intento -> asistencia. |
| `src/controller/iotAttendanceController.js` | Nuevo controlador HTTP IoT. |
| `src/routes/iotRoutes.js` | Nueva ruta `POST /attendance-attempts`. |
| `src/app.js` | Monta `/api/iot`. |
| `.env` | Agrega valores de desarrollo para pruebas locales. |
| `Ejemplohuella/Fast_api/app/biomini_signed_mock.py` | Agrega envio opcional al backend real con `--send-backend`. |

## Endpoint implementado

```txt
POST /api/iot/attendance-attempts
```

Payload esperado:

```json
{
  "evento_uuid": "...",
  "nonce": "...",
  "fecha_origen": "...",
  "expira_en": "...",
  "id_dispositivo": "ESP32-LAB-001",
  "id_sesion_formacion": 1,
  "id_usuario": 4,
  "scanner_id": "...",
  "scanner_type": "1007",
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

`id_dispositivo` puede ser el ID numerico de base de datos o el `codigo_dispositivo`. Internamente siempre se persiste el `id_dispositivo` numerico.

## Validaciones implementadas

| Validacion | Resultado si falla |
|---|---|
| Campos biometricos prohibidos | `BIOMETRIA_EXPUSTA`, sin persistir intento. |
| Secreto HMAC configurado para el dispositivo | `DISPOSITIVO_NO_AUTORIZADO`, sin persistir intento. |
| Firma HMAC valida | `FIRMA_INVALIDA`, sin persistir intento. |
| Operacion `ASISTENCIA_IOT_HUELLA` | `OPERACION_INVALIDA`. |
| Ventana temporal valida | `VENTANA_INVALIDA`, `EVENTO_EXPIRADO` o `FECHA_ORIGEN_FUTURA`. |
| `evento_uuid` o `nonce` duplicado | `EVENTO_DUPLICADO`, sin segunda marca. |
| Dispositivo registrado y `ACTIVO` | Rechazo funcional persistido si el dispositivo no esta activo. |
| Captura local exitosa | Rechazo funcional si `resultado` no es `CAPTURA_OK`. |
| Calidad minima | Rechazo funcional si `calidad_captura < SIMA_IOT_MIN_QUALITY`. |
| Usuario/aprendiz activo | Rechazo funcional. |
| Huella activa enrolada | Rechazo funcional. |
| Sesion `ABIERTA` | Rechazo funcional. |
| Vinculo activo aprendiz-grupo | Rechazo funcional. |
| Asistencia base `PENDIENTE` | Rechazo funcional por duplicidad o lista base faltante. |

## Respuestas principales

| Codigo | HTTP | Significado |
|---|---:|---|
| `ASISTENCIA_REGISTRADA` | 201 | Intento valido, asistencia marcada y evidencia creada. |
| `EVENTO_DUPLICADO` | 409 | `evento_uuid` o `nonce` ya recibido. |
| `FIRMA_INVALIDA` | 401 | Payload alterado o secreto incorrecto. |
| `EVENTO_EXPIRADO` | 409 | Evento vencido. |
| `DISPOSITIVO_INACTIVO` | 409 | Dispositivo no puede generar marcas validas. |
| `SESION_NO_ABIERTA` | 409 | La sesion no esta abierta. |
| `CALIDAD_BAJA` | 409 | Captura por debajo del umbral. |
| `APRENDIZ_FUERA_GRUPO` | 409 | Usuario no pertenece al grupo de la sesion. |
| `ASISTENCIA_DUPLICADA` | 409 | La fila base ya fue consolidada. |

## Pruebas realizadas

```powershell
node --check src/helpers/iotSignature.js
node --check src/services/IoTAttendanceService.js
node --check src/controller/iotAttendanceController.js
node --check src/routes/iotRoutes.js
node --check src/app.js
node -e "require('./src/app'); console.log('app import OK')"
python -m py_compile Ejemplohuella/Fast_api/app/biomini_signed_mock.py
python Ejemplohuella/Fast_api/app/biomini_signed_mock.py --mock-capture --simulate-replay
```

Resultado:

```txt
app import OK
Mock backend respuesta: EVENTO_VALIDO
Mock backend replay: EVENTO_DUPLICADO
RAW enviado: NO
Plantilla enviada: NO
```

## Prueba manual recomendada con backend encendido

1. Iniciar backend:

```powershell
cd C:\Users\usuario\Desktop\inex\SIMA-BACKEND-MONITOREO
npm run dev
```

2. En otra terminal, enviar evento simulado:

```powershell
cd C:\Users\usuario\Desktop\inex\Ejemplohuella\Fast_api\app
python .\biomini_signed_mock.py --mock-capture --send-backend --simulate-replay --id-dispositivo ESP32-LAB-001 --id-sesion-formacion 1 --id-usuario 4
```

3. Con lector real:

```powershell
python .\biomini_signed_mock.py --send-backend --simulate-replay --id-dispositivo ESP32-LAB-001 --id-sesion-formacion 1 --id-usuario 4
```

Los IDs deben corresponder a una sesion `ABIERTA`, usuario aprendiz activo, vinculo activo con el grupo, huella activa y asistencia base `PENDIENTE`.

## Riesgos controlados

- Firma invalida no se persiste como intento.
- Replay por `evento_uuid` o `nonce` no genera segunda marca.
- Eventos vencidos se rechazan.
- Dispositivos `INACTIVO` o `MANTENIMIENTO` no generan asistencia.
- No se toca QR ni registro manual.
- No se guarda biometria sensible.
- Evidencia `IOT_HUELLA` queda enlazada al intento.

## Pendientes para F2.4

- Sustituir secretos de desarrollo por secretos provisionados por dispositivo.
- Definir endpoint o flujo administrativo para administrar secretos IoT.
- Ajustar servicio local Python para descubrir o configurar el `codigo_dispositivo` real.
- Agregar pruebas automatizadas con una herramienta de test backend.
- Exponer consulta de intentos IoT para aprendiz/SUPER_ADMIN.
- Integrar respuesta visual final en UI/panel.

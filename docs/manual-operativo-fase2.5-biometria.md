# Manual Operativo Fase 2.5 - Biometria IoT SIMA

## Objetivo

Ejecutar el flujo real:

```txt
captura BioMini -> enrolamiento cifrado -> matching local 1:N -> evento firmado -> asistencia -> evidencia IOT_HUELLA
```

## Arranque minimo

1. Levantar base de datos SIMA con `basededatos.sql`.
2. Levantar backend Node.js.
3. Levantar frontend web.
4. Conectar lector BioMini y confirmar que el SDK lo detecta.
5. Levantar servicio local:

```powershell
cd C:\Users\usuario\Desktop\inex\Ejemplohuella\Fast_api\app
python .\biomini_local_service.py --id-dispositivo ESP32-LAB-001
```

El servicio expone:

- `GET http://127.0.0.1:8765/health`
- `POST http://127.0.0.1:8765/capture/enrollment`
- `POST http://127.0.0.1:8765/attendance/match`

## Enrolar huella desde la UI

1. Iniciar sesion como `SUPER_ADMIN` o instructor lider vigente autorizado.
2. Abrir `/biometria/huellas`.
3. Ingresar `ID usuario`, dispositivo opcional, dedo y motivo.
4. Pulsar `Verificar lector`.
5. Pulsar `Capturar desde BioMini`.
6. Confirmar que la UI muestra calidad, tamano y tipo de plantilla sin mostrar base64.
7. Pulsar `Enrolar huella`.
8. Verificar en BD:
   - `huellas_biometricas.estado = ACTIVA`
   - `plantilla_biometrica_cifrada` no es legible como plantilla plana
   - `plantilla_hash` existe
   - `calidad_captura` esta entre 0 y 100

## Registrar asistencia por huella

Prerequisitos:

- Dispositivo IoT `ACTIVO`.
- Sesion `ABIERTA`.
- Fila de asistencia `PENDIENTE`.
- Aprendiz activo con huella `ACTIVA`.

Comando:

```powershell
python .\biomini_match_attendance.py --id-dispositivo ESP32-LAB-001 --id-sesion-formacion 1
```

Verificaciones:

- `intentos_asistencia_iot` tiene el intento.
- `asistencias` cambia a `PRESENTE` o `TARDE`.
- `evidencias_asistencia.metodo = IOT_HUELLA`.
- No se genera segunda asistencia si se repite el evento.

## Revocar o reemplazar

1. En `/biometria/huellas`, filtrar por usuario.
2. Registrar motivo con al menos 10 caracteres.
3. Para revocar: pulsar `Revocar`.
4. Para reemplazar: capturar nueva huella y pulsar `Reemplazar`.
5. Verificar:
   - Huella anterior `REVOCADA`.
   - Nueva huella `ACTIVA`, si aplica.
   - Auditoria sin plantilla ni RAW.

## Diagnostico rapido

| Sintoma | Revision |
|---|---|
| UI no conecta lector | Confirmar `python .\biomini_local_service.py` y `GET /health`. |
| Lector no captura | Revisar driver, licencia, SDK y que otro proceso no tenga bloqueado el lector. |
| Backend rechaza matching package | Verificar secreto IoT, `id_dispositivo` y sesion `ABIERTA`. |
| Evento IoT no marca | Revisar usuario activo, aprendiz activo, vinculo activo, asistencia `PENDIENTE` y calidad. |
| QR/manual falla despues de IoT | Ejecutar regresion EP05 antes de continuar Fase 3. |

## Prohibiciones operativas

- No guardar RAW.
- No guardar imagen de huella.
- No pegar plantilla base64 como flujo operativo.
- No subir biometria a Cloudinary.
- No loguear plantilla, secreto, firma secreta ni buffers.
- No instalar SDK BioMini dentro del backend Node.js.

# Checklist de Despliegue Local Fase 2.5

## Windows y lector

- [ ] Windows detecta el BioMini en administrador de dispositivos.
- [ ] BioMini SDK instalado.
- [ ] Licencia SDK resuelta.
- [ ] `UFScanner.dll` existe en `C:\Program Files (x86)\Suprema\BioMini\bin\x64`.
- [ ] `UFMatcher.dll` existe en la misma carpeta.
- [ ] `python .\biomini_probe.py` detecta lector y captura sin RAW.
- [ ] No existen nuevos `.dat` generados por el flujo seguro.

## Backend

- [ ] `.env` tiene secretos IoT para el dispositivo usado.
- [ ] `.env` tiene `SIMA_BIOMETRIC_ENCRYPTION_KEY`.
- [ ] `.env` tiene `SIMA_BIOMETRIC_HASH_PEPPER`.
- [ ] Backend arranca sin error.
- [ ] `POST /api/biometrics/fingerprints/enroll` disponible.
- [ ] `POST /api/biometrics/fingerprints/matching-package` disponible.
- [ ] `POST /api/iot/attendance-attempts` disponible.

## Base de datos

- [ ] `huellas_biometricas` existe.
- [ ] `intentos_asistencia_iot` existe.
- [ ] `evidencias_asistencia` permite `IOT_HUELLA`.
- [ ] Existe usuario `SUPER_ADMIN` activo.
- [ ] Existe instructor lider vigente para prueba.
- [ ] Existe aprendiz activo vinculado a grupo activo.
- [ ] Existe sesion `ABIERTA`.
- [ ] Existe asistencia `PENDIENTE`.
- [ ] Existe dispositivo IoT `ACTIVO`.

## Frontend web

- [ ] Frontend arranca.
- [ ] Login `SUPER_ADMIN` redirige a biometria.
- [ ] `/biometria/huellas` carga.
- [ ] Boton `Verificar lector` responde.
- [ ] Boton `Capturar desde BioMini` captura sin mostrar base64.
- [ ] Enrolamiento registra huella.

## Servicio local

- [ ] Ejecutar:

```powershell
python .\biomini_local_service.py --id-dispositivo ESP32-LAB-001
```

- [ ] `GET http://127.0.0.1:8765/health` responde.
- [ ] CORS solo se permite para localhost de desarrollo.
- [ ] No se imprime plantilla en consola.
- [ ] No se escribe plantilla ni RAW a disco.

## Regresion obligatoria

- [ ] QR valido registra asistencia.
- [ ] QR invalido se rechaza.
- [ ] Manual `PRESENTE` funciona.
- [ ] Manual `TARDE` funciona.
- [ ] Manual `JUSTIFICADO` en sesion abierta se rechaza.
- [ ] IoT no genera doble marca.

## Seguridad

- [ ] Firma invalida se rechaza.
- [ ] Evento vencido se rechaza.
- [ ] Nonce duplicado se rechaza.
- [ ] `evento_uuid` duplicado no genera segunda asistencia.
- [ ] Huella revocada no valida asistencia.
- [ ] Dispositivo inactivo no valida asistencia.
- [ ] Sesion cerrada/cancelada no valida asistencia.

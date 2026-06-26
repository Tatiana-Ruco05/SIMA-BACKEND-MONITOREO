# Reporte de Implementacion Fase 2.4 - Enrolamiento Biometrico y Matching Local

## Resumen ejecutivo

Se implemento la base productiva de Fase 2.4 para gestionar huellas biometricas institucionales, proteger plantillas en reposo, permitir enrolamiento/revocacion/reemplazo con alcance controlado y habilitar matching local 1:N desde el servicio BioMini antes de registrar asistencia IoT.

La ruta `POST /api/iot/attendance-attempts` se mantiene y se extiende de forma compatible: ahora exige evidencia no sensible de match real (`match_status`, `matching_context_id`, `match_reference`) antes de convertir un intento con `id_usuario` en asistencia.

## Archivos principales modificados

| Modulo | Archivo | Cambio |
|---|---|---|
| Configuracion | `src/config/env.js` | Variables de cifrado biometrico, pepper, calidad minima y TTL de paquetes de matching. |
| Seguridad | `src/helpers/biometricCrypto.js` | Cifrado AES-256-GCM, hash HMAC-SHA256 y validacion de tamano del sobre cifrado. |
| Auditoria | `src/models/privilegedAudits.js`, `src/models/index.js` | Modelo Sequelize de auditoria privilegiada y asociaciones. |
| Backend huellas | `src/services/BiometricFingerprintService.js` | Enrolar, listar, revocar, reemplazar y construir paquetes efimeros de matching. |
| API huellas | `src/controller/biometricFingerprintsController.js`, `src/routes/biometricFingerprintsRoutes.js` | Endpoints de huellas y paquete interno de matching. |
| IoT asistencia | `src/routes/iotRoutes.js`, `src/services/IoTAttendanceService.js` | Metadata de match y rechazo de asistencia sin match real. |
| Acceso | `src/routes/usersroutes.js`, `src/routes/rolesroutes.js`, `src/services/UserService.js` | Permisos basicos para `SUPER_ADMIN` en gestion y consulta. |
| Frontend | `SIMA-FRONTEND/src/pages/biometria/*`, `src/services/biometricService.js`, `src/App.jsx`, `Sidebar.jsx`, `Login.jsx` | Pantalla minima operativa de huellas para enrolar, listar, revocar y reemplazar. |
| Servicio local | `Ejemplohuella/Fast_api/app/biomini_match_attendance.py`, `biomini_signed_mock.py` | Matching local 1:N con `UFMatcher.dll` y evento firmado con metadata de match. |
| Backlog | `backlog/epica1.md`, `backlog/epica6.md`, `backlog/epica7.md` | Permiso del instructor lider vigente acotado a aprendices activos de su grupo activo. |

## Cambios funcionales

| Cambio | Motivo | Finalidad | Riesgo resuelto |
|---|---|---|---|
| Enrolamiento permitido a `SUPER_ADMIN` global e instructor lider vigente acotado. | Escalar operacion sin dar acceso global a instructores. | Operacion presencial viable en grupos. | Instructor enrolando fuera de alcance. |
| Plantilla cifrada en backend antes de persistir. | La BD no cifra por si sola. | Proteger biometria en reposo. | Plantilla en claro en base de datos. |
| `plantilla_hash` con pepper. | Detectar duplicados sin comparar por texto plano. | Rechazar duplicados activos. | Reidentificacion directa por hash simple. |
| Maximo 2 huellas activas validado en backend. | Dar error claro antes de constraint/trigger. | Mejor UX y ultima defensa en BD. | Tercera huella activa por carrera o error operativo. |
| Paquete efimero de matching por sesion. | El servicio local necesita plantillas autorizadas para 1:N. | Comparar solo contra aprendices de la sesion/grupo. | Descarga masiva o exposicion innecesaria. |
| Evento IoT exige `MATCH_OK` y referencias de match. | Evitar que el servicio local declare un usuario sin comparar. | Convertir asistencia solo con identidad biometrica real. | Suplantacion por payload firmado con `id_usuario`. |
| UI minima web de huellas. | Evitar operacion por Postman como unica via. | Enrolar/revocar/reemplazar con mensajes y motivo. | Operacion manual fragil. |

## Servicio local BioMini

Se agrego `biomini_match_attendance.py` con flujo:

1. Solicita al backend un paquete de matching firmado.
2. Captura huella con BioMini sin guardar RAW ni plantilla.
3. Extrae plantilla en memoria.
4. Ejecuta matching 1:N local con `UFMatcher.dll`.
5. Firma el evento IoT con `MATCH_OK` solo si hay coincidencia.
6. Envia el intento a `POST /api/iot/attendance-attempts`.

El script `biomini_signed_mock.py` queda como herramienta de regresion: puede generar metadata de match para pruebas, pero no reemplaza el matching real.

## Validaciones ejecutadas

| Validacion | Resultado |
|---|---|
| `node --check src/helpers/biometricCrypto.js` | OK |
| `node --check src/services/BiometricFingerprintService.js` | OK |
| `node --check src/controller/biometricFingerprintsController.js` | OK |
| `node --check src/routes/biometricFingerprintsRoutes.js` | OK |
| `node -e "require('./src/app')"` | OK |
| `python -m py_compile biomini_probe.py biomini_signed_mock.py biomini_match_attendance.py` | OK |
| `npm test` backend | OK, pero el proyecto no define pruebas reales. |
| `npm run build` frontend | OK despues de restaurar `react-toastify` declarado en `package.json`. |

## Observaciones de validacion

- El primer build frontend fallo porque `react-toastify` estaba declarado pero no instalado fisicamente en `node_modules`. Se ejecuto `npm install` para sincronizar dependencias declaradas y luego el build paso.
- `npm install` reporto 6 vulnerabilidades en dependencias. No se ejecuto `npm audit fix` para evitar cambios de version fuera del alcance de F2.4.
- El backend no tiene suite de pruebas automatizadas; `npm test` solo imprime `No tests defined`.

## Pendientes recomendados

1. Probar `biomini_match_attendance.py` con backend levantado, una sesion abierta, dispositivo activo y al menos una huella enrolada con el nuevo cifrado.
2. Agregar pruebas automatizadas para:
   - firma invalida,
   - instructor fuera de alcance,
   - tercera huella activa,
   - revocacion sin motivo,
   - evento IoT con `id_usuario` pero sin `MATCH_OK`.
3. Mejorar el reemplazo para garantizar una transaccion unica de revocacion + nuevo enrolamiento.
4. Agregar integracion UI-servicio local para evitar pegar manualmente plantilla base64 en la pantalla web.
5. Definir rotacion formal de llaves biometricas para una fase posterior.

## Veredicto

Fase 2.4 queda implementada como base funcional: backend, cifrado, permisos, paquete de matching, extension IoT, servicio local de matching y pantalla minima existen y compilan. La validacion real end-to-end requiere levantar backend, enrolar una huella real con la nueva API y ejecutar el script local con el lector BioMini.

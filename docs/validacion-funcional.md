## Validacion Funcional Manual

Este archivo define una matriz de validacion funcional manual para ejecutar sobre el backend de SIMA usando Insomnia, Postman, Thunder Client o una herramienta equivalente.

Su objetivo es comprobar que el comportamiento real del sistema coincide con las reglas de negocio, los permisos por rol y la documentacion activa del proyecto.

## Alcance

Modulos cubiertos en esta matriz:

- `auth`
- `users`
- `roles`
- `profile`
- `dashboard`
- `coordinator-areas`
- `formative-programs`
- `groups`
- `apprentices`
- `observations`
- `alerts`
- `permissions` como placeholder tecnico

Queda fuera por ahora:

- pruebas internas unitarias de servicios
- pruebas de configuracion de entorno
- verificacion automatica por eventos no expuestos como endpoint directo

## Herramienta sugerida

- Insomnia

## Base URL sugerida

```text
http://localhost:3000
```

## Convencion de respuesta esperada

Las respuestas del backend usan, de forma general, el siguiente envoltorio:

```json
{
  "ok": true,
  "message": "Mensaje de respuesta",
  "data": {}
}
```

En respuestas de error se espera:

```json
{
  "ok": false,
  "message": "Mensaje de error"
}
```

## Variables sugeridas en Insomnia

- `base_url`
- `token_coordinador`
- `token_instructor_lider`
- `token_instructor_asignado`
- `token_instructor_sin_acceso`
- `token_aprendiz`
- `token_usuario_inactivo_previo`
- `doc_coordinador`
- `password_coordinador`
- `doc_instructor`
- `password_instructor`
- `doc_aprendiz`
- `password_aprendiz`
- `doc_usuario_inactivo`
- `password_usuario_inactivo`
- `id_usuario`
- `id_usuario_coordinador`
- `id_usuario_instructor`
- `id_usuario_aprendiz`
- `id_usuario_inactivo`
- `id_rol_coordinador`
- `id_rol_instructor`
- `id_rol_aprendiz`
- `id_area_valida`
- `id_area_sin_acceso`
- `id_programa_area_coordinador`
- `id_programa_area_ajena`
- `id_grupo_lider`
- `id_grupo_asignado`
- `id_grupo_sin_acceso`
- `id_grupo_area_ajena`
- `numero_ficha`
- `numero_ficha_nueva`
- `numero_ficha_fuera_alcance`
- `numero_ficha_actual_aprendiz`
- `numero_ficha_distinta`
- `id_ambiente`
- `id_instructor_activo`
- `id_instructor_inactivo`
- `id_aprendiz_grupo_lider`
- `id_aprendiz_grupo_asignado`
- `id_aprendiz_sin_acceso`
- `id_aprendiz_alertas`
- `id_observacion_abierta_lider`
- `id_observacion_abierta_asignado`
- `id_observacion_abierta_1`
- `id_observacion_abierta_2`
- `id_observacion_abierta_3`
- `id_observacion_cerrada`
- `id_alerta_activa`
- `id_alerta_cerrada`
- `id_alerta_con_observaciones`
- `doc_usuario_nuevo`
- `email_usuario_nuevo`
- `doc_usuario_existente`
- `email_usuario_existente`
- `doc_aprendiz_existente`
- `nombres_aprendiz_existente`
- `apellidos_aprendiz_existente`
- `email_aprendiz_existente`
- `busqueda_usuario`

## Precondiciones de datos

Antes de ejecutar la matriz, conviene contar al menos con este escenario:

1. Un `coordinador` activo con al menos un area asignada en `coordinador_area`.
2. Un area no asignada al coordinador para validar denegaciones.
3. Un programa perteneciente a un area asignada al coordinador.
4. Un programa perteneciente a un area no asignada al coordinador.
5. Un `instructor_lider` activo que sea lider de un grupo activo.
6. Un `instructor_asignado` activo con relacion activa en `instructor_grupo`, pero que no sea lider de ese mismo grupo.
7. Un `instructor_sin_acceso` activo sin relacion con el grupo usado en las pruebas.
8. Un `instructor_inactivo` para validar rechazo al asignarlo como lider.
9. Un `aprendiz` activo matriculado en el grupo del instructor lider.
10. Un segundo aprendiz en un grupo distinto, fuera del alcance del instructor probado.
11. Un `grupo_activo` asociado a un programa del area del coordinador.
12. Un segundo grupo fuera del area del coordinador.
13. Una ficha disponible para crear grupo.
14. Un archivo `.xlsx` valido para registro masivo.
15. Una observacion abierta creada por el instructor lider.
16. Una observacion abierta creada por el instructor asignado.
17. Una observacion cerrada por asociacion a una alerta. Para validar edicion de observacion cerrada con `409 Conflict`, debe haber sido creada por el mismo instructor usado en el token de la prueba.
18. Una alerta activa asociada a un aprendiz dentro del alcance del coordinador.
19. Una alerta cerrada asociada a un aprendiz dentro del alcance del coordinador.
20. Datos suficientes en `vw_inasistencias_validas` si se desea validar reglas de inasistencia.

## Regla funcional clave validada

La politica actualmente esperada es:

- `coordinador`: consulta y gestiona dentro de sus areas asignadas.
- `instructor_lider`: puede consultar su grupo y registrar aprendices en su ficha.
- `instructor_asignado`: puede consultar grupos y aprendices relacionados, pero no registrar aprendices en una ficha donde no es lider.
- `aprendiz`: no debe tener acceso a modulos administrativos.

## Flujo 1. Autenticacion

### Caso A1. Login correcto por numero_documento

- `POST {{base_url}}/api/auth/login`
- token: no requiere

Body:

```json
{
  "numero_documento": "{{doc_coordinador}}",
  "password": "{{password_coordinador}}"
}
```

Esperado:

- `200 OK`
- respuesta con `ok: true`
- incluye `data.token`
- incluye `data.user`
- incluye `data.user.rol`

Nota operativa:

- El usuario debe existir y estar `ACTIVO`.
- Guardar `data.token` como `token_coordinador`.

### Caso A2. Login con credenciales incorrectas

- `POST {{base_url}}/api/auth/login`
- token: no requiere

Body:

```json
{
  "numero_documento": "{{doc_coordinador}}",
  "password": "password_incorrecto"
}
```

Esperado:

- `401 Unauthorized`
- respuesta con `ok: false`
- no entrega token

### Caso A2.1. Login con campos faltantes

- `POST {{base_url}}/api/auth/login`
- token: no requiere

Body:

```json
{
  "numero_documento": "{{doc_coordinador}}"
}
```

Esperado:

- `400 Bad Request`
- respuesta con `ok: false`
- no entrega token

### Caso A2.2. Login de usuario inactivo

- `POST {{base_url}}/api/auth/login`
- token: no requiere

Body:

```json
{
  "numero_documento": "{{doc_usuario_inactivo}}",
  "password": "{{password_usuario_inactivo}}"
}
```

Esperado:

- `403 Forbidden`
- respuesta con `ok: false`
- no entrega token

### Caso A3. Usuario autenticado

- `GET {{base_url}}/api/auth/me`
- token: `token_coordinador`

Esperado:

- `200 OK`
- respuesta con `ok: true`
- retorna datos del usuario autenticado

### Caso A4. Usar token antiguo de usuario desactivado

- `GET {{base_url}}/api/auth/me`
- token: `token_usuario_inactivo_previo`

Precondiciones:

1. Hacer login con un usuario activo.
2. Guardar su token en `token_usuario_inactivo_previo`.
3. Desactivar el usuario con `DELETE /api/users/{{id_usuario_inactivo}}`.
4. Reutilizar el token guardado.

Esperado:

- `403 Forbidden`
- respuesta con `ok: false`

## Flujo 2. Usuarios

### Caso U1. Coordinador consulta listado de usuarios paginado

- `GET {{base_url}}/api/users?page=1&limit=10`
- token: `token_coordinador`

Esperado:

- `200 OK`
- respuesta con `ok: true`
- incluye `data.total`
- incluye `data.pagina`
- incluye `data.usuarios`

### Caso U1.1. Coordinador filtra usuarios

- `GET {{base_url}}/api/users?page=1&limit=10&rol=aprendiz&estado=ACTIVO&q={{busqueda_usuario}}`
- token: `token_coordinador`

Esperado:

- `200 OK`
- respuesta con `ok: true`
- retorna usuarios filtrados por rol, estado y busqueda

### Caso U2. Instructor intenta consultar listado de usuarios

- `GET {{base_url}}/api/users`
- token: `token_instructor_lider`

Esperado:

- `403 Forbidden`

### Caso U3. Coordinador consulta detalle de usuario

- `GET {{base_url}}/api/users/{{id_usuario}}`
- token: `token_coordinador`

Esperado:

- `200 OK`

### Caso U4. Aprendiz intenta consultar detalle de usuario administrativo

- `GET {{base_url}}/api/users/{{id_usuario_coordinador}}`
- token: `token_aprendiz`

Esperado:

- `403 Forbidden`

### Caso U5. Coordinador crea usuario

- `POST {{base_url}}/api/users`
- token: `token_coordinador`

Body:

```json
{
  "email": "{{email_usuario_nuevo}}",
  "id_rol": "{{id_rol_coordinador}}",
  "tipo_documento": "CC",
  "numero_documento": "{{doc_usuario_nuevo}}",
  "nombres": "Nuevo",
  "apellidos": "Usuario",
  "telefono": "3000001111",
  "password": "Usuario123"
}
```

Esperado:

- `201 Created`
- respuesta con `ok: true`
- crea usuario con rol y persona asociados

Nota operativa:

- `email`, `id_rol`, `tipo_documento`, `numero_documento`, `nombres` y `apellidos` son obligatorios.

### Caso U6. Coordinador cambia rol de usuario

- `PUT {{base_url}}/api/users/{{id_usuario}}`
- token: `token_coordinador`

Body:

```json
{
  "id_rol": "{{id_rol_aprendiz}}"
}
```

Esperado:

- `200 OK`
- el rol cambia
- el perfil asociado se sincroniza segun el nuevo rol

### Caso U7. Coordinador desactiva usuario

- `DELETE {{base_url}}/api/users/{{id_usuario}}`
- token: `token_coordinador`

Esperado:

- `200 OK`
- usuario queda `INACTIVO`

Nota operativa:

- La operacion es una desactivacion logica.

### Caso U8. Crear usuario con email invalido

- `POST {{base_url}}/api/users`
- token: `token_coordinador`

Body:

```json
{
  "tipo_documento": "CC",
  "numero_documento": "{{doc_usuario_nuevo}}",
  "nombres": "Usuario",
  "apellidos": "Invalido",
  "email": "correo-invalido",
  "id_rol": "{{id_rol_aprendiz}}"
}
```

Esperado:

- `400 Bad Request`
- respuesta con `ok: false`

### Caso U9. Crear usuario con documento o email duplicado

- `POST {{base_url}}/api/users`
- token: `token_coordinador`

Body:

```json
{
  "tipo_documento": "CC",
  "numero_documento": "{{doc_usuario_existente}}",
  "nombres": "Duplicado",
  "apellidos": "Prueba",
  "email": "{{email_usuario_existente}}",
  "id_rol": "{{id_rol_aprendiz}}"
}
```

Esperado:

- `409 Conflict`
- respuesta con `ok: false`

## Flujo 3. Roles

### Caso R1. Obtener roles

- `GET {{base_url}}/api/roles`
- token: cualquier usuario autenticado activo

Esperado:

- `200 OK`

### Caso R2. Obtener usuarios de un rol

- `GET {{base_url}}/api/roles/{{id_rol_aprendiz}}/usuarios`
- token: `token_coordinador`

Esperado:

- `200 OK`

### Caso R3. Instructor intenta obtener usuarios de un rol

- `GET {{base_url}}/api/roles/{{id_rol_aprendiz}}/usuarios`
- token: `token_instructor_lider`

Esperado:

- `403 Forbidden`

### Caso R4. Asignar rol a usuario

- `PUT {{base_url}}/api/roles/usuarios/{{id_usuario}}`
- token: `token_coordinador`

Body:

```json
{
  "id_rol": "{{id_rol_instructor}}"
}
```

Esperado:

- `200 OK`
- el usuario cambia de rol
- no queda inconsistencia entre `usuarios`, `instructores` y `aprendices`

### Caso R5. Consultar rol por ID

- `GET {{base_url}}/api/roles/{{id_rol_aprendiz}}`
- token: cualquier usuario autenticado activo

Esperado:

- `200 OK`
- respuesta con `ok: true`

## Flujo 4. Perfil propio

### Caso P1. Consultar perfil propio

- `GET {{base_url}}/api/profile/overview`
- token: cualquier usuario autenticado activo

Esperado:

- `200 OK`

### Caso P2. Actualizar email o telefono propio

- `PUT {{base_url}}/api/profile/overview`
- token: cualquier usuario autenticado activo

Body:

```json
{
  "email": "perfil.actualizado@sena.edu.co",
  "telefono": "3001234567"
}
```

Esperado:

- `200 OK`
- actualiza solo los campos permitidos

Nota operativa:

- Si el email ya existe, el backend debe responder conflicto.

### Caso P3. Cambiar password sin `password_actual`

- `PUT {{base_url}}/api/profile/overview`
- token: cualquier usuario autenticado activo

Body:

```json
{
  "password_nuevo": "NuevaClave123"
}
```

Esperado:

- `400 Bad Request`
- respuesta con `ok: false`

## Flujo 5. Dashboard y areas de coordinador

### Caso D1. Resumen del coordinador

- `GET {{base_url}}/api/dashboard/coordinador/resumen`
- token: `token_coordinador`

Esperado:

- `200 OK`

### Caso D2. Instructor intenta ver dashboard de coordinador

- `GET {{base_url}}/api/dashboard/coordinador/resumen`
- token: `token_instructor_lider`

Esperado:

- `403 Forbidden`

### Caso D3. Detalle de area permitida

- `GET {{base_url}}/api/dashboard/coordinador/area/{{id_area_valida}}`
- token: `token_coordinador`

Esperado:

- `200 OK`

### Caso D4. Detalle de area fuera de alcance

- `GET {{base_url}}/api/dashboard/coordinador/area/{{id_area_sin_acceso}}`
- token: `token_coordinador`

Esperado:

- `403 Forbidden`

### Caso C1. Asignar area a coordinador

- `POST {{base_url}}/api/coordinator-areas`
- token: `token_coordinador`

Body:

```json
{
  "id_area": "{{id_area_valida}}",
  "id_usuario": "{{id_usuario_coordinador}}"
}
```

Esperado:

- `201 Created` si crea asignacion nueva
- `200 OK` si reactiva una asignacion existente

### Caso C2. Consultar areas de coordinador

- `GET {{base_url}}/api/coordinator-areas/{{id_usuario_coordinador}}`
- token: `token_coordinador`

Esperado:

- `200 OK`

### Caso C3. Eliminar asignacion de area a coordinador

- `DELETE {{base_url}}/api/coordinator-areas/{{id_usuario_coordinador}}/{{id_area_valida}}`
- token: `token_coordinador`

Esperado:

- `200 OK`
- respuesta con `ok: true`

Nota operativa:

- La eliminacion corresponde a desactivar o retirar la asignacion.

## Flujo 6. Programas de formacion

### Caso F1. Coordinador consulta programas de un area permitida

- `GET {{base_url}}/api/formative-programs/area/{{id_area_valida}}`
- token: `token_coordinador`

Esperado:

- `200 OK`

### Caso F2. Coordinador consulta programas de un area fuera de alcance

- `GET {{base_url}}/api/formative-programs/area/{{id_area_sin_acceso}}`
- token: `token_coordinador`

Esperado:

- `403 Forbidden`

## Flujo 7. Grupos

### Caso G1. Coordinador lista grupos de sus areas

- `GET {{base_url}}/api/groups?page=1&limit=10&estado=ACTIVO`
- token: `token_coordinador`

Esperado:

- `200 OK`
- solo aparecen grupos de sus areas asignadas

### Caso G2. Instructor lider lista grupos

- `GET {{base_url}}/api/groups`
- token: `token_instructor_lider`

Esperado:

- `200 OK`
- aparecen solo sus grupos accesibles

### Caso G3. Instructor asignado lista grupos

- `GET {{base_url}}/api/groups`
- token: `token_instructor_asignado`

Esperado:

- `200 OK`
- aparecen grupos donde es lider o donde tiene asignacion activa

### Caso G4. Instructor sin acceso consulta grupo ajeno

- `GET {{base_url}}/api/groups/{{id_grupo_sin_acceso}}`
- token: `token_instructor_sin_acceso`

Esperado:

- `403 Forbidden`

### Caso G5. Instructor asignado consulta grupo asignado

- `GET {{base_url}}/api/groups/{{id_grupo_asignado}}`
- token: `token_instructor_asignado`

Esperado:

- `200 OK`

### Caso G6. Coordinador consulta instructores disponibles

- `GET {{base_url}}/api/groups/instructores-disponibles`
- token: `token_coordinador`

Esperado:

- `200 OK`
- retorna instructores activos disponibles para seleccion en el formulario del grupo

### Caso G7. Instructor intenta consultar instructores disponibles

- `GET {{base_url}}/api/groups/instructores-disponibles`
- token: `token_instructor_lider`

Esperado:

- `403 Forbidden`

### Caso G8. Coordinador crea grupo en programa permitido

- `POST {{base_url}}/api/groups`
- token: `token_coordinador`

Body:

```json
{
  "numero_ficha": "{{numero_ficha_nueva}}",
  "id_programa": "{{id_programa_area_coordinador}}",
  "jornada": "Manana",
  "trimestres": 6,
  "fecha_inicio": "2026-06-01",
  "id_ambiente": "{{id_ambiente}}",
  "id_instructor_lider": "{{id_instructor_activo}}"
}
```

Esperado:

- `201 Created`

Nota operativa:

- `id_instructor_lider` se puede enviar desde la creacion del grupo.
- Si se envia, el grupo queda creado con el lider ya asignado.
- Si no se envia, el grupo se crea inicialmente con `id_instructor_lider = null`.
- La asignacion o cambio posterior del lider se puede hacer con `PATCH /api/groups/:id/instructor-lider`.

### Caso G9. Coordinador intenta crear grupo en programa fuera de su alcance

- `POST {{base_url}}/api/groups`
- token: `token_coordinador`

Body:

```json
{
  "numero_ficha": "{{numero_ficha_fuera_alcance}}",
  "id_programa": "{{id_programa_area_ajena}}",
  "jornada": "Manana",
  "trimestres": 6,
  "fecha_inicio": "2026-06-01"
}
```

Esperado:

- `403 Forbidden`

Precondicion:

- `id_programa_area_ajena` debe pertenecer a un area no asignada al coordinador autenticado.

### Caso G10. Coordinador cambia estado de grupo permitido

- `PATCH {{base_url}}/api/groups/{{id_grupo_lider}}/estado`
- token: `token_coordinador`

Body:

```json
{
  "estado": "CERRADO"
}
```

Esperado:

- `200 OK`

### Caso G11. Coordinador intenta cambiar estado de grupo fuera de su area

- `PATCH {{base_url}}/api/groups/{{id_grupo_area_ajena}}/estado`
- token: `token_coordinador`

Body:

```json
{
  "estado": "SUSPENDIDO"
}
```

Esperado:

- `403 Forbidden`

### Caso G12. Coordinador asigna instructor lider a un grupo

- `PATCH {{base_url}}/api/groups/{{id_grupo_lider}}/instructor-lider`
- token: `token_coordinador`

Body:

```json
{
  "id_instructor": "{{id_instructor_activo}}"
}
```

Esperado:

- `200 OK`
- el grupo queda con `id_instructor_lider` asignado
- el detalle del grupo ya debe mostrar el instructor lider asociado

### Caso G13. Verificar disponibilidad de ficha

- `GET {{base_url}}/api/groups/verificar-ficha/{{numero_ficha}}`
- token: `token_coordinador`

Esperado:

- `200 OK`
- respuesta con `ok: true`

### Caso G14. Coordinador actualiza grupo permitido

- `PUT {{base_url}}/api/groups/{{id_grupo_lider}}`
- token: `token_coordinador`

Body:

```json
{
  "jornada": "Tarde",
  "trimestres": 6,
  "fecha_inicio": "2026-06-01"
}
```

Esperado:

- `200 OK`
- respuesta con `ok: true`

### Caso G15. Coordinador intenta actualizar grupo con programa fuera de alcance

- `PUT {{base_url}}/api/groups/{{id_grupo_lider}}`
- token: `token_coordinador`

Body:

```json
{
  "id_programa": "{{id_programa_area_ajena}}"
}
```

Esperado:

- `403 Forbidden`
- respuesta con `ok: false`

### Caso G16. Coordinador envia estado de grupo invalido

- `PATCH {{base_url}}/api/groups/{{id_grupo_lider}}/estado`
- token: `token_coordinador`

Body:

```json
{
  "estado": "FINALIZADO"
}
```

Esperado:

- `400 Bad Request`
- respuesta con `ok: false`

### Caso G17. Coordinador intenta asignar instructor inactivo como lider

- `PATCH {{base_url}}/api/groups/{{id_grupo_lider}}/instructor-lider`
- token: `token_coordinador`

Body:

```json
{
  "id_instructor": "{{id_instructor_inactivo}}"
}
```

Esperado:

- `404 Not Found`
- respuesta con `ok: false`

## Flujo 8. Aprendices

### Caso AP1. Coordinador consulta grupos activos

- `GET {{base_url}}/api/apprentices/grupos-activos`
- token: `token_coordinador`

Esperado:

- `200 OK`

### Caso AP2. Instructor lider consulta grupos activos

- `GET {{base_url}}/api/apprentices/grupos-activos`
- token: `token_instructor_lider`

Esperado:

- `200 OK`

### Caso AP3. Instructor asignado consulta grupos activos

- `GET {{base_url}}/api/apprentices/grupos-activos`
- token: `token_instructor_asignado`

Esperado:

- `200 OK`
- aparecen grupos donde es lider o donde tiene asignacion activa

### Caso AP4. Coordinador consulta listado global de aprendices

- `GET {{base_url}}/api/apprentices/listado?page=1&limit=10&estado=ACTIVO`
- token: `token_coordinador`

Esperado:

- `200 OK`
- solo ve aprendices de sus areas

### Caso AP5. Instructor intenta usar listado global administrativo

- `GET {{base_url}}/api/apprentices/listado`
- token: `token_instructor_lider`

Esperado:

- `403 Forbidden`

### Caso AP6. Instructor lider consulta aprendices de su grupo

- `GET {{base_url}}/api/apprentices/grupo/{{id_grupo_lider}}`
- token: `token_instructor_lider`

Esperado:

- `200 OK`

### Caso AP7. Instructor asignado consulta aprendices de grupo asignado

- `GET {{base_url}}/api/apprentices/grupo/{{id_grupo_asignado}}`
- token: `token_instructor_asignado`

Esperado:

- `200 OK`

### Caso AP8. Instructor sin acceso consulta aprendices de grupo ajeno

- `GET {{base_url}}/api/apprentices/grupo/{{id_grupo_sin_acceso}}`
- token: `token_instructor_sin_acceso`

Esperado:

- `403 Forbidden`

### Caso AP9. Instructor lider consulta detalle de aprendiz de su grupo

- `GET {{base_url}}/api/apprentices/{{id_aprendiz_grupo_lider}}`
- token: `token_instructor_lider`

Esperado:

- `200 OK`

Nota operativa:

- El parametro corresponde a `id_aprendiz`, no a `id_usuario`.

### Caso AP10. Instructor asignado consulta detalle de aprendiz de grupo asignado

- `GET {{base_url}}/api/apprentices/{{id_aprendiz_grupo_asignado}}`
- token: `token_instructor_asignado`

Esperado:

- `200 OK`

Nota operativa:

- El parametro corresponde a `id_aprendiz`, no a `id_usuario`.

### Caso AP11. Instructor sin acceso consulta detalle de aprendiz ajeno

- `GET {{base_url}}/api/apprentices/{{id_aprendiz_sin_acceso}}`
- token: `token_instructor_sin_acceso`

Esperado:

- `403 Forbidden`

Nota operativa:

- El parametro corresponde a `id_aprendiz`, no a `id_usuario`.

### Caso AP12. Coordinador registra aprendiz

- `POST {{base_url}}/api/apprentices/registro`
- token: `token_coordinador`

Body:

```json
{
  "tipo_documento": "CC",
  "numero_documento": "1100112233",
  "nombres": "Aprendiz",
  "apellidos": "Coordinador",
  "email": "aprendiz.coordinador@sena.edu.co",
  "telefono": "3011112233",
  "numero_ficha": "{{numero_ficha}}"
}
```

Esperado:

- `201 Created`

### Caso AP13. Instructor lider registra aprendiz en su ficha

- `POST {{base_url}}/api/apprentices/registro`
- token: `token_instructor_lider`

Body:

```json
{
  "tipo_documento": "CC",
  "numero_documento": "1100112244",
  "nombres": "Aprendiz",
  "apellidos": "Lider",
  "email": "aprendiz.lider@sena.edu.co",
  "telefono": "3011112244",
  "numero_ficha": "{{numero_ficha}}"
}
```

Esperado:

- `201 Created`

### Caso AP14. Instructor asignado intenta registrar aprendiz en ficha donde no es lider

- `POST {{base_url}}/api/apprentices/registro`
- token: `token_instructor_asignado`

Body:

```json
{
  "tipo_documento": "CC",
  "numero_documento": "1100112255",
  "nombres": "Aprendiz",
  "apellidos": "Asignado",
  "email": "aprendiz.asignado@sena.edu.co",
  "telefono": "3011112255",
  "numero_ficha": "{{numero_ficha}}"
}
```

Esperado:

- `403 Forbidden`

Precondicion:

- El instructor debe tener alguna asignacion, pero no ser lider de la ficha usada.

### Caso AP15. Instructor sin acceso intenta registrar aprendiz

- `POST {{base_url}}/api/apprentices/registro`
- token: `token_instructor_sin_acceso`

Body:

```json
{
  "tipo_documento": "CC",
  "numero_documento": "1100112266",
  "nombres": "Aprendiz",
  "apellidos": "SinAcceso",
  "email": "aprendiz.sinacceso@sena.edu.co",
  "telefono": "3011112266",
  "numero_ficha": "{{numero_ficha}}"
}
```

Esperado:

- `403 Forbidden`

### Caso AP16. Coordinador hace registro masivo

- `POST {{base_url}}/api/apprentices/registro-masivo`
- token: `token_coordinador`
- body: `multipart/form-data`

Form-data:

- campo: `archivo`
- tipo: `file`
- formato esperado: `.xlsx`

Esperado:

- `207 Multi-Status` si al menos una fila se procesa correctamente
- procesa filas y reporta exitosos/fallidos

Nota operativa:

- Si no se adjunta archivo o todas las filas fallan, el backend puede responder `400 Bad Request`.

### Caso AP17. Instructor lider hace registro masivo en su ficha

- `POST {{base_url}}/api/apprentices/registro-masivo`
- token: `token_instructor_lider`
- body: `multipart/form-data`

Form-data:

- campo: `archivo`
- tipo: `file`
- formato esperado: `.xlsx`
- el archivo debe contener filas con `numero_ficha` de una ficha liderada por el instructor

Esperado:

- `207 Multi-Status` si al menos una fila se procesa correctamente
- procesa filas y reporta exitosos/fallidos

Nota operativa:

- El backend valida permisos por fila usando el `numero_ficha` del Excel.
- Si no se adjunta archivo o todas las filas fallan, el backend puede responder `400 Bad Request`.

### Caso AP17A. Instructor lider carga archivo con fichas mixtas

- `POST {{base_url}}/api/apprentices/registro-masivo`
- token: `token_instructor_lider`
- body: `multipart/form-data`

Form-data:

- campo: `archivo`
- tipo: `file`
- formato esperado: `.xlsx`
- el archivo debe contener al menos una fila con `numero_ficha` liderada por el instructor y al menos una fila con `numero_ficha` no liderada por el instructor

Esperado:

- `207 Multi-Status` si al menos una fila autorizada se procesa correctamente
- las filas de fichas lideradas se registran si sus datos son validos
- las filas de fichas no lideradas se reportan como fallidas por permisos

### Caso AP17B. Instructor no lider intenta registro masivo en ficha donde no es lider

- `POST {{base_url}}/api/apprentices/registro-masivo`
- token: `token_instructor_asignado`
- body: `multipart/form-data`

Form-data:

- campo: `archivo`
- tipo: `file`
- formato esperado: `.xlsx`
- el archivo contiene filas con `numero_ficha` de una ficha donde el instructor no es lider

Esperado:

- `400 Bad Request` si todas las filas fallan
- cada fila debe reportarse como fallida por permisos

### Caso AP18. Registrar aprendiz con datos invalidos

- `POST {{base_url}}/api/apprentices/registro`
- token: `token_coordinador`

Body:

```json
{
  "tipo_documento": "XX",
  "numero_documento": "1",
  "nombres": "",
  "apellidos": "",
  "email": "correo-invalido",
  "numero_ficha": "{{numero_ficha}}"
}
```

Esperado:

- `400 Bad Request`
- respuesta con `ok: false`

### Caso AP19. Registrar aprendiz ya matriculado en la misma ficha

- `POST {{base_url}}/api/apprentices/registro`
- token: `token_coordinador`

Body:

```json
{
  "tipo_documento": "CC",
  "numero_documento": "{{doc_aprendiz_existente}}",
  "nombres": "{{nombres_aprendiz_existente}}",
  "apellidos": "{{apellidos_aprendiz_existente}}",
  "email": "{{email_aprendiz_existente}}",
  "numero_ficha": "{{numero_ficha_actual_aprendiz}}"
}
```

Esperado:

- `409 Conflict`
- respuesta con `ok: false`

### Caso AP20. Rematricular aprendiz existente en ficha distinta

- `POST {{base_url}}/api/apprentices/registro`
- token: `token_coordinador`

Body:

```json
{
  "tipo_documento": "CC",
  "numero_documento": "{{doc_aprendiz_existente}}",
  "nombres": "{{nombres_aprendiz_existente}}",
  "apellidos": "{{apellidos_aprendiz_existente}}",
  "email": "{{email_aprendiz_existente}}",
  "numero_ficha": "{{numero_ficha_distinta}}"
}
```

Esperado:

- `201 Created`
- respuesta con `ok: true`

Nota operativa:

- Esta regla es valida: un aprendiz puede estar en varios grupos formativos.

## Flujo 9. Observaciones

### Caso O1. Instructor lider registra observacion valida

- `POST {{base_url}}/api/observations`
- token: `token_instructor_lider`

Body:

```json
{
  "id_aprendiz": "{{id_aprendiz_grupo_lider}}",
  "id_grupo": "{{id_grupo_lider}}",
  "tipo_observacion": "ACADEMICA",
  "severidad": "MODERADA",
  "descripcion": "Observacion academica valida para seguimiento funcional.",
  "notificar_lider": false
}
```

Esperado:

- `201 Created`
- respuesta con `ok: true`
- incluye `data.observation`
- la observacion queda en estado `ABIERTA`
- el backend registra el instructor autenticado como autor

### Caso O2. Instructor asignado registra observacion y notifica al lider

- `POST {{base_url}}/api/observations`
- token: `token_instructor_asignado`

Body:

```json
{
  "id_aprendiz": "{{id_aprendiz_grupo_asignado}}",
  "id_grupo": "{{id_grupo_asignado}}",
  "tipo_observacion": "CONVIVENCIAL",
  "severidad": "LEVE",
  "descripcion": "Observacion convivencial valida registrada por instructor asignado.",
  "notificar_lider": true
}
```

Esperado:

- `201 Created`
- respuesta con `ok: true`
- incluye `data.observation`
- incluye `data.notificacion_lider`

Nota operativa:

- `data.notificacion_lider` solo debe ser `true` si el grupo tiene instructor lider activo distinto al instructor autenticado.
- Si no existe lider activo, el backend guarda la observacion y responde de forma controlada con `data.notificacion_lider: false`.

### Caso O3. Coordinador intenta registrar observacion

- `POST {{base_url}}/api/observations`
- token: `token_coordinador`

Body:

```json
{
  "id_aprendiz": "{{id_aprendiz_grupo_lider}}",
  "id_grupo": "{{id_grupo_lider}}",
  "tipo_observacion": "ACADEMICA",
  "severidad": "MODERADA",
  "descripcion": "Intento no permitido de registrar observacion como coordinador."
}
```

Esperado:

- `403 Forbidden`
- respuesta con `ok: false`

### Caso O4. Aprendiz intenta registrar observacion

- `POST {{base_url}}/api/observations`
- token: `token_aprendiz`

Body:

```json
{
  "id_aprendiz": "{{id_aprendiz_grupo_lider}}",
  "id_grupo": "{{id_grupo_lider}}",
  "tipo_observacion": "ACADEMICA",
  "severidad": "LEVE",
  "descripcion": "Intento no permitido de registrar observacion como aprendiz."
}
```

Esperado:

- `403 Forbidden`
- respuesta con `ok: false`

### Caso O5. Instructor sin acceso intenta registrar observacion en grupo ajeno

- `POST {{base_url}}/api/observations`
- token: `token_instructor_sin_acceso`

Body:

```json
{
  "id_aprendiz": "{{id_aprendiz_grupo_lider}}",
  "id_grupo": "{{id_grupo_lider}}",
  "tipo_observacion": "ACADEMICA",
  "severidad": "GRAVE",
  "descripcion": "Intento no permitido de registrar observacion en grupo ajeno."
}
```

Esperado:

- `403 Forbidden`
- respuesta con `ok: false`

### Caso O6. Registrar observacion con descripcion demasiado corta

- `POST {{base_url}}/api/observations`
- token: `token_instructor_lider`

Body:

```json
{
  "id_aprendiz": "{{id_aprendiz_grupo_lider}}",
  "id_grupo": "{{id_grupo_lider}}",
  "tipo_observacion": "ACADEMICA",
  "severidad": "LEVE",
  "descripcion": "Corta"
}
```

Esperado:

- `400 Bad Request`
- respuesta con `ok: false`

Nota operativa:

- El backend exige `descripcion` con minimo 20 caracteres.

### Caso O7. Instructor lider consulta observaciones de su grupo

- `GET {{base_url}}/api/observations/group/{{id_grupo_lider}}?page=1&limit=10`
- token: `token_instructor_lider`

Esperado:

- `200 OK`
- respuesta con `ok: true`
- incluye `data.total`
- incluye `data.pagina`
- incluye `data.observaciones_abiertas`
- incluye `data.observaciones`
- el lider puede ver observaciones del grupo, incluyendo las creadas por otros instructores

### Caso O8. Instructor asignado consulta observaciones de grupo asignado

- `GET {{base_url}}/api/observations/group/{{id_grupo_asignado}}?page=1&limit=10`
- token: `token_instructor_asignado`

Esperado:

- `200 OK`
- respuesta con `ok: true`
- retorna observaciones visibles para el instructor asignado
- no debe exponer observaciones de otros instructores si el usuario no es lider

### Caso O9. Instructor sin acceso consulta observaciones de grupo ajeno

- `GET {{base_url}}/api/observations/group/{{id_grupo_sin_acceso}}`
- token: `token_instructor_sin_acceso`

Esperado:

- `403 Forbidden`
- respuesta con `ok: false`

### Caso O10. Instructor filtra observaciones por tipo, severidad y estado

- `GET {{base_url}}/api/observations/group/{{id_grupo_lider}}?tipo_observacion=ACADEMICA&severidad=MODERADA&estado=ABIERTA&page=1&limit=10`
- token: `token_instructor_lider`

Esperado:

- `200 OK`
- respuesta con `ok: true`
- retorna solo observaciones que coinciden con los filtros enviados

### Caso O11. Instructor consulta historial de observaciones de aprendiz

- `GET {{base_url}}/api/observations/apprentice/{{id_aprendiz_grupo_lider}}?id_grupo={{id_grupo_lider}}&page=1&limit=10`
- token: `token_instructor_lider`

Esperado:

- `200 OK`
- respuesta con `ok: true`
- incluye `data.total`
- incluye `data.observaciones`
- puede incluir observaciones `ABIERTA` y `CERRADA`

Nota operativa:

- El query param `id_grupo` es obligatorio en la implementacion actual.

### Caso O12. Consultar historial de aprendiz sin `id_grupo`

- `GET {{base_url}}/api/observations/apprentice/{{id_aprendiz_grupo_lider}}`
- token: `token_instructor_lider`

Esperado:

- `400 Bad Request`
- respuesta con `ok: false`

### Caso O13. Instructor consulta detalle de observacion permitida

- `GET {{base_url}}/api/observations/{{id_observacion_abierta_lider}}`
- token: `token_instructor_lider`

Esperado:

- `200 OK`
- respuesta con `ok: true`
- retorna aprendiz, instructor, grupo, tipo, severidad, descripcion, fecha y estado

### Caso O14. Instructor autor edita observacion abierta

- `PATCH {{base_url}}/api/observations/{{id_observacion_abierta_lider}}`
- token: `token_instructor_lider`

Body:

```json
{
  "tipo_observacion": "CONVIVENCIAL",
  "severidad": "GRAVE",
  "descripcion": "Descripcion actualizada de la observacion abierta para validacion funcional."
}
```

Esperado:

- `200 OK`
- respuesta con `ok: true`
- actualiza solo `tipo_observacion`, `severidad` y `descripcion`

### Caso O15. Instructor intenta editar observacion creada por otro instructor

- `PATCH {{base_url}}/api/observations/{{id_observacion_abierta_asignado}}`
- token: `token_instructor_lider`

Body:

```json
{
  "descripcion": "Intento de edicion por instructor que no es autor de la observacion."
}
```

Esperado:

- `403 Forbidden`
- respuesta con `ok: false`

Nota operativa:

- Aunque el instructor lider pueda consultar observaciones del grupo, la implementacion solo permite editar al instructor autor.

### Caso O16. Instructor intenta editar observacion cerrada

- `PATCH {{base_url}}/api/observations/{{id_observacion_cerrada}}`
- token: `token_instructor_lider`

Body:

```json
{
  "descripcion": "Intento de editar una observacion cerrada por alerta."
}
```

Esperado:

- `409 Conflict`
- respuesta con `ok: false`

### Caso O17. Instructor intenta editar sin campos permitidos

- `PATCH {{base_url}}/api/observations/{{id_observacion_abierta_lider}}`
- token: `token_instructor_lider`

Body:

```json
{
  "id_aprendiz": "{{id_aprendiz_grupo_lider}}"
}
```

Esperado:

- `400 Bad Request`
- respuesta con `ok: false`

Nota operativa:

- Los campos editables implementados son `tipo_observacion`, `severidad` y `descripcion`.

## Flujo 10. Alertas

### Caso AL1. Coordinador consulta alertas de sus areas

- `GET {{base_url}}/api/alerts?estado=ACTIVA`
- token: `token_coordinador`

Esperado:

- `200 OK`
- respuesta con `ok: true`
- retorna solo alertas de grupos dentro del alcance del coordinador

### Caso AL2. Instructor lider consulta alertas de sus grupos

- `GET {{base_url}}/api/alerts`
- token: `token_instructor_lider`

Esperado:

- `200 OK`
- respuesta con `ok: true`
- retorna alertas de grupos liderados o asignados al instructor

### Caso AL3. Aprendiz intenta consultar alertas

- `GET {{base_url}}/api/alerts`
- token: `token_aprendiz`

Esperado:

- `403 Forbidden`
- respuesta con `ok: false`

### Caso AL4. Coordinador intenta consultar alertas de grupo fuera de alcance

- `GET {{base_url}}/api/alerts?id_grupo={{id_grupo_area_ajena}}`
- token: `token_coordinador`

Esperado:

- `403 Forbidden`
- respuesta con `ok: false`

### Caso AL5. Consultar detalle de alerta permitida

- `GET {{base_url}}/api/alerts/{{id_alerta_activa}}`
- token: `token_coordinador`

Esperado:

- `200 OK`
- respuesta con `ok: true`
- retorna aprendiz, grupo, tipo de alerta, severidad, estado y datos asociados disponibles

### Caso AL6. Consultar observaciones asociadas a una alerta

- `GET {{base_url}}/api/alerts/{{id_alerta_con_observaciones}}/observations`
- token: `token_coordinador`

Esperado:

- `200 OK`
- respuesta con `ok: true`
- retorna las relaciones de `alerta_observaciones` visibles para el usuario autenticado

### Caso AL7. Instructor crea alerta desde observaciones abiertas

- `POST {{base_url}}/api/alerts/from-observations`
- token: `token_instructor_lider`

Body:

```json
{
  "id_aprendiz": "{{id_aprendiz_grupo_lider}}",
  "id_grupo": "{{id_grupo_lider}}",
  "severidad": "GRAVE",
  "descripcion": "Alerta manual generada desde observaciones abiertas del aprendiz.",
  "observationIds": [
    "{{id_observacion_abierta_1}}",
    "{{id_observacion_abierta_2}}"
  ],
  "notificar_coordinador": true
}
```

Esperado:

- `201 Created`
- respuesta con `ok: true`
- crea o actualiza alerta `MANUAL`
- asocia las observaciones a la alerta
- cambia las observaciones asociadas a estado `CERRADA`

Nota operativa:

- Las observaciones enviadas deben estar `ABIERTA`.
- Todas deben pertenecer al mismo aprendiz y grupo del body.
- La operacion es transaccional en el servicio.

### Caso AL8. Coordinador intenta crear alerta desde observaciones

- `POST {{base_url}}/api/alerts/from-observations`
- token: `token_coordinador`

Body:

```json
{
  "id_aprendiz": "{{id_aprendiz_grupo_lider}}",
  "id_grupo": "{{id_grupo_lider}}",
  "severidad": "GRAVE",
  "descripcion": "Intento no permitido de crear alerta desde observaciones.",
  "observationIds": [
    "{{id_observacion_abierta_1}}"
  ]
}
```

Esperado:

- `403 Forbidden`
- respuesta con `ok: false`

### Caso AL9. Crear alerta desde observacion cerrada

- `POST {{base_url}}/api/alerts/from-observations`
- token: `token_instructor_lider`

Body:

```json
{
  "id_aprendiz": "{{id_aprendiz_grupo_lider}}",
  "id_grupo": "{{id_grupo_lider}}",
  "severidad": "MODERADA",
  "descripcion": "Intento de asociar una observacion que ya fue cerrada.",
  "observationIds": [
    "{{id_observacion_cerrada}}"
  ]
}
```

Esperado:

- `409 Conflict`
- respuesta con `ok: false`

### Caso AL10. Crear alerta desde observaciones sin lista de observaciones

- `POST {{base_url}}/api/alerts/from-observations`
- token: `token_instructor_lider`

Body:

```json
{
  "id_aprendiz": "{{id_aprendiz_grupo_lider}}",
  "id_grupo": "{{id_grupo_lider}}",
  "severidad": "GRAVE",
  "descripcion": "Alerta sin lista de observaciones asociadas."
}
```

Esperado:

- `400 Bad Request`
- respuesta con `ok: false`

### Caso AL11. Crear alerta manual directa

- `POST {{base_url}}/api/alerts/manual`
- token: `token_instructor_lider`

Body:

```json
{
  "id_aprendiz": "{{id_aprendiz_grupo_lider}}",
  "id_grupo": "{{id_grupo_lider}}",
  "severidad": "MODERADA",
  "descripcion": "Alerta manual directa sin asociar observaciones."
}
```

Esperado:

- `201 Created`
- respuesta con `ok: true`

Nota operativa:

- Este endpoint existe en backend.
- No corresponde al flujo documentado de alerta desde observaciones de EP04-H01.
- Debe validarse funcionalmente si se mantiene como alcance oficial o si queda como endpoint tecnico adicional.

### Caso AL12. Coordinador cierra alerta activa

- `PATCH {{base_url}}/api/alerts/{{id_alerta_activa}}/status`
- token: `token_coordinador`

Body:

```json
{
  "estado": "CERRADA",
  "justificacion_cierre": "Se reviso el caso con el aprendiz y se definieron compromisos de seguimiento."
}
```

Esperado:

- `200 OK`
- respuesta con `ok: true`
- la alerta queda en estado `CERRADA`
- se guarda `justificacion_cierre`
- se guarda `fecha_cierre`
- se guarda `cerrada_por` con el usuario coordinador autenticado
- la alerta permanece consultable como historial

### Caso AL12.1. Coordinador cambia alerta a seguimiento sin justificacion

- `PATCH {{base_url}}/api/alerts/{{id_alerta_activa}}/status`
- token: `token_coordinador`

Body:

```json
{
  "estado": "EN_SEGUIMIENTO"
}
```

Esperado:

- `200 OK`
- respuesta con `ok: true`
- la alerta queda en estado `EN_SEGUIMIENTO`
- no se llenan `justificacion_cierre`, `fecha_cierre` ni `cerrada_por`

### Caso AL13. Instructor intenta cerrar alerta

- `PATCH {{base_url}}/api/alerts/{{id_alerta_activa}}/status`
- token: `token_instructor_lider`

Body:

```json
{
  "estado": "CERRADA",
  "justificacion_cierre": "Se reviso el caso con el aprendiz y se definieron compromisos de seguimiento."
}
```

Esperado:

- `403 Forbidden`
- respuesta con `ok: false`

### Caso AL14. Coordinador intenta cerrar alerta ya cerrada

- `PATCH {{base_url}}/api/alerts/{{id_alerta_cerrada}}/status`
- token: `token_coordinador`

Body:

```json
{
  "estado": "CERRADA",
  "justificacion_cierre": "Se reviso el caso con el aprendiz y se definieron compromisos de seguimiento."
}
```

Esperado:

- `409 Conflict`
- respuesta con `ok: false`

### Caso AL15. Coordinador intenta cerrar alerta sin justificacion

- `PATCH {{base_url}}/api/alerts/{{id_alerta_activa}}/status`
- token: `token_coordinador`

Body:

```json
{
  "estado": "CERRADA"
}
```

Esperado:

- `400 Bad Request`
- respuesta con `ok: false`

### Caso AL16. Coordinador intenta cerrar alerta con justificacion menor a 20 caracteres

- `PATCH {{base_url}}/api/alerts/{{id_alerta_activa}}/status`
- token: `token_coordinador`

Body:

```json
{
  "estado": "CERRADA",
  "justificacion_cierre": "Muy corta"
}
```

Esperado:

- `400 Bad Request`
- respuesta con `ok: false`

### Caso AL17. Coordinador envia estado de alerta invalido

- `PATCH {{base_url}}/api/alerts/{{id_alerta_activa}}/status`
- token: `token_coordinador`

Body:

```json
{
  "estado": "FINALIZADA"
}
```

Esperado:

- `400 Bad Request`
- respuesta con `ok: false`

### Caso AL18. Reevaluar alerta automatica por observaciones

- `POST {{base_url}}/api/alerts/reevaluate/observations/{{id_aprendiz_alertas}}`
- token: `token_instructor_lider`

Esperado:

- `200 OK`
- respuesta con `ok: true`
- si hay una observacion `GRAVE` abierta en los ultimos 30 dias, crea o actualiza una alerta `OBSERVACIONES_RECURRENTES` con severidad `GRAVE`
- si hay tres observaciones abiertas en los ultimos 30 dias, crea o actualiza una alerta `OBSERVACIONES_RECURRENTES` con severidad `MODERADA`
- si no hay observaciones que cumplan regla, `data` puede ser `null` o una lista vacia segun el escenario

Nota operativa:

- El endpoint esta implementado, pero la ejecucion automatica despues de registrar observacion queda pendiente por verificar.

### Caso AL19. Reevaluar alerta por inasistencia

- `POST {{base_url}}/api/alerts/reevaluate/attendance/{{id_aprendiz_alertas}}`
- token: `token_coordinador`

Esperado:

- `200 OK`
- respuesta con `ok: true`
- evalua registros de `vw_inasistencias_validas`
- si se cumple la regla, crea o actualiza alerta `INASISTENCIA`
- si no se cumple la regla, `data` puede ser `null` o una lista vacia segun el escenario

Nota operativa:

- El endpoint esta implementado.
- La ejecucion al cerrar una sesion de formacion queda pendiente por verificar.
- La notificacion al aprendiz documentada en EP04-H05 queda pendiente por verificar porque no se encontro endpoint ni flujo directo para consultarla.

### Caso AL20. Consultar historial de alertas cerradas

- `GET {{base_url}}/api/alerts?estado=CERRADA&id_aprendiz={{id_aprendiz_alertas}}`
- token: `token_coordinador`

Esperado:

- `200 OK`
- respuesta con `ok: true`
- retorna alertas cerradas dentro del alcance del usuario

### Casos de EP04 pendientes por verificar

No se documentan como casos funcionales implementados los siguientes comportamientos porque no tienen endpoint directo confirmado o dependen de integraciones no expuestas en esta matriz:

- ejecucion automatica de alerta por observaciones inmediatamente despues de `POST /api/observations`
- ejecucion automatica de alerta por inasistencia al cierre de sesion de formacion
- consulta o marcado de lectura de notificaciones
- notificacion al aprendiz por alertas de inasistencia

## Flujo 11. Permissions placeholder

### Caso PM1. El modulo existe pero no esta implementado

- `GET {{base_url}}/api/permissions`
- token: `token_coordinador`

Esperado:

- `501 Not Implemented`

Nota operativa:

- Este endpoint esta declarado, pero el modulo no esta implementado.
- Con token de coordinador llega al placeholder y debe responder `501`.
- Con rol no autorizado debe responder `403 Forbidden` antes de llegar al placeholder.

### Caso PM2. Instructor intenta consultar permissions

- `GET {{base_url}}/api/permissions`
- token: `token_instructor_lider`

Esperado:

- `403 Forbidden`

## Registro de resultados

Se recomienda registrar cada prueba con este formato:

| Caso | Resultado esperado | Resultado observado | Estado | Observaciones |
| --- | --- | --- | --- | --- |
| AP14 | 403 | 403 | OK | Instructor asignado no puede registrar |

## Criterio de cierre

La validacion funcional se considera satisfactoria cuando:

- los accesos por rol coinciden con la politica vigente
- el modelo 1 de instructores se cumple
- el coordinador respeta alcance por area
- no hay endpoints documentados que respondan distinto a lo esperado
- no aparecen fugas de informacion entre grupos o aprendices fuera de alcance
- los casos de validacion negativa responden con el codigo HTTP documentado

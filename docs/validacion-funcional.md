## Validacion Funcional Manual

Este archivo define una matriz de validacion funcional manual para ejecutar sobre el backend de SIMA usando Postman, Thunder Client o una herramienta equivalente.

Su objetivo es comprobar que el comportamiento real del sistema coincide con las reglas de negocio y con la documentacion activa del proyecto.

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

Queda fuera por ahora:

- `alerts`
- pruebas de `permissions` mas alla de confirmar que responde `501`
- temas internos de `AuthService`, `authmiddleware` y `env`

## Herramienta sugerida

- Postman

## Base URL sugerida

```text
http://localhost:3000
```

## Variables sugeridas en Postman

- `base_url`
- `token_coordinador`
- `token_instructor_lider`
- `token_instructor_asignado`
- `token_instructor_sin_acceso`
- `token_aprendiz`
- `id_area_valida`
- `id_area_sin_acceso`
- `id_grupo_lider`
- `id_grupo_asignado`
- `id_grupo_sin_acceso`
- `id_aprendiz_grupo_lider`
- `id_aprendiz_grupo_asignado`
- `id_aprendiz_sin_acceso`
- `id_usuario_coordinador`
- `id_usuario_instructor`

## Precondiciones de datos

Antes de ejecutar la matriz, conviene contar al menos con este escenario:

1. Un `coordinador` con al menos un area asignada en `coordinador_area`.
2. Un `instructor_lider` que sea lider de un grupo activo.
3. Un `instructor_asignado` que tenga una relacion activa en `instructor_grupo`, pero que no sea lider de ese mismo grupo.
4. Un `instructor_sin_acceso` que no tenga relacion con el grupo usado en las pruebas.
5. Un `aprendiz` matriculado activamente en el grupo del instructor lider.
6. Un segundo aprendiz en un grupo distinto, fuera del alcance del instructor probado.
7. Un `grupo_activo` asociado a un programa del area del coordinador.
8. Un segundo grupo fuera del area del coordinador para validar denegaciones.

## Regla funcional clave validada

La politica actualmente esperada es:

- `coordinador`: consulta y gestiona dentro de sus areas asignadas
- `instructor_lider`: puede consultar su grupo y registrar aprendices en su ficha
- `instructor_asignado`: puede consultar grupos y aprendices relacionados, pero no registrar aprendices en la ficha si no es lider
- `aprendiz`: no debe tener acceso a modulos administrativos

## Flujo 1. Autenticacion

### Caso A1. Login correcto por numero_documento

Metodo:

- `POST {{base_url}}/api/auth/login`

Body:

```json
{
  "numero_documento": "1234567890",
  "password": "Admin123"
}
```

Esperado:

- `200`
- respuesta con `ok: true`
- incluye `token`
- incluye `user`

### Caso A2. Login con credenciales invalidas

Esperado:

- `401` o el codigo definido por el backend
- no entrega token

### Caso A3. Usuario autenticado

Metodo:

- `GET {{base_url}}/api/auth/me`

Header:

- `Authorization: Bearer {{token_coordinador}}`

Esperado:

- `200`
- retorna datos del usuario autenticado

## Flujo 2. Usuarios

### Caso U1. Coordinador consulta listado de usuarios

- `GET {{base_url}}/api/users`
- token: `token_coordinador`

Esperado:

- `200`

### Caso U2. Instructor intenta consultar listado de usuarios

- `GET {{base_url}}/api/users`
- token: `token_instructor_lider`

Esperado:

- `403`

### Caso U3. Coordinador consulta detalle de usuario

- `GET {{base_url}}/api/users/:id`
- token: `token_coordinador`

Esperado:

- `200`

### Caso U4. Aprendiz intenta consultar detalle de usuario administrativo

- `GET {{base_url}}/api/users/:id`
- token: `token_aprendiz`

Esperado:

- `403`

### Caso U5. Coordinador crea usuario

- `POST {{base_url}}/api/users`
- token: `token_coordinador`

Body:

```json
{
  "email": "nuevo.usuario@sena.edu.co",
  "id_rol": 2,
  "tipo_documento": "CC",
  "numero_documento": "1099001122",
  "nombres": "Nuevo",
  "apellidos": "Usuario",
  "telefono": "3000001111"
}
```

Esperado:

- `201` o `200` segun implementacion actual
- crea usuario con rol y persona asociados

### Caso U6. Coordinador cambia rol de usuario

- `PUT {{base_url}}/api/users/:id`
- token: `token_coordinador`
- body con `id_rol`

Body:

```json
{
  "id_rol": 3
}
```

Esperado:

- `200`
- el rol cambia
- el perfil asociado se sincroniza segun el nuevo rol

### Caso U7. Coordinador desactiva usuario

- `DELETE {{base_url}}/api/users/:id`
- token: `token_coordinador`

Esperado:

- `200`
- usuario queda `INACTIVO`

## Flujo 3. Roles

### Caso R1. Obtener roles

- `GET {{base_url}}/api/roles`
- token: `token_coordinador`

Esperado:

- `200`

### Caso R2. Obtener usuarios de un rol

- `GET {{base_url}}/api/roles/:id/usuarios`
- token: `token_coordinador`

Esperado:

- `200`

### Caso R3. Instructor intenta obtener usuarios de un rol

- `GET {{base_url}}/api/roles/:id/usuarios`
- token: `token_instructor_lider`

Esperado:

- `403`

### Caso R4. Asignar rol a usuario

- `PUT {{base_url}}/api/roles/usuarios/:idUsuario`
- token: `token_coordinador`

Body:

```json
{
  "id_rol": 2
}
```

Esperado:

- `200`
- el usuario cambia de rol
- no queda inconsistencia entre `usuarios`, `instructores` y `aprendices`

## Flujo 4. Perfil propio

### Caso P1. Consultar perfil propio

- `GET {{base_url}}/api/profile/overview`
- token: cualquier rol valido

Esperado:

- `200`

### Caso P2. Actualizar email o telefono propio

- `PUT {{base_url}}/api/profile/overview`
- token: cualquier rol valido

Body:

```json
{
  "email": "perfil.actualizado@sena.edu.co",
  "telefono": "3001234567"
}
```

Esperado:

- `200`
- actualiza solo los campos permitidos

### Caso P3. Cambiar password sin `password_actual`

Body:

```json
{
  "password_nuevo": "NuevaClave123"
}
```

Esperado:

- `400`

## Flujo 5. Dashboard y areas de coordinador

### Caso D1. Resumen del coordinador

- `GET {{base_url}}/api/dashboard/coordinador/resumen`
- token: `token_coordinador`

Esperado:

- `200`

### Caso D2. Instructor intenta ver dashboard de coordinador

- `GET {{base_url}}/api/dashboard/coordinador/resumen`
- token: `token_instructor_lider`

Esperado:

- `403`

### Caso D3. Detalle de area permitida

- `GET {{base_url}}/api/dashboard/coordinador/area/{{id_area_valida}}`
- token: `token_coordinador`

Esperado:

- `200`

### Caso D4. Detalle de area fuera de alcance

- `GET {{base_url}}/api/dashboard/coordinador/area/{{id_area_sin_acceso}}`
- token: `token_coordinador`

Esperado:

- `403`

### Caso C1. Asignar area a coordinador

- `POST {{base_url}}/api/coordinator-areas`
- token: `token_coordinador`

Body:

```json
{
  "id_area": 1,
  "id_usuario": 1
}
```

Esperado:

- `200` o `201`

### Caso C2. Consultar areas de coordinador

- `GET {{base_url}}/api/coordinator-areas/{{id_usuario_coordinador}}`
- token: `token_coordinador`

Esperado:

- `200`

## Flujo 6. Programas de formacion

### Caso F1. Coordinador consulta programas de un area permitida

- `GET {{base_url}}/api/formative-programs/area/{{id_area_valida}}`
- token: `token_coordinador`

Esperado:

- `200`

### Caso F2. Coordinador consulta programas de un area fuera de alcance

- `GET {{base_url}}/api/formative-programs/area/{{id_area_sin_acceso}}`
- token: `token_coordinador`

Esperado:

- `403`

## Flujo 7. Grupos

### Caso G1. Coordinador lista grupos de sus areas

- `GET {{base_url}}/api/groups`
- token: `token_coordinador`

Esperado:

- `200`
- solo aparecen grupos de sus areas asignadas

### Caso G2. Instructor lider lista grupos

- `GET {{base_url}}/api/groups`
- token: `token_instructor_lider`

Esperado:

- `200`
- aparecen solo sus grupos accesibles

### Caso G3. Instructor asignado lista grupos

- `GET {{base_url}}/api/groups`
- token: `token_instructor_asignado`

Esperado:

- `200`
- aparecen grupos donde es lider o donde tiene asignacion activa

### Caso G4. Instructor sin acceso consulta grupo ajeno

- `GET {{base_url}}/api/groups/{{id_grupo_sin_acceso}}`
- token: `token_instructor_sin_acceso`

Esperado:

- `403`

### Caso G5. Instructor asignado consulta grupo asignado

- `GET {{base_url}}/api/groups/{{id_grupo_asignado}}`
- token: `token_instructor_asignado`

Esperado:

- `200`

### Caso G6. Coordinador consulta instructores disponibles

- `GET {{base_url}}/api/groups/instructores-disponibles`
- token: `token_coordinador`

Esperado:

- `200`
- retorna instructores activos disponibles para seleccion en el formulario del grupo

### Caso G7. Instructor intenta consultar instructores disponibles

- `GET {{base_url}}/api/groups/instructores-disponibles`
- token: `token_instructor_lider`

Esperado:

- `403`

### Caso G8. Coordinador crea grupo en programa permitido

- `POST {{base_url}}/api/groups`
- token: `token_coordinador`

Body:

```json
{
  "numero_ficha": "3064975",
  "id_programa": 1,
  "jornada": "Manana",
  "trimestres": 6,
  "fecha_inicio": "2025-01-20",
  "id_ambiente": 1,
  "id_instructor_lider": 1
}
```

Esperado:

- `201` o `200`

Nota operativa:

- `id_instructor_lider` se puede enviar desde la creacion del grupo.
- Si se envia, el grupo queda creado con el lider ya asignado.
- Si no se envia, el grupo se crea inicialmente con `id_instructor_lider = null`.
- La asignacion o cambio posterior del lider se puede hacer con `PATCH /api/groups/:id/instructor-lider`.

### Caso G9. Coordinador intenta crear grupo en programa fuera de su alcance

Esperado:

- `403`

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

- `200`

### Caso G11. Coordinador intenta cambiar estado de grupo fuera de su area

Esperado:

- `403`

### Caso G12. Coordinador asigna instructor lider a un grupo

- `PATCH {{base_url}}/api/groups/{{id_grupo_lider}}/instructor-lider`
- token: `token_coordinador`

Body:

```json
{
  "id_instructor": 1
}
```

Esperado:

- `200`
- el grupo queda con `id_instructor_lider` asignado
- el detalle del grupo ya debe mostrar el instructor lider asociado

## Flujo 8. Aprendices

### Caso AP1. Coordinador consulta grupos activos

- `GET {{base_url}}/api/apprentices/grupos-activos`
- token: `token_coordinador`

Esperado:

- `200`

### Caso AP2. Instructor lider consulta grupos activos

- `GET {{base_url}}/api/apprentices/grupos-activos`
- token: `token_instructor_lider`

Esperado:

- `200`

### Caso AP3. Instructor asignado consulta grupos activos

- `GET {{base_url}}/api/apprentices/grupos-activos`
- token: `token_instructor_asignado`

Esperado:

- `200`
- aparecen grupos donde es lider o donde tiene asignacion activa

### Caso AP4. Coordinador consulta listado global de aprendices

- `GET {{base_url}}/api/apprentices/listado`
- token: `token_coordinador`

Esperado:

- `200`
- solo ve aprendices de sus areas

### Caso AP5. Instructor intenta usar listado global administrativo

- `GET {{base_url}}/api/apprentices/listado`
- token: `token_instructor_lider`

Esperado:

- `403`

### Caso AP6. Instructor lider consulta aprendices de su grupo

- `GET {{base_url}}/api/apprentices/grupo/{{id_grupo_lider}}`
- token: `token_instructor_lider`

Esperado:

- `200`

### Caso AP7. Instructor asignado consulta aprendices de grupo asignado

- `GET {{base_url}}/api/apprentices/grupo/{{id_grupo_asignado}}`
- token: `token_instructor_asignado`

Esperado:

- `200`

### Caso AP8. Instructor sin acceso consulta aprendices de grupo ajeno

- `GET {{base_url}}/api/apprentices/grupo/{{id_grupo_sin_acceso}}`
- token: `token_instructor_sin_acceso`

Esperado:

- `403`

### Caso AP9. Instructor lider consulta detalle de aprendiz de su grupo

- `GET {{base_url}}/api/apprentices/{{id_aprendiz_grupo_lider}}`
- token: `token_instructor_lider`

Esperado:

- `200`

### Caso AP10. Instructor asignado consulta detalle de aprendiz de grupo asignado

- `GET {{base_url}}/api/apprentices/{{id_aprendiz_grupo_asignado}}`
- token: `token_instructor_asignado`

Esperado:

- `200`

### Caso AP11. Instructor sin acceso consulta detalle de aprendiz ajeno

- `GET {{base_url}}/api/apprentices/{{id_aprendiz_sin_acceso}}`
- token: `token_instructor_sin_acceso`

Esperado:

- `403`

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
  "numero_ficha": "3064975"
}
```

Esperado:

- `201` o `200`

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
  "numero_ficha": "3064975"
}
```

Esperado:

- `201` o `200`

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
  "numero_ficha": "3064975"
}
```

Esperado:

- `403`

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
  "numero_ficha": "3064975"
}
```

Esperado:

- `403`

### Caso AP16. Coordinador hace registro masivo

- `POST {{base_url}}/api/apprentices/registro-masivo`
- token: `token_coordinador`
- `form-data` con `archivo`

Form-data:

- campo: `archivo`
- tipo: `file`
- formato esperado: `.xlsx` o `.xls`

Esperado:

- `207`, `201` o `200` segun resultado
- procesa filas y reporta exitosos/fallidos

### Caso AP17. Instructor intenta registro masivo

- `POST {{base_url}}/api/apprentices/registro-masivo`
- token: `token_instructor_lider`

Esperado:

- `403`

## Flujo 9. Permissions placeholder

### Caso PM1. El modulo existe pero no esta implementado

- `GET {{base_url}}/api/permissions`
- token: `token_coordinador`

Esperado:

- `501`

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

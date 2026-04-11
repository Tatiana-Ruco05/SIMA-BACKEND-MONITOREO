Descripción del Proyecto

El proyecto propone la implementación de un Sistema de Observador del Aprendiz en el Centro Tecnológico de la Producción Industrial (CTPI) del SENA, con el objetivo de fortalecer el seguimiento formativo y mejorar la comunicación entre instructores, coordinación académica y aprendices.

La iniciativa responde a la necesidad de centralizar la información relacionada con el proceso formativo del aprendiz y facilitar la identificación temprana de dificultades académicas o comportamentales. Mediante el uso de herramientas digitales y el registro estructurado de información, el sistema busca optimizar la gestión académica y apoyar un acompañamiento pedagógico más oportuno y efectivo.

En su estado actual, el sistema ha sido ajustado para enfocarse en el monitoreo de asistencias y registro de observaciones, centrando el flujo principal en la notificación y seguimiento de inasistencias y situaciones relevantes dentro del proceso formativo.

Arquitectura del Proyecto

El proyecto adopta una arquitectura por capas orientada a API REST. Aunque la estructura de carpetas guarda similitudes con el patrón MVC, no se implementa completamente como tal, ya que no existe una capa de vistas. En su lugar, el sistema se organiza en componentes como:

routes: definición de endpoints
controller: manejo de la lógica de entrada y salida HTTP
models: representación de entidades y acceso a datos
middlewares: validaciones y control de acceso
helpers: utilidades reutilizables
config: configuración del entorno y conexión a base de datos

Esta organización permite una separación clara de responsabilidades y facilita el mantenimiento del sistema.

Manejo de Base de Datos

Para la interacción con la base de datos se utiliza Sequelize, un ORM (Object-Relational Mapping) que permite mapear tablas de la base de datos a modelos en JavaScript y gestionar operaciones sin necesidad de escribir SQL directamente.

Entre sus ventajas:

Abstracción del acceso a la base de datos
Reducción de código repetitivo en operaciones CRUD
Manejo simplificado de relaciones entre entidades
Integración con migraciones para versionamiento de la estructura

Sin embargo, también presenta algunas consideraciones:

Puede generar consultas menos optimizadas en escenarios complejos
Requiere comprender tanto el ORM como el modelo relacional subyacente
En consultas avanzadas, puede ser necesario recurrir a SQL manual

Alcance Actual

El sistema actualmente se enfoca en:

Registro de asistencias
Gestión de observaciones académicas o convivenciales
Notificación de eventos relevantes asociados al aprendiz

Este enfoque permite consolidar una base funcional para el seguimiento formativo, sobre la cual se pueden integrar futuras funcionalidades del sistema.

script de instalacion:

npm install express sequelize mysql2 dotenv jsonwebtoken bcrypt cors
npm install --save-dev nodemon

endpoints

usuarios:

POST http://localhost:3000/api/auth/login
Body:
{
  "numero_documento": "1234567890",
  "password": "Admin123"
}
Respesta:
{
    "ok": true,
    "message": "Inicio de sesión exitoso",
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZF91c3VhcmlvIjoxLCJpZF9yb2wiOjEsInJvbCI6ImNvb3JkaW5hZG9yIiwiaWF0IjoxNzc1ODgyMzEzLCJleHAiOjE3NzU5MTExMTN9.rGS2syEv9FYKOQkqbV3fYLmENhAw7xu_F-OLaFoDej0",
        "user": {
            "id_usuario": 1,
            "email": "coordinador@sena.edu.co",
            "estado": "ACTIVO",
            "id_rol": 1,
            "rol": "coordinador",
            "rol_detalle": {
                "id_rol": 1,
                "nombre": "coordinador",
                "descripcion": "Rol de administrador de sistema y aplicacion"
            },
            "persona": {
                "id_persona": 1,
                "tipo_documento": "CC",
                "numero_documento": "1234567890",
                "nombres": "Coordinador",
                "apellidos": "Academico",
                "telefono": "3000000000"
            }
        }
    }
}


GET http://localhost:3000/api/auth/me
Headers:
Authorization : Bearer Token
Respesta:
{
    "ok": true,
    "message": "Usuario autenticado obtenido correctamente",
    "data": {
        "id_usuario": 1,
        "email": "coordinador@sena.edu.co",
        "estado": "ACTIVO",
        "id_rol": 1,
        "rol": "coordinador",
        "rol_detalle": {
            "id_rol": 1,
            "nombre": "coordinador",
            "descripcion": "Rol de administrador de sistema y aplicacion"
        },
        "persona": {
            "id_persona": 1,
            "tipo_documento": "CC",
            "numero_documento": "1234567890",
            "nombres": "Coordinador",
            "apellidos": "Academico",
            "telefono": "3000000000"
        }
    }
}

GET http://localhost:3000/api/users
Headers:
Authorization : Bearer Token
Respesta:
{
    "ok": true,
    "message": "Usuarios obtenidos correctamente",
    "data": [
        {
            "id_usuario": 1,
            "email": "coordinador@sena.edu.co",
            "estado": "ACTIVO",
            "created_at": "2026-04-10T09:52:57.000Z",
            "rol": {
                "id_rol": 1,
                "nombre": "coordinador"
            },
            "persona": {
                "id_persona": 1,
                "tipo_documento": "CC",
                "numero_documento": "1234567890",
                "nombres": "Coordinador",
                "apellidos": "Academico",
                "telefono": "3000000000"
            },
            "instructor": null,
            "aprendiz": null
        },
        {
            ...
        },...
    ]
}

POST http://localhost:3000/api/users
Headers:
Authorization : Bearer Token
Body:
{
    "email": "qweasd@sena.edu.co",
    "id_rol": "2",
    "tipo_documento": "CC",
    "numero_documento": "123456789",
    "nombres": "Juan",
    "apellidos": "Perez",
    "telefono": "3123456789"
}
Respesta:
{
    "ok": true,
    "message": "Usuario creado correctamente",
    "data": {
        "id_usuario": 2,
        "email": "qweasd@sena.edu.co",
        "estado": "ACTIVO",
        "created_at": "2026-04-10T05:36:08.000Z",
        "rol": {
            "id_rol": 2,
            "nombre": "instructor"
        },
        "persona": {
            "id_persona": 2,
            "tipo_documento": "CC",
            "numero_documento": "123456789",
            "nombres": "Juan",
            "apellidos": "Perez",
            "telefono": "3123456789"
        },
        "instructor": {
            "id_instructor": 1,
            "codigo_instructor": null,
            "especialidad": null,
            "estado": "ACTIVO"
        },
        "aprendiz": null
    }
}

PUT http://localhost:3000/api/users/id
Headers:
Authorization : Bearer Token
Body:
{
    "email": "qweasd@sena.edu.co",
    "id_rol": "3",
    "tipo_documento": "CC",
    "numero_documento": "123456789",
    "nombres": "Juan",
    "apellidos": "Perez",
    "telefono": "3123456789"
}
Respuesta:
{
    "ok": true,
    "message": "Usuario actualizado correctamente",
    "data": {
        "id_usuario": 2,
        "email": "qweasd@sena.edu.co",
        "estado": "ACTIVO",
        "created_at": "2026-04-10T05:36:08.000Z",
        "rol": {
            "id_rol": 3,
            "nombre": "aprendiz"
        },
        "persona": {
            "id_persona": 2,
            "tipo_documento": "CC",
            "numero_documento": "123456789",
            "nombres": "Juan",
            "apellidos": "Perez",
            "telefono": "3123456789"
        }
    }
}


DELETE http://localhost:3000/api/users/id
Headers:
Authorization : Bearer Token
Body:
Respuesta:
{
    "ok": true,
    "message": "Usuario deshabilitado correctamente",
    "data": {
        "id_usuario": 3,
        "estado": "INACTIVO"
    }
}



GET http://localhost:3000/api/roles

Headers:
Authorization : Bearer Token

Respesta:
{
    "ok": true,
    "message": "Roles obtenidos correctamente",
    "data": [
        {
            "id_rol": 1,
            "nombre": "administrador",
            "descripcion": "Acceso total a la plataforma"
        },
        {
            "id_rol": 2,
            "nombre": "profesor",
            "descripcion": "Instructores"
        },
        {
            "id_rol": 3,
            "nombre": "estudiante",
            "descripcion": "Aprendices"
        }
    ]
}

GET http://localhost:3000/api/roles/idRol/usuarios

Headers:
Authorization : Bearer Token
Respesta:
{
    "ok": true,
    "message": "Usuarios del rol obtenidos correctamente",
    "data": {
        "id_rol": 1,
        "nombre": "coordinador",
        "descripcion": "Rol de administrador de sistema y aplicacion",
        "usuarios": [
            {
                "id_usuario": 1,
                "email": "coordinador@sena.edu.co",
                "estado": "ACTIVO",
                "created_at": "2026-04-11T04:56:54.000Z"
            }
        ]
    }
}

PUT  http://localhost:3000/api/roles/usuarios/idUsuario

Headers:
Authorization : Bearer Token

Body:
{
  "id_rol": 2
}

Respuesta:
{
    "ok": true,
    "message": "Rol asignado correctamente al usuario",
    "data": {
        "id_usuario": 3,
        "email": "aprendiz1@sena.edu.co",
        "estado": "ACTIVO",
        "id_rol": 2,
        "rol": {
            "id_rol": 2,
            "nombre": "profesor",
            "descripcion": "Instructores"
        }
    }
}

importante
Cómo integrarlo las alertas con el resto del sistema
Cuando se crea o actualiza una observación

utiliza al final del controlador:

const { evaluateObservationAlert } = require('../helpers/alertEngine');

// después de crear o actualizar observación
await evaluateObservationAlert(id_aprendiz);

Cuando se aprueba una justificación o se actualiza asistencia

al final del controlador:
const { evaluateInattendanceAlert } = require('../helpers/alertEngine');

// después de aprobar/rechazar o cambiar una asistencia
await evaluateInattendanceAlert(id_aprendiz);


GET http://localhost:3000/api/dashboard/coordinador/resumen
Headers:
Authorization : Bearer Token
Respesta:
{
    "ok": true,
    "message": "Resumen obtenido correctamente",
    "data": {
        "kpis": {
            "total_areas": 0,
            "total_programas": 0,
            "total_grupos_activos": 0,
            "total_aprendices_activos": 0,
            "total_alertas_activas": 0,
            "total_observaciones_abiertas": 0,
            "total_inasistencias_validas": 0
        },
        "areas": [],
        "programas": []
    }
}

GET http://localhost:3000/api/dashboard/coordinador/area/idArea
Headers:
Authorization : Bearer Token
Respesta:
{
    "ok": true,
    "message": "Detalle del área obtenido correctamente",
    "data": {
        "area": {
            "id_area": 2,
            "nombre_area": "Industria de la construccion"
        },
        "grupos": []
    }
}

POST http://localhost:3000/api/coordinator-areas/
Headers:
Authorization : Bearer Token
Body:
{
  "id_area": 1,
  "id_usuario": 1
}
Respesta:
{
    "ok": true,
    "message": "Área asignada correctamente",
    "data": {
        "id_coordinador_area": 1,
        "id_usuario": 1,
        "id_area": 1,
        "estado": "ACTIVO"
    }
}

GET http://localhost:3000/api/coordinator-areas/idcoordinador
Headers:
Authorization : Bearer Token
Respesta:
{
    "ok": true,
    "message": "Áreas del coordinador obtenidas correctamente",
    "data": [
        {
            "id_coordinador_area": 1,
            "id_usuario": 1,
            "id_area": 1,
            "estado": "ACTIVO",
            "area": {
                "id_area": 1,
                "nombre_area": "Tecnologías de la Información"
            }
        }
    ]
}

DELETE http://localhost:3000/api/coordinator-areas/idCoordinados/idArea
Headers:
Authorization : Bearer Token
Respesta:
{
    "ok": true,
    "message": "Asignación desactivada correctamente",
    "data": {
        "id_coordinador_area": 1,
        "id_usuario": 1,
        "id_area": 1,
        "estado": "INACTIVO"
    }
}

Alertas:

POST http://localhost:3000/api/alerts/manual
Headers:
Authorization : Bearer Token
Body:
{
    "id_aprendiz": 1,
    "severidad": "GRAVE",
    "descripcion": "Se reporta situación académica crítica por bajo desempeño sostenido y ausencia de entregables."

}
Respesta:
{
    "ok": true,
    "message": "Alerta manual creada/actualizada correctamente",
    "data": {
        "fecha_alerta": "2026-04-11T03:21:57.905Z",
        "id_alerta": 1,
        "id_aprendiz": 1,
        "id_observacion": null,
        "tipo_alerta": "MANUAL",
        "regla_disparo": "MANUAL",
        "origen": "MANUAL",
        "severidad": "GRAVE",
        "descripcion": "Se reporta situación académica crítica por bajo desempeño sostenido y ausencia de entregables.",
        "fecha_inicio_evaluada": null,
        "fecha_fin_evaluada": null,
        "creada_por": 1,
        "estado": "ACTIVA"
    }
}

POST http://localhost:3000/api/alerts/reevaluate/attendance/:idAprendiz
Headers:
Authorization : Bearer Token
Respesta:
{
  "ok": true,
  "message": "Evaluación de alerta por inasistencia completada",
  "data": {
    "id_alerta": 22,
    "id_aprendiz": 12,
    "id_observacion": null,
    "tipo_alerta": "INASISTENCIA",
    "regla_disparo": "3_CONSECUTIVAS",
    "origen": "AUTOMATICA",
    "severidad": "GRAVE",
    "descripcion": "Se detectaron 3 o más inasistencias consecutivas sin justificación aprobada.",
    "estado": "ACTIVA",
    "fecha_alerta": "2026-04-10T22:20:10.000Z",
    "fecha_inicio_evaluada": "2026-04-01",
    "fecha_fin_evaluada": "2026-04-10",
    "creada_por": null
  }
}

POST /api/alerts/reevaluate/observations/:idAprendiz
Headers:
Authorization : Bearer Token
Respesta:
{
  "ok": true,
  "message": "Evaluación de alerta por observaciones completada",
  "data": {
    "id_alerta": 23,
    "id_aprendiz": 12,
    "id_observacion": 44,
    "tipo_alerta": "OBSERVACIONES_RECURRENTES",
    "regla_disparo": "OBSERVACIONES_RECURRENTES",
    "origen": "AUTOMATICA",
    "severidad": "MODERADA",
    "descripcion": "Se detectaron 3 o más observaciones abiertas en los últimos 30 días.",
    "estado": "ACTIVA",
    "fecha_alerta": "2026-04-10T22:22:18.000Z",
    "fecha_inicio_evaluada": "2026-03-11",
    "fecha_fin_evaluada": "2026-04-10",
    "creada_por": null
  }
}
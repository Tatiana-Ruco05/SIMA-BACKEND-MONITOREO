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


GET http://localhost:3000/api/auth/me
Headers:
Authorization : Bearer Token
Respesta:
{
    "ok": true,
    "message": "Usuario autenticado obtenido correctamente",
    "data": {
        "id_usuario": 1,
        "email": "admin.ctpi@sena.edu.co",
        "estado": "ACTIVO",
        "id_rol": 1,
        "rol": "administrador",
        "rol_detalle": {
            "id_rol": 1,
            "nombre": "administrador",
            "descripcion": "Acceso total a la plataforma"
        }
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

GET http://localhost:3000/api/roles/1/usuarios

Headers:
Authorization : Bearer Token

Respesta:


PUT  http://localhost:3000/api/roles/usuarios/3

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
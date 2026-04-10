const sequelize = require('../config/db');

const Role = require('./roles');
const User = require('./users');
const Person = require('./person');
const Instructor = require('./instructors');
const Apprentice = require('./apprentices');

const EducationalArea = require('./educational_areas');
const Environment = require('./environments');
const Group = require('./groups');
const EducationalSchedule = require('./educational_schedules');
const EducationalSession = require('./EducationalSession');

const IoTDevice = require('./iotDevices');
const EnvironmentAccess = require('./environmentAccesses');

const ApprenticeGroup = require('./apprenticeGroups');
const InstructorGroup = require('./instructorGroups');

const Attendance = require('./attendances');
const Observation = require('./observations');
const Alert = require('./alerts');
const AttendanceJustification = require('./attendanceJustifications');
const Notification = require('./notifications');
const BiometricFingerprint = require('./biometricFingerprints');
const ValidAbsencesView = require('./validAbsencesView');

// =========================
// Usuarios y roles
// =========================
User.belongsTo(Role, {
  foreignKey: 'id_rol',
  as: 'rol',
});

Role.hasMany(User, {
  foreignKey: 'id_rol',
  as: 'usuarios',
});

// =========================
// Usuario y persona
// =========================
User.hasOne(Person, {
  foreignKey: 'id_usuario',
  as: 'persona',
});

Person.belongsTo(User, {
  foreignKey: 'id_usuario',
  as: 'usuario',
});

// =========================
// Usuario e instructor
// =========================
User.hasOne(Instructor, {
  foreignKey: 'id_usuario',
  as: 'instructor',
});

Instructor.belongsTo(User, {
  foreignKey: 'id_usuario',
  as: 'usuario',
});

// =========================
// Usuario y aprendiz
// =========================
User.hasOne(Apprentice, {
  foreignKey: 'id_usuario',
  as: 'aprendiz',
});

Apprentice.belongsTo(User, {
  foreignKey: 'id_usuario',
  as: 'usuario',
});

// =========================
// Áreas y ambientes
// =========================
Group.belongsTo(EducationalArea, {
  foreignKey: 'id_area',
  as: 'area',
});

EducationalArea.hasMany(Group, {
  foreignKey: 'id_area',
  as: 'grupos',
});

Group.belongsTo(Environment, {
  foreignKey: 'id_ambiente',
  as: 'ambiente',
});

Environment.hasMany(Group, {
  foreignKey: 'id_ambiente',
  as: 'grupos',
});

// =========================
// Grupo e instructor líder
// =========================
Group.belongsTo(Instructor, {
  foreignKey: 'id_instructor_lider',
  as: 'instructor_lider',
});

Instructor.hasMany(Group, {
  foreignKey: 'id_instructor_lider',
  as: 'grupos_liderados',
});

// =========================
// Horarios de formación
// =========================
EducationalSchedule.belongsTo(Group, {
  foreignKey: 'id_grupo',
  as: 'grupo',
});

Group.hasMany(EducationalSchedule, {
  foreignKey: 'id_grupo',
  as: 'horarios',
});

EducationalSchedule.belongsTo(Instructor, {
  foreignKey: 'id_instructor',
  as: 'instructor',
});

Instructor.hasMany(EducationalSchedule, {
  foreignKey: 'id_instructor',
  as: 'horarios',
});

EducationalSchedule.belongsTo(Environment, {
  foreignKey: 'id_ambiente',
  as: 'ambiente',
});

Environment.hasMany(EducationalSchedule, {
  foreignKey: 'id_ambiente',
  as: 'horarios',
});

// =========================
// Dispositivos IoT
// =========================
IoTDevice.belongsTo(Environment, {
  foreignKey: 'id_ambiente',
  as: 'ambiente',
});

Environment.hasMany(IoTDevice, {
  foreignKey: 'id_ambiente',
  as: 'dispositivos',
});

// =========================
// Accesos a ambiente
// =========================
EnvironmentAccess.belongsTo(User, {
  foreignKey: 'id_usuario',
  as: 'usuario',
});

User.hasMany(EnvironmentAccess, {
  foreignKey: 'id_usuario',
  as: 'accesos',
});

EnvironmentAccess.belongsTo(IoTDevice, {
  foreignKey: 'id_dispositivo',
  as: 'dispositivo',
});

IoTDevice.hasMany(EnvironmentAccess, {
  foreignKey: 'id_dispositivo',
  as: 'accesos',
});

// =========================
// Relación aprendiz-grupo
// =========================
ApprenticeGroup.belongsTo(Apprentice, {
  foreignKey: 'id_aprendiz',
  as: 'aprendiz',
});

Apprentice.hasMany(ApprenticeGroup, {
  foreignKey: 'id_aprendiz',
  as: 'aprendiz_grupos',
});

ApprenticeGroup.belongsTo(Group, {
  foreignKey: 'id_grupo',
  as: 'grupo',
});

Group.hasMany(ApprenticeGroup, {
  foreignKey: 'id_grupo',
  as: 'aprendiz_grupos',
});

// =========================
// Relación instructor-grupo
// =========================
InstructorGroup.belongsTo(Instructor, {
  foreignKey: 'id_instructor',
  as: 'instructor',
});

Instructor.hasMany(InstructorGroup, {
  foreignKey: 'id_instructor',
  as: 'instructor_grupos',
});

InstructorGroup.belongsTo(Group, {
  foreignKey: 'id_grupo',
  as: 'grupo',
});

Group.hasMany(InstructorGroup, {
  foreignKey: 'id_grupo',
  as: 'instructor_grupos',
});

// =========================
// Sesiones de formación
// =========================
EducationalSession.belongsTo(EducationalSchedule, {
  foreignKey: 'id_horario',
  as: 'horario',
});

EducationalSchedule.hasMany(EducationalSession, {
  foreignKey: 'id_horario',
  as: 'sesiones',
});

EducationalSession.belongsTo(Group, {
  foreignKey: 'id_grupo',
  as: 'grupo',
});

Group.hasMany(EducationalSession, {
  foreignKey: 'id_grupo',
  as: 'sesiones',
});

EducationalSession.belongsTo(Instructor, {
  foreignKey: 'id_instructor',
  as: 'instructor',
});

Instructor.hasMany(EducationalSession, {
  foreignKey: 'id_instructor',
  as: 'sesiones',
});

EducationalSession.belongsTo(Environment, {
  foreignKey: 'id_ambiente',
  as: 'ambiente',
});

Environment.hasMany(EducationalSession, {
  foreignKey: 'id_ambiente',
  as: 'sesiones',
});

EducationalSession.belongsTo(EnvironmentAccess, {
  foreignKey: 'id_acceso_apertura',
  as: 'acceso_apertura',
});

EnvironmentAccess.hasMany(EducationalSession, {
  foreignKey: 'id_acceso_apertura',
  as: 'sesiones_abiertas',
});

EducationalSession.belongsTo(EnvironmentAccess, {
  foreignKey: 'id_acceso_cierre',
  as: 'acceso_cierre',
});

EnvironmentAccess.hasMany(EducationalSession, {
  foreignKey: 'id_acceso_cierre',
  as: 'sesiones_cerradas',
});

// =========================
// Asistencias
// =========================
Attendance.belongsTo(Apprentice, {
  foreignKey: 'id_aprendiz',
  as: 'aprendiz',
});

Apprentice.hasMany(Attendance, {
  foreignKey: 'id_aprendiz',
  as: 'asistencias',
});

Attendance.belongsTo(EnvironmentAccess, {
  foreignKey: 'id_acceso',
  as: 'acceso',
});

EnvironmentAccess.hasMany(Attendance, {
  foreignKey: 'id_acceso',
  as: 'asistencias',
});

Attendance.belongsTo(Group, {
  foreignKey: 'id_grupo',
  as: 'grupo',
});

Group.hasMany(Attendance, {
  foreignKey: 'id_grupo',
  as: 'asistencias',
});

Attendance.belongsTo(EducationalSchedule, {
  foreignKey: 'id_horario',
  as: 'horario',
});

EducationalSchedule.hasMany(Attendance, {
  foreignKey: 'id_horario',
  as: 'asistencias',
});

// Nota:
// NO se modela aquí la relación compuesta
// (id_horario, fecha_clase) -> sesiones_formacion
// porque Sequelize no la maneja bien.

// =========================
// Observaciones
// =========================
Observation.belongsTo(Apprentice, {
  foreignKey: 'id_aprendiz',
  as: 'aprendiz',
});

Apprentice.hasMany(Observation, {
  foreignKey: 'id_aprendiz',
  as: 'observaciones',
});

Observation.belongsTo(Instructor, {
  foreignKey: 'id_instructor',
  as: 'instructor',
});

Instructor.hasMany(Observation, {
  foreignKey: 'id_instructor',
  as: 'observaciones',
});

// =========================
// Alertas
// =========================
Alert.belongsTo(Apprentice, {
  foreignKey: 'id_aprendiz',
  as: 'aprendiz',
});

Apprentice.hasMany(Alert, {
  foreignKey: 'id_aprendiz',
  as: 'alertas',
});

Alert.belongsTo(Observation, {
  foreignKey: 'id_observacion',
  as: 'observacion',
});

Observation.hasMany(Alert, {
  foreignKey: 'id_observacion',
  as: 'alertas',
});

// =========================
// Justificaciones de asistencia
// =========================
AttendanceJustification.belongsTo(Attendance, {
  foreignKey: 'id_asistencia',
  as: 'asistencia',
});

Attendance.hasOne(AttendanceJustification, {
  foreignKey: 'id_asistencia',
  as: 'justificacion',
});

AttendanceJustification.belongsTo(Apprentice, {
  foreignKey: 'id_aprendiz',
  as: 'aprendiz',
});

Apprentice.hasMany(AttendanceJustification, {
  foreignKey: 'id_aprendiz',
  as: 'justificaciones',
});

AttendanceJustification.belongsTo(Instructor, {
  foreignKey: 'revisada_por',
  as: 'instructor_revisor',
});

Instructor.hasMany(AttendanceJustification, {
  foreignKey: 'revisada_por',
  as: 'justificaciones_revisadas',
});

// =========================
// Notificaciones
// =========================
Notification.belongsTo(User, {
  foreignKey: 'id_usuario',
  as: 'usuario',
});

User.hasMany(Notification, {
  foreignKey: 'id_usuario',
  as: 'notificaciones',
});

Notification.belongsTo(Alert, {
  foreignKey: 'id_alerta',
  as: 'alerta',
});

Alert.hasMany(Notification, {
  foreignKey: 'id_alerta',
  as: 'notificaciones',
});

// =========================
// Huellas biométricas
// =========================
BiometricFingerprint.belongsTo(User, {
  foreignKey: 'id_usuario',
  as: 'usuario',
});

User.hasMany(BiometricFingerprint, {
  foreignKey: 'id_usuario',
  as: 'huellas',
});

BiometricFingerprint.belongsTo(IoTDevice, {
  foreignKey: 'id_dispositivo',
  as: 'dispositivo',
});

IoTDevice.hasMany(BiometricFingerprint, {
  foreignKey: 'id_dispositivo',
  as: 'huellas',
});

BiometricFingerprint.belongsTo(User, {
  foreignKey: 'enrolado_por',
  as: 'enrolador',
});

User.hasMany(BiometricFingerprint, {
  foreignKey: 'enrolado_por',
  as: 'huellas_enroladas',
});

// =========================
// Exportación
// =========================
module.exports = {
  sequelize,
  Role,
  User,
  Person,
  Instructor,
  Apprentice,
  EducationalArea,
  Environment,
  Group,
  EducationalSchedule,
  EducationalSession,
  IoTDevice,
  EnvironmentAccess,
  ApprenticeGroup,
  InstructorGroup,
  Attendance,
  Observation,
  Alert,
  AttendanceJustification,
  Notification,
  BiometricFingerprint,
  ValidAbsencesView,
};
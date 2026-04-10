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
const IoTDevice = require('./iotDevices');
const EnvironmentAccess = require('./environmentAccesses');
const ApprenticeGroup = require('./apprenticeGroups');
const InstructorGroup = require('./instructorGroups');
const EducationalSession = require('./EducationalSession');
const Attendance = require('./attendances');
const Observation = require('./observations');
const Alert = require('./alerts');
const AttendanceJustification = require('./attendanceJustifications');
const Notification = require('./notifications');
const BiometricFingerprint = require('./biometricFingerprints');
const ValidAbsencesView = require('./validAbsencesView');

User.belongsTo(Role, {
  foreignKey: 'id_rol',
  as: 'rol',
});

Role.hasMany(User, {
  foreignKey: 'id_rol',
  as: 'usuarios',
});

Instructor.belongsTo(User, {
  foreignKey: 'id_usuario',
  as: 'usuario',
});

User.hasOne(Instructor, {
  foreignKey: 'id_usuario',
  as: 'instructor',
});

Apprentice.belongsTo(User, {
  foreignKey: 'id_usuario',
  as: 'usuario',
});

User.hasOne(Apprentice, {
  foreignKey: 'id_usuario',
  as: 'aprendiz',
});

User.hasOne(Person, { 
  foreignKey: 'id_usuario',
  as: 'persona'
});

Person.belongsTo(User, {
  foreignKey: 'id_usuario',
  as: 'usuario'
});

module.exports = {
  sequelize,
  Role,
  User,
  Person,
  Instructor,
  Apprentice,
  Group,
  ApprenticeGroup,
  InstructorGroup,
};
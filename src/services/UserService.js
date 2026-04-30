const { Op } = require('sequelize');
const {
  User,
  Role,
  Person,
  Instructor,
  Apprentice,
  Group,
  ApprenticeGroup,
  InstructorGroup,
  sequelize,
} = require('../models');
const { hashPassword } = require('../helpers/bcrypt');

class UserService {
  /**
   * Obtiene todos los usuarios
   */
  static async getAllUsers() {
    return User.findAll({
      attributes: ['id_usuario', 'email', 'estado', 'created_at'],
      include: [
        { model: Role, as: 'rol', attributes: ['id_rol', 'nombre'] },
        { model: Person, as: 'persona', attributes: ['id_persona', 'tipo_documento', 'numero_documento', 'nombres', 'apellidos', 'telefono'] },
        { model: Instructor, as: 'instructor', required: false, attributes: ['id_instructor', 'estado'] },
        { model: Apprentice, as: 'aprendiz', required: false, attributes: ['id_aprendiz', 'estado', 'estado_formativo'] },
      ],
      order: [['id_usuario', 'ASC']],
    });
  }

  /**
   * Obtiene un usuario por ID con comprobación de permisos
   */
  static async getUserById(id, requester) {
    const targetUser = await User.findByPk(id, {
      attributes: ['id_usuario', 'email', 'estado', 'created_at'],
      include: [
        { model: Role, as: 'rol', attributes: ['id_rol', 'nombre'] },
        { model: Person, as: 'persona', attributes: ['id_persona', 'tipo_documento', 'numero_documento', 'nombres', 'apellidos', 'telefono'] },
        { model: Instructor, as: 'instructor', required: false, attributes: ['id_instructor', 'estado'] },
        { model: Apprentice, as: 'aprendiz', required: false, attributes: ['id_aprendiz', 'estado', 'estado_formativo'] },
      ],
    });

    if (!targetUser) {
      throw { status: 404, message: 'Usuario no encontrado' };
    }

    if (requester.rol === 'coordinador') {
      return targetUser;
    }

    if (requester.rol === 'aprendiz') {
      if (Number(requester.id_usuario) !== Number(id)) {
        throw { status: 403, message: 'No tienes permisos para consultar los datos de otro usuario' };
      }
      return targetUser;
    }

    if (requester.rol === 'instructor') {
      if (!targetUser.aprendiz) {
        throw { status: 403, message: 'Un instructor solo puede consultar aprendices relacionados' };
      }

      const requesterInstructor = await Instructor.findOne({
        where: { id_usuario: requester.id_usuario, estado: 'ACTIVO' },
        attributes: ['id_instructor'],
      });

      if (!requesterInstructor) {
        throw { status: 403, message: 'El usuario instructor no tiene perfil activo de instructor' };
      }

      const apprenticeGroupLinks = await ApprenticeGroup.findAll({
        where: { id_aprendiz: targetUser.aprendiz.id_aprendiz, estado: 'ACTIVO' },
        attributes: ['id_grupo'],
      });

      if (!apprenticeGroupLinks.length) {
        throw { status: 403, message: 'El aprendiz no pertenece a grupos formativos activos' };
      }

      const groupIds = apprenticeGroupLinks.map((item) => item.id_grupo);

      const leaderGroup = await Group.findOne({
        where: {
          id_grupo: { [Op.in]: groupIds },
          id_instructor_lider: requesterInstructor.id_instructor,
        },
        attributes: ['id_grupo'],
      });

      if (leaderGroup) {
        return {
          id_usuario: targetUser.id_usuario,
          email: targetUser.email,
          persona: {
            nombres: targetUser.persona?.nombres || null,
            apellidos: targetUser.persona?.apellidos || null,
            numero_documento: targetUser.persona?.numero_documento || null,
          },
        };
      }

      const assignedGroup = await InstructorGroup.findOne({
        where: {
          id_instructor: requesterInstructor.id_instructor,
          id_grupo: { [Op.in]: groupIds },
          estado: 'ACTIVO',
        },
        attributes: ['id_grupo'],
      });

      if (assignedGroup) {
        return {
          id_usuario: targetUser.id_usuario,
          email: targetUser.email,
          persona: {
            nombres: targetUser.persona?.nombres || null,
            apellidos: targetUser.persona?.apellidos || null,
            telefono: targetUser.persona?.telefono || null,
          },
        };
      }

      throw { status: 403, message: 'No tienes permisos para consultar este aprendiz' };
    }

    throw { status: 403, message: 'Rol no autorizado para esta operación' };
  }

  /**
   * Crea un usuario y sus perfiles asociados usando transacción
   */
  static async createUser(data) {
    const { email, password, id_rol, tipo_documento, numero_documento, nombres, apellidos, telefono } = data;
    const transaction = await sequelize.transaction();

    try {
      const existingUser = await User.findOne({ where: { email }, transaction });
      if (existingUser) throw { status: 409, message: 'El correo ya está registrado' };

      const existingPerson = await Person.findOne({ where: { numero_documento }, transaction });
      if (existingPerson) throw { status: 409, message: 'Ya existe una persona registrada con ese número de documento' };

      const role = await Role.findByPk(id_rol, { transaction });
      if (!role) throw { status: 404, message: 'Rol no encontrado' };

      const plainPassword = password && String(password).trim() !== '' ? String(password) : String(numero_documento);
      const hashedPassword = await hashPassword(plainPassword);

      const user = await User.create({ email, password: hashedPassword, id_rol, estado: 'ACTIVO' }, { transaction });

      await Person.create({
        id_usuario: user.id_usuario,
        tipo_documento,
        numero_documento,
        nombres,
        apellidos,
        telefono: telefono || null,
      }, { transaction });

      await this._syncUserProfile(user.id_usuario, role.nombre, transaction);

      await transaction.commit();

      return User.findByPk(user.id_usuario, {
        attributes: ['id_usuario', 'email', 'estado', 'created_at'],
        include: [
          { model: Role, as: 'rol', attributes: ['id_rol', 'nombre'] },
          { model: Person, as: 'persona', attributes: ['id_persona', 'tipo_documento', 'numero_documento', 'nombres', 'apellidos', 'telefono'] },
          { model: Instructor, as: 'instructor', required: false, attributes: ['id_instructor', 'codigo_instructor', 'especialidad', 'estado'] },
          { model: Apprentice, as: 'aprendiz', required: false, attributes: ['id_aprendiz', 'estado_formativo', 'estado'] },
        ],
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Actualiza un usuario
   */
  static async updateUser(id, data, requester) {
    const transaction = await sequelize.transaction();

    try {
      const user = await User.findByPk(id, { include: [{ model: Person, as: 'persona' }], transaction });
      if (!user) throw { status: 404, message: 'Usuario no encontrado' };

      const isCoordinator = requester.rol === 'coordinador';
      const isSelfUpdate = Number(requester.id_usuario) === Number(id);

      if (!isCoordinator && !isSelfUpdate) {
        throw { status: 403, message: 'No tienes permisos para modificar los datos de otro usuario' };
      }

      if (data.email && data.email !== user.email) {
        const emailExists = await User.findOne({ where: { email: data.email }, transaction });
        if (emailExists) throw { status: 409, message: 'El correo ya está registrado' };
      }

      const userUpdateData = {};
      const personUpdateData = {};

      if (isCoordinator) {
        if (data.email !== undefined) userUpdateData.email = data.email;
        if (data.id_rol !== undefined) userUpdateData.id_rol = data.id_rol;
        if (data.estado !== undefined) userUpdateData.estado = data.estado;

        if (data.password && String(data.password).trim() !== '') {
          userUpdateData.password = await hashPassword(String(data.password));
        }

        if (user.persona) {
          if (data.numero_documento && data.numero_documento !== user.persona.numero_documento) {
            const documentExists = await Person.findOne({ where: { numero_documento: data.numero_documento }, transaction });
            if (documentExists) throw { status: 409, message: 'Ya existe una persona registrada con ese número de documento' };
          }
          if (data.tipo_documento !== undefined) personUpdateData.tipo_documento = data.tipo_documento;
          if (data.numero_documento !== undefined) personUpdateData.numero_documento = data.numero_documento;
          if (data.nombres !== undefined) personUpdateData.nombres = data.nombres;
          if (data.apellidos !== undefined) personUpdateData.apellidos = data.apellidos;
          if (data.telefono !== undefined) personUpdateData.telefono = data.telefono;
        }
      } else {
        if (data.id_rol !== undefined || data.estado !== undefined) {
          throw { status: 403, message: 'No tienes permisos para modificar rol o estado' };
        }
        if (data.tipo_documento !== undefined || data.numero_documento !== undefined || data.nombres !== undefined || data.apellidos !== undefined) {
          throw { status: 403, message: 'No tienes permisos para modificar tipo de documento, número de documento, nombres o apellidos' };
        }

        if (data.email !== undefined) userUpdateData.email = data.email;
        if (data.password && String(data.password).trim() !== '') {
          userUpdateData.password = await hashPassword(String(data.password));
        }
        if (user.persona && data.telefono !== undefined) {
          personUpdateData.telefono = data.telefono;
        }
      }

      if (Object.keys(userUpdateData).length > 0) {
        await user.update(userUpdateData, { transaction });
      }
      if (user.persona && Object.keys(personUpdateData).length > 0) {
        await user.persona.update(personUpdateData, { transaction });
      }

      if (isCoordinator && data.id_rol !== undefined) {
        const newRole = await Role.findByPk(data.id_rol, { transaction });
        if (!newRole) throw { status: 404, message: 'Rol no encontrado' };
        await this._syncUserProfile(user.id_usuario, newRole.nombre, transaction);
      }

      await transaction.commit();

      return User.findByPk(id, {
        attributes: ['id_usuario', 'email', 'estado', 'created_at'],
        include: [
          { model: Role, as: 'rol', attributes: ['id_rol', 'nombre'] },
          { model: Person, as: 'persona', attributes: ['id_persona', 'tipo_documento', 'numero_documento', 'nombres', 'apellidos', 'telefono'] },
        ],
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Elimina/Deshabilita usuario
   */
  static async deleteUser(id) {
    const user = await User.findByPk(id);
    if (!user) throw { status: 404, message: 'Usuario no encontrado' };

    await user.update({ estado: 'INACTIVO' });
    return { id_usuario: user.id_usuario, estado: 'INACTIVO' };
  }

  /**
   * Cambia el rol de un usuario y sincroniza su perfil (Instructor/Aprendiz)
   */
  static async changeUserRole(idUsuario, id_rol) {
    const transaction = await sequelize.transaction();
    try {
      const user = await User.findByPk(idUsuario, { transaction });
      if (!user) throw { status: 404, message: 'Usuario no encontrado' };

      const role = await Role.findByPk(id_rol, { transaction });
      if (!role) throw { status: 404, message: 'Rol no encontrado' };

      await user.update({ id_rol }, { transaction });
      await this._syncUserProfile(user.id_usuario, role.nombre, transaction);

      await transaction.commit();

      return User.findByPk(idUsuario, {
        attributes: ['id_usuario', 'email', 'estado', 'id_rol'],
        include: [{ model: Role, as: 'rol', attributes: ['id_rol', 'nombre', 'descripcion'] }],
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Método interno para sincronizar los perfiles (Instructor/Aprendiz) 
   * según el rol del usuario, resolviendo la duplicación de código.
   */
  static async _syncUserProfile(id_usuario, roleName, transaction) {
    const apprenticeProfile = await Apprentice.findOne({ where: { id_usuario }, transaction });
    const instructorProfile = await Instructor.findOne({ where: { id_usuario }, transaction });

    if (roleName === 'aprendiz') {
      if (apprenticeProfile) {
        await apprenticeProfile.update({ estado: 'ACTIVO' }, { transaction });
      } else {
        await Apprentice.create({ id_usuario, estado_formativo: 'EN_FORMACION', estado: 'ACTIVO' }, { transaction });
      }
      if (instructorProfile) await instructorProfile.update({ estado: 'INACTIVO' }, { transaction });
    } else if (roleName === 'instructor') {
      if (instructorProfile) {
        await instructorProfile.update({ estado: 'ACTIVO' }, { transaction });
      } else {
        await Instructor.create({ id_usuario, estado: 'ACTIVO' }, { transaction });
      }
      if (apprenticeProfile) await apprenticeProfile.update({ estado: 'INACTIVO' }, { transaction });
    } else if (roleName === 'coordinador') {
      if (instructorProfile) await instructorProfile.update({ estado: 'INACTIVO' }, { transaction });
      if (apprenticeProfile) await apprenticeProfile.update({ estado: 'INACTIVO' }, { transaction });
    }
  }
}

module.exports = UserService;

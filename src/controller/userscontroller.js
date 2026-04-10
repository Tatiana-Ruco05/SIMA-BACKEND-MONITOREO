const { User, Role, Person, Instructor, Apprentice, Group, ApprenticeGroup, InstructorGroup, sequelize } = require('../models');
const { successResponse, errorResponse } = require('../helpers/response');
const { hashPassword } = require('../helpers/bcrypt');

const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id_usuario', 'email', 'estado', 'created_at'],
      include: [
        {
          model: Role,
          as: 'rol',
          attributes: ['id_rol', 'nombre'],
        },
        {
          model: Person,
          as: 'persona',
          attributes: [
            'id_persona',
            'tipo_documento',
            'numero_documento',
            'nombres',
            'apellidos',
            'telefono',
          ],
        },
        {
          model: Instructor,
          as: 'instructor',
          required: false,
          attributes: ['id_instructor', 'estado'],
        },
        {
          model: Apprentice,
          as: 'aprendiz',
          required: false,
          attributes: ['id_aprendiz', 'estado', 'estado_formativo'],
        },
      ],
      order: [['id_usuario', 'ASC']],
    });

    return successResponse(res, 'Usuarios obtenidos correctamente', users);
  } catch (error) {
    return errorResponse(res, 'Error al obtener usuarios', 500, error.message);
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const requester = req.user;
    const { Op } = require('sequelize');

    const targetUser = await User.findByPk(id, {
      attributes: ['id_usuario', 'email', 'estado', 'created_at'],
      include: [
        {
          model: Role,
          as: 'rol',
          attributes: ['id_rol', 'nombre'],
        },
        {
          model: Person,
          as: 'persona',
          attributes: [
            'id_persona',
            'tipo_documento',
            'numero_documento',
            'nombres',
            'apellidos',
            'telefono',
          ],
        },
        {
          model: Instructor,
          as: 'instructor',
          required: false,
          attributes: ['id_instructor', 'estado'],
        },
        {
          model: Apprentice,
          as: 'aprendiz',
          required: false,
          attributes: ['id_aprendiz', 'estado', 'estado_formativo'],
        },
      ],
    });

    if (!targetUser) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    // 1. Coordinador: ve todo
    if (requester.rol === 'coordinador') {
      return successResponse(res, 'Usuario obtenido correctamente', targetUser);
    }

    // 2. Aprendiz: solo a sí mismo
    if (requester.rol === 'aprendiz') {
      if (Number(requester.id_usuario) !== Number(id)) {
        return errorResponse(
          res,
          'No tienes permisos para consultar los datos de otro usuario',
          403
        );
      }

      return successResponse(res, 'Usuario obtenido correctamente', targetUser);
    }

    // 3. Instructor: solo si el usuario consultado es aprendiz relacionado
    if (requester.rol === 'instructor') {
      if (!targetUser.aprendiz) {
        return errorResponse(
          res,
          'Un instructor solo puede consultar aprendices relacionados',
          403
        );
      }

      const requesterInstructor = await Instructor.findOne({
        where: {
          id_usuario: requester.id_usuario,
          estado: 'ACTIVO',
        },
        attributes: ['id_instructor'],
      });

      if (!requesterInstructor) {
        return errorResponse(
          res,
          'El usuario instructor no tiene perfil activo de instructor',
          403
        );
      }

      const apprenticeGroupLinks = await ApprenticeGroup.findAll({
        where: {
          id_aprendiz: targetUser.aprendiz.id_aprendiz,
          estado: 'ACTIVO',
        },
        attributes: ['id_grupo'],
      });

      if (!apprenticeGroupLinks.length) {
        return errorResponse(
          res,
          'El aprendiz no pertenece a grupos formativos activos',
          403
        );
      }

      const groupIds = apprenticeGroupLinks.map((item) => item.id_grupo);

      // Caso A: instructor líder del grupo
      const leaderGroup = await Group.findOne({
        where: {
          id_grupo: {
            [Op.in]: groupIds,
          },
          id_instructor_lider: requesterInstructor.id_instructor,
        },
        attributes: ['id_grupo'],
      });

      if (leaderGroup) {
        return successResponse(res, 'Usuario obtenido correctamente', {
          id_usuario: targetUser.id_usuario,
          email: targetUser.email,
          persona: {
            nombres: targetUser.persona?.nombres || null,
            apellidos: targetUser.persona?.apellidos || null,
            numero_documento: targetUser.persona?.numero_documento || null,
          },
        });
      }

      // Caso B: instructor asignado por instructor_grupo
      const assignedGroup = await InstructorGroup.findOne({
        where: {
          id_instructor: requesterInstructor.id_instructor,
          id_grupo: {
            [Op.in]: groupIds,
          },
          estado: 'ACTIVO',
        },
        attributes: ['id_grupo'],
      });

      if (assignedGroup) {
        return successResponse(res, 'Usuario obtenido correctamente', {
          id_usuario: targetUser.id_usuario,
          email: targetUser.email,
          persona: {
            nombres: targetUser.persona?.nombres || null,
            apellidos: targetUser.persona?.apellidos || null,
            telefono: targetUser.persona?.telefono || null,
          },
        });
      }

      return errorResponse(
        res,
        'No tienes permisos para consultar este aprendiz',
        403
      );
    }

    return errorResponse(res, 'Rol no autorizado para esta operación', 403);
  } catch (error) {
    return errorResponse(res, 'Error al obtener usuario', 500, error.message);
  }
};

const createUser = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      email,
      password,
      id_rol,
      tipo_documento,
      numero_documento,
      nombres,
      apellidos,
      telefono,
    } = req.body;

    if (!email || !id_rol || !tipo_documento || !numero_documento || !nombres || !apellidos) {
      await transaction.rollback();
      return errorResponse(res, 'Faltan campos obligatorios', 400);
    }

    const existingUser = await User.findOne({ where: { email }, transaction });
    if (existingUser) {
      await transaction.rollback();
      return errorResponse(res, 'El correo ya está registrado', 409);
    }

    const existingPerson = await Person.findOne({ where: { numero_documento }, transaction });
    if (existingPerson) {
      await transaction.rollback();
      return errorResponse(
        res,
        'Ya existe una persona registrada con ese número de documento',
        409
      );
    }

    const role = await Role.findByPk(id_rol, { transaction });
    if (!role) {
      await transaction.rollback();
      return errorResponse(res, 'Rol no encontrado', 404);
    }

    const plainPassword =
      password && String(password).trim() !== ''
        ? String(password)
        : String(numero_documento);

    const hashedPassword = await hashPassword(plainPassword);

    const user = await User.create(
      {
        email,
        password: hashedPassword,
        id_rol,
        estado: 'ACTIVO',
      },
      { transaction }
    );

    await Person.create(
      {
        id_usuario: user.id_usuario,
        tipo_documento,
        numero_documento,
        nombres,
        apellidos,
        telefono: telefono || null,
      },
      { transaction }
    );

    // Crear o activar perfil especializado según rol
    if (role.nombre === 'aprendiz') {
      const apprenticeProfile = await Apprentice.findOne({
        where: { id_usuario: user.id_usuario },
        transaction,
      });

      if (apprenticeProfile) {
        await apprenticeProfile.update(
          {
            estado: 'ACTIVO',
          },
          { transaction }
        );
      } else {
        await Apprentice.create(
          {
            id_usuario: user.id_usuario,
            estado_formativo: 'EN_FORMACION',
            estado: 'ACTIVO',
          },
          { transaction }
        );
      }
    }

    if (role.nombre === 'instructor') {
      const instructorProfile = await Instructor.findOne({
        where: { id_usuario: user.id_usuario },
        transaction,
      });

      if (instructorProfile) {
        await instructorProfile.update(
          {
            estado: 'ACTIVO',
          },
          { transaction }
        );
      } else {
        await Instructor.create(
          {
            id_usuario: user.id_usuario,
            estado: 'ACTIVO',
          },
          { transaction }
        );
      }
    }

    await transaction.commit();

    const createdUser = await User.findByPk(user.id_usuario, {
      attributes: ['id_usuario', 'email', 'estado', 'created_at'],
      include: [
        {
          model: Role,
          as: 'rol',
          attributes: ['id_rol', 'nombre'],
        },
        {
          model: Person,
          as: 'persona',
          attributes: [
            'id_persona',
            'tipo_documento',
            'numero_documento',
            'nombres',
            'apellidos',
            'telefono',
          ],
        },
        {
          model: Instructor,
          as: 'instructor',
          required: false,
          attributes: ['id_instructor', 'codigo_instructor', 'especialidad', 'estado'],
        },
        {
          model: Apprentice,
          as: 'aprendiz',
          required: false,
          attributes: ['id_aprendiz', 'estado_formativo', 'estado'],
        },
      ],
    });

    return successResponse(res, 'Usuario creado correctamente', createdUser, 201);
  } catch (error) {
    await transaction.rollback();
    return errorResponse(res, 'Error al crear usuario', 500, error.message);
  }
};

const updateUser = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const requester = req.user;

    const {
      email,
      password,
      id_rol,
      estado,
      tipo_documento,
      numero_documento,
      nombres,
      apellidos,
      telefono,
      fecha_nacimiento,
    } = req.body;

    const user = await User.findByPk(id, {
      include: [
        {
          model: Person,
          as: 'persona',
        },
      ],
      transaction,
    });

    if (!user) {
      await transaction.rollback();
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    const isCoordinator = requester.rol === 'coordinador';
    const isSelfUpdate = Number(requester.id_usuario) === Number(id);

    if (!isCoordinator && !isSelfUpdate) {
      await transaction.rollback();
      return errorResponse(
        res,
        'No tienes permisos para modificar los datos de otro usuario',
        403
      );
    }

    if (email && email !== user.email) {
      const emailExists = await User.findOne({ where: { email }, transaction });
      if (emailExists) {
        await transaction.rollback();
        return errorResponse(res, 'El correo ya está registrado', 409);
      }
    }

    const userUpdateData = {};
    const personUpdateData = {};

    if (isCoordinator) {
      if (email !== undefined) userUpdateData.email = email;
      if (id_rol !== undefined) userUpdateData.id_rol = id_rol;
      if (estado !== undefined) userUpdateData.estado = estado;

      if (password !== undefined && String(password).trim() !== '') {
        userUpdateData.password = await hashPassword(String(password));
      }

      if (user.persona) {
        if (
          numero_documento &&
          numero_documento !== user.persona.numero_documento
        ) {
          const documentExists = await Person.findOne({
            where: { numero_documento },
            transaction,
          });

          if (documentExists) {
            await transaction.rollback();
            return errorResponse(
              res,
              'Ya existe una persona registrada con ese número de documento',
              409
            );
          }
        }

        if (tipo_documento !== undefined) personUpdateData.tipo_documento = tipo_documento;
        if (numero_documento !== undefined) personUpdateData.numero_documento = numero_documento;
        if (nombres !== undefined) personUpdateData.nombres = nombres;
        if (apellidos !== undefined) personUpdateData.apellidos = apellidos;
        if (telefono !== undefined) personUpdateData.telefono = telefono;

        // fecha_nacimiento reservada para cuando exista en BD
        if (fecha_nacimiento !== undefined) {
          // no se guarda porque el campo no existe actualmente
        }
      }
    } else {
      if (id_rol !== undefined || estado !== undefined) {
        await transaction.rollback();
        return errorResponse(
          res,
          'No tienes permisos para modificar rol o estado',
          403
        );
      }

      if (
        tipo_documento !== undefined ||
        numero_documento !== undefined ||
        nombres !== undefined ||
        apellidos !== undefined ||
        fecha_nacimiento !== undefined
      ) {
        await transaction.rollback();
        return errorResponse(
          res,
          'No tienes permisos para modificar tipo de documento, número de documento, nombres, apellidos o fecha de nacimiento',
          403
        );
      }

      if (email !== undefined) userUpdateData.email = email;

      if (password !== undefined && String(password).trim() !== '') {
        userUpdateData.password = await hashPassword(String(password));
      }

      if (user.persona && telefono !== undefined) {
        personUpdateData.telefono = telefono;
      }
    }

    if (Object.keys(userUpdateData).length > 0) {
      await user.update(userUpdateData, { transaction });
    }

    if (user.persona && Object.keys(personUpdateData).length > 0) {
      await user.persona.update(personUpdateData, { transaction });
    }

        if (isCoordinator && id_rol !== undefined) {
      const newRole = await Role.findByPk(id_rol, { transaction });

      if (!newRole) {
        await transaction.rollback();
        return errorResponse(res, 'Rol no encontrado', 404);
      }

      if (newRole.nombre === 'aprendiz') {
        const apprenticeProfile = await Apprentice.findOne({
          where: { id_usuario: user.id_usuario },
          transaction,
        });

        if (apprenticeProfile) {
          await apprenticeProfile.update(
            {
              estado: 'ACTIVO',
            },
            { transaction }
          );
        } else {
          await Apprentice.create(
            {
              id_usuario: user.id_usuario,
              estado_formativo: 'EN_FORMACION',
              estado: 'ACTIVO',
            },
            { transaction }
          );
        }

        const instructorProfile = await Instructor.findOne({
          where: { id_usuario: user.id_usuario },
          transaction,
        });

        if (instructorProfile) {
          await instructorProfile.update(
            {
              estado: 'INACTIVO',
            },
            { transaction }
          );
        }
      }

      if (newRole.nombre === 'instructor') {
        const instructorProfile = await Instructor.findOne({
          where: { id_usuario: user.id_usuario },
          transaction,
        });

        if (instructorProfile) {
          await instructorProfile.update(
            {
              estado: 'ACTIVO',
            },
            { transaction }
          );
        } else {
          await Instructor.create(
            {
              id_usuario: user.id_usuario,
              estado: 'ACTIVO',
            },
            { transaction }
          );
        }

        const apprenticeProfile = await Apprentice.findOne({
          where: { id_usuario: user.id_usuario },
          transaction,
        });

        if (apprenticeProfile) {
          await apprenticeProfile.update(
            {
              estado: 'INACTIVO',
            },
            { transaction }
          );
        }
      }

      if (newRole.nombre === 'coordinador') {
        const instructorProfile = await Instructor.findOne({
          where: { id_usuario: user.id_usuario },
          transaction,
        });

        if (instructorProfile) {
          await instructorProfile.update(
            {
              estado: 'INACTIVO',
            },
            { transaction }
          );
        }

        const apprenticeProfile = await Apprentice.findOne({
          where: { id_usuario: user.id_usuario },
          transaction,
        });

        if (apprenticeProfile) {
          await apprenticeProfile.update(
            {
              estado: 'INACTIVO',
            },
            { transaction }
          );
        }
      }
    }

    await transaction.commit();

    const updatedUser = await User.findByPk(id, {
      attributes: ['id_usuario', 'email', 'estado', 'created_at'],
      include: [
        {
          model: Role,
          as: 'rol',
          attributes: ['id_rol', 'nombre'],
        },
        {
          model: Person,
          as: 'persona',
          attributes: [
            'id_persona',
            'tipo_documento',
            'numero_documento',
            'nombres',
            'apellidos',
            'telefono',
          ],
        },
      ],
    });

    return successResponse(res, 'Usuario actualizado correctamente', updatedUser);
  } catch (error) {
    await transaction.rollback();
    return errorResponse(res, 'Error al actualizar usuario', 500, error.message);
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);

    if (!user) {
      return errorResponse(res, 'Usuario no encontrado', 404);
    }

    await user.update({ estado: 'INACTIVO' });

    return successResponse(res, 'Usuario deshabilitado correctamente', {
      id_usuario: user.id_usuario,
      estado: 'INACTIVO',
    });
  } catch (error) {
    return errorResponse(res, 'Error al deshabilitar usuario', 500, error.message);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
};
const UserBO = class {
    constructor() {}
  
    async getUsers(params) {
      try {
        const result = await database.executeQuery("security", "getUsers", []);
        if (!result || !result.rows) {
          console.error("La consulta no devolvió resultados");
          return { sts: false, msg: "Error al obtener usuarios" };
        }

        const formattedRows = result.rows.map(user => ({
            ...user,
            birth_date: user.birth_date
              ? user.birth_date.toISOString().split("T")[0]
              : null
          }));

        return { sts: true, data: formattedRows };
      } catch (error) {
        console.error("Error en getUsers:", error);
        return { sts: false, msg: "Error al ejecutar la consulta" };
      }
    }
  

    async createUser(params) {
      try {
        // Validar que existan todos los datos obligatorios
        const { name, lastName, birthDate, email, password, numberId, id_profile } = params;
        
        if (!name || !lastName || !birthDate || !email || !password || !numberId || !id_profile) {
          return { sts: false, msg: "Faltan datos obligatorios" };
        }
        
        // Insertar la persona en la tabla public.person
        const personResult = await database.executeQuery("public", "createPerson", [
          name,
          lastName,
          birthDate
        ]);
        if (!personResult || !personResult.rows || personResult.rows.length === 0) {
          console.error("No se pudo crear la persona");
          return { sts: false, msg: "No se pudo crear la persona" };
        }
        
        // Obtener el id_person generado
        const id_person = personResult.rows[0].id_person;
        console.log(`Persona creada con id_person: ${id_person}`);
        
        // Insertar el usuario en la tabla security.user
        const userResult = await database.executeQuery("security", "createUser", [
          email,
          password,
          numberId,
          id_person
        ]);
        if (!(userResult && userResult.rowCount > 0)) {
          return { sts: false, msg: "No se pudo crear el usuario" };
        }
  
        // Obtener el id del usuario recién creado
        const id_user = userResult.rows[0].id_user;
  
        // Insertar en la tabla user_profile para asignar los perfiles al usuario
        let allInserted = true;
        for (let profileId of id_profile) {
          const userProfileResult = await database.executeQuery("security", "createUserProfile", [
            id_user,
            profileId
          ]);
          if (!(userProfileResult && userProfileResult.rowCount > 0)) {
            allInserted = false;
            console.error(`No se pudo asignar el perfil ${profileId} al usuario ${email}`);
          }
        }
        if (allInserted) {
          console.log(`El usuario: ${email} fue creado y asignado a los perfiles correctamente`);
          return { sts: true, msg: "Usuario creado correctamente" };
        } else {
          return { sts: false, msg: "Usuario creado, pero no se pudo asignar uno o más perfiles" };
        }
      } catch (error) {
        console.error("Error en createUser:", error);
        return { sts: false, msg: "Error al crear el usuario" };
      }
    }
  
    async updateUser(params) {
      try {
        // Se espera recibir los siguientes parámetros: 
        // id_user, id_person, name, lastName, birthDate, email, numberId y profile (arreglo de id_profile)
        const { id_user, id_person, name, lastName, birthDate, email, numberId, profile } = params;
        if (!id_user || !id_person || !name || !lastName || !birthDate || !email || !numberId || !profile) {
          console.log("params: ", params);
          return { sts: false, msg: "Faltan datos obligatorios" };
        }
        
        // Actualizar la persona en la tabla public.person
        const personResult = await database.executeQuery("public", "updatePerson", [
          name,
          lastName,
          birthDate,
          id_person
        ]);
        if (!personResult || personResult.rowCount === 0) {
          console.error("No se pudo actualizar la persona");
          return { sts: false, msg: "No se pudo actualizar la persona" };
        }
    
        // Actualizar el usuario en la tabla security.user
        const userResult = await database.executeQuery("security", "updateUser", [
          email,
          numberId,
          id_user
        ]);
        if (!userResult || userResult.rowCount === 0) {
          console.error("No se pudo actualizar el usuario");
          return { sts: false, msg: "No se pudo actualizar el usuario" };
        }
    
        // Eliminar las relaciones actuales en la tabla security.user_profile
        // Se envía el id_user dentro de un array para que se interprete como un arreglo literal
        await database.executeQuery("security", "deleteUserProfileByUserId", [[id_user]]);
    
        // Insertar las nuevas relaciones para cada perfil
        let allInserted = true;
        for (let profileId of profile) {
          const userProfileResult = await database.executeQuery("security", "createUserProfile", [
            id_user,
            profileId
          ]);
          if (!(userProfileResult && userProfileResult.rowCount > 0)) {
            allInserted = false;
            console.error(`No se pudo asignar el perfil ${profileId} al usuario ${email}`);
          }
        }
        if (!allInserted) {
          return { sts: false, msg: "Usuario actualizado, pero no se pudo actualizar uno o más perfiles" };
        }
    
        return { sts: true, msg: "Usuario actualizado correctamente" };
      } catch (error) {
        console.error("Error en updateUser:", error);
        return { sts: false, msg: "Error al actualizar el usuario" };
      }
    }    
  
    async deleteUsers(params) {
      try {
        if (!params.ids || !Array.isArray(params.ids) || params.ids.length === 0) {
          return { sts: false, msg: "Faltan datos obligatorios" };
        }
    
        // Obtener todos los id_person asociados a los id_user proporcionados
        const userInfoResult = await database.executeQuery("security", "getUserById", [params.ids]);
    
        if (!userInfoResult || !userInfoResult.rows || userInfoResult.rows.length === 0) {
          return { sts: false, msg: "No se encontraron los usuarios" };
        }
    
        const idPersons = userInfoResult.rows.map(user => parseInt(user.fk_id_person));
    
        // Eliminar relaciones y usuarios en un solo paso
        await database.executeQuery("security", "deleteUserProfileByUserId", [params.ids]);
        await database.executeQuery("security", "deleteUser", [params.ids]);
        await database.executeQuery("public", "deletePerson", [idPersons]);
    
        return { sts: true, msg: "Usuarios eliminados correctamente" };
      } catch (error) {
        console.error("Error en deleteUsers:", error);
        return { sts: false, msg: "Error al eliminar los usuarios" };
      }
    }    
  };
  
  module.exports = UserBO;
  
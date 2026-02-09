// userbo: crud de usuarios y perfiles
const UserBO = class {
    constructor() {}
  
    // lista usuarios con datos asociados
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
  

    // crea usuario y asigna perfiles
    async createUser(params) {
      try {
        // valida datos obligatorios
        const { name, lastName, birthDate, email, password, numberId, id_profile } = params;
        
        if (!name || !lastName || !birthDate || !email || !password || !numberId || !id_profile) {
          return { sts: false, msg: "Faltan datos obligatorios" };
        }
        
        // crea persona base
        const personResult = await database.executeQuery("public", "createPerson", [
          name,
          lastName,
          birthDate
        ]);
        if (!personResult || !personResult.rows || personResult.rows.length === 0) {
          console.error("No se pudo crear la persona");
          return { sts: false, msg: "No se pudo crear la persona" };
        }
        
        // usa el id_person para enlazar usuario
        const id_person = personResult.rows[0].id_person;
        console.log(`Persona creada con id_person: ${id_person}`);
        
        // crea usuario en security.user
        const userResult = await database.executeQuery("security", "createUser", [
          email,
          password,
          numberId,
          id_person
        ]);
        if (!(userResult && userResult.rowCount > 0)) {
          return { sts: false, msg: "No se pudo crear el usuario" };
        }
  
        // obtiene el id del usuario creado
        const id_user = userResult.rows[0].id_user;

        // asigna perfiles al usuario
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
  
    // actualiza usuario y sus perfiles
    async updateUser(params) {
      try {
        // parametros esperados: id_user, id_person, name, lastname, birthdate, email, numberid, profile[]
        const { id_user, id_person, name, lastName, birthDate, email, numberId, profile } = params;
        if (!id_user || !id_person || !name || !lastName || !birthDate || !email || !numberId || !profile) {
          console.log("Params: ", params);
          return { sts: false, msg: "Faltan datos obligatorios" };
        }
        
        // actualiza persona
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
    
        // actualiza usuario
        const userResult = await database.executeQuery("security", "updateUser", [
          email,
          numberId,
          id_user
        ]);
        if (!userResult || userResult.rowCount === 0) {
          console.error("No se pudo actualizar el usuario");
          return { sts: false, msg: "No se pudo actualizar el usuario" };
        }
    
        // limpia perfiles anteriores
        await database.executeQuery("security", "deleteUserProfileByUserId", [[id_user]]);
    
        // asigna perfiles nuevos
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
  
    // elimina usuarios y personas asociadas
    async deleteUsers(params) {
      try {
        if (!params.ids || !Array.isArray(params.ids) || params.ids.length === 0) {
          return { sts: false, msg: "Faltan datos obligatorios" };
        }
    
        // obtiene id_person para limpiar datos
        const userInfoResult = await database.executeQuery("security", "getUserById", [params.ids]);
    
        if (!userInfoResult || !userInfoResult.rows || userInfoResult.rows.length === 0) {
          return { sts: false, msg: "No se encontraron los usuarios" };
        }
    
        const idPersons = userInfoResult.rows.map(user => parseInt(user.fk_id_person));
    
        // elimina relaciones y usuarios
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
  

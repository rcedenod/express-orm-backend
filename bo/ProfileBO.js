const ProfileBO = class {
    constructor() {}
  
    async getProfiles(params) {
      try {
        const result = await database.executeQuery("security", "getProfiles", []);
    
        if (!result || !result.rows) {
          console.error("La consulta no devolvió resultados");
          return { sts: false, msg: "Error al obtener perfiles" };
        }
    
        return { sts: true, data: result.rows };
      } catch (error) {
        console.error("Error en getProfiles:", error);
        return { sts: false, msg: "Error al ejecutar la consulta" };
      }
    }

    async createProfile(params) {
      try {
        const result = await database.executeQuery("security", "createProfile", [params.profileName]);
        if (result && result.rowCount > 0) {
          return { sts: true, msg: "Perfil creado correctamente" };
        } else {
          return { sts: false, msg: "No se pudo crear el perfil" };
        }
      } catch (error) {
        console.error("Error en createProfile:", error);
        return { sts: false, msg: "Error al crear el perfil" };
      }
    }

    async updateProfile(params) {
      try {
        const result = await database.executeQuery("security", "updateProfile", [params.profileName, params.id_profile]);
        if (result && result.rowCount > 0) {
          return { sts: true, msg: "Perfil actualizado correctamente" };
        } else {
          return { sts: false, msg: "No se pudo actualizar el perfil" };
        }
      } catch (error) {
        console.error("Error en updateProfile:", error);
        return { sts: false, msg: "Error al actualizar el perfil" };
      }
    }

    async deleteProfiles(params) {
      try {
        // params.ids debe ser un array de IDs (números)
        const result = await database.executeQuery("security", "deleteProfiles", [params.ids]);
        if (result && result.rowCount > 0) {
          return { sts: true, msg: "Perfiles eliminados correctamente" };
        } else {
          return { sts: false, msg: "No se pudo eliminar los perfiles" };
        }
      } catch (error) {
        console.error("Error en deleteProfiles:", error);
        return { sts: false, msg: "Error al eliminar los perfiles" };
      }
    }
  };
  
  module.exports = ProfileBO;
  
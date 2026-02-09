// profilebo: crud de perfiles
const ProfileBO = class {
  constructor() {}

  // lista perfiles disponibles
  async getProfiles(params) {
    try {
      const result = await database.executeQuery('security', 'getProfiles', []);

      if (!result || !result.rows) {
        console.error('La consulta no devolvio resultados');
        return { sts: false, msg: 'Error al obtener perfiles' };
      }

      return { sts: true, data: result.rows };
    } catch (error) {
      console.error('Error en getProfiles:', error);
      return { sts: false, msg: 'Error al ejecutar la consulta' };
    }
  }

  // crea un perfil nuevo
  async createProfile(params) {
    try {
      const result = await database.executeQuery('security', 'createProfile', [params.profileName]);
      if (result && result.rowCount > 0) {
        return { sts: true, msg: 'Perfil creado correctamente' };
      }
      return { sts: false, msg: 'No se pudo crear el perfil' };
    } catch (error) {
      console.error('Error en createProfile:', error);
      return { sts: false, msg: 'Error al crear el perfil' };
    }
  }

  // actualiza un perfil existente
  async updateProfile(params) {
    try {
      const result = await database.executeQuery('security', 'updateProfile', [params.profileName, params.id_profile]);
      if (result && result.rowCount > 0) {
        return { sts: true, msg: 'Perfil actualizado correctamente' };
      }
      return { sts: false, msg: 'No se pudo actualizar el perfil' };
    } catch (error) {
      console.error('Error en updateProfile:', error);
      return { sts: false, msg: 'Error al actualizar el perfil' };
    }
  }

  // elimina perfiles y limpia relaciones
  async deleteProfiles(params) {
    try {
      if (!params.ids || !Array.isArray(params.ids) || params.ids.length === 0) {
        return { sts: false, msg: 'Faltan datos obligatorios' };
      }

      // limpiar relaciones para evitar errores de llave foranea al borrar perfiles.
      await database.executeQuery('security', 'deletePermissionMethodsByProfiles', [params.ids]);
      await database.executeQuery('security', 'deletePermissionMenusByProfiles', [params.ids]);
      await database.executeQuery('security', 'deleteUserProfilesByProfiles', [params.ids]);

      const result = await database.executeQuery('security', 'deleteProfiles', [params.ids]);
      await global.sc.loadPermission();

      if (result && result.rowCount > 0) {
        return { sts: true, msg: 'Perfiles eliminados correctamente' };
      }
      return { sts: false, msg: 'No se pudo eliminar los perfiles' };
    } catch (error) {
      console.error('Error en deleteProfiles:', error);
      return { sts: false, msg: 'Error al eliminar los perfiles' };
    }
  }
};

module.exports = ProfileBO;

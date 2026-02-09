// methodbo: crud de metodos y permisos
const PROTECTED_DEFAULT_OBJECTS = new Set(['userbo', 'personbo', 'profilebo', 'methodbo', 'objectbo']);

const MethodBO = class {
  constructor() {}

  // valida si un objeto es protegido
  isProtectedObjectName(objectName) {
    if (!objectName) return false;
    if (global.sc && typeof global.sc.isProtectedBusinessObject === 'function') {
      return global.sc.isProtectedBusinessObject(objectName);
    }
    return PROTECTED_DEFAULT_OBJECTS.has(String(objectName).toLowerCase());
  }

  // busca un metodo por id para validaciones
  async getMethodById(idMethod) {
    const methodsResult = await database.executeQuery('security', 'getMethods', []);
    if (!methodsResult || !methodsResult.rows) return null;
    return methodsResult.rows.find((row) => Number(row.id_method) === Number(idMethod)) || null;
  }

  // lista metodos disponibles
  async getMethods(params) {
    try {
      const result = await database.executeQuery('security', 'getMethods', []);
      if (!result || !result.rows) {
        console.error('La consulta no devolvio resultados');
        return { sts: false, msg: 'Error al obtener los metodos' };
      }

      return { sts: true, data: result.rows };
    } catch (error) {
      console.error('Error en getMethods:', error);
      return { sts: false, msg: 'Error al ejecutar la consulta' };
    }
  }

  // crea un metodo en security.method
  async createMethod(params) {
    try {
      const { name, id_object } = params;
      if (!name || !id_object) {
        return { sts: false, msg: 'Faltan datos obligatorios' };
      }

      const methodResult = await database.executeQuery('security', 'createMethod', [name, id_object]);
      if (!methodResult) {
        console.error('No se pudo crear el metodo');
        return { sts: false, msg: 'No se pudo crear el metodo' };
      }

      return { sts: true, msg: 'Metodo creado exitosamente' };
    } catch (error) {
      console.error('Error en createMethod:', error);
      return { sts: false, msg: 'Error al crear el metodo' };
    }
  }

  // actualiza un metodo en security.method
  async updateMethod(params) {
    try {
      const { id_method, method, fk_id_object } = params;
      if (!id_method || !method || !fk_id_object) {
        return { sts: false, msg: 'Faltan datos obligatorios' };
      }

      const methodResult = await database.executeQuery('security', 'updateMethod', [
        method,
        fk_id_object,
        id_method
      ]);

      if (!methodResult) {
        console.error('No se pudo actualizar el metodo');
        return { sts: false, msg: 'No se pudo actualizar el metodo' };
      }

      return { sts: true, msg: 'Metodo actualizado exitosamente' };
    } catch (error) {
      console.error('Error en updateMethod:', error);
      return { sts: false, msg: 'Error al actualizar el metodo' };
    }
  }

  // elimina metodos y limpia permisos
  async deleteMethods(params) {
    try {
      const { ids } = params;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return { sts: false, msg: 'Faltan datos obligatorios o formato incorrecto' };
      }

      await database.executeQuery('security', 'deletePermissionMethodsByMethodIds', [ids]);
      const methodResult = await database.executeQuery('security', 'deleteMethods', [ids]);

      if (!methodResult) {
        console.error('No se pudieron eliminar los metodos');
        return { sts: false, msg: 'No se pudieron eliminar los metodos' };
      }

      await global.sc.loadPermission();
      return { sts: true, msg: 'Metodos eliminados exitosamente' };
    } catch (error) {
      console.error('Error en deleteMethods:', error);
      return { sts: false, msg: 'Error al eliminar los metodos' };
    }
  }

  // lista permisos de metodos por perfil
  async getPermissionMethods(params) {
    try {
      const result = await database.executeQuery('security', 'getPermissionMethods', []);
      if (!result || !result.rows) {
        console.error('La consulta no devolvio resultados');
        return { sts: false, msg: 'Error al obtener los metodos' };
      }

      return { sts: true, data: result.rows };
    } catch (error) {
      console.error('Error en getPermissionMethods:', error);
      return { sts: false, msg: 'Error al ejecutar la consulta' };
    }
  }

  // crea permiso de metodo para un perfil
  async createPermissionMethod(params) {
    try {
      const { fk_id_profile, fk_id_method, method, object } = params;
      if (!fk_id_profile || !fk_id_method || !method || !object) {
        return { sts: false, msg: 'Faltan datos obligatorios' };
      }

      const methodRow = await this.getMethodById(fk_id_method);
      if (!methodRow) {
        return { sts: false, msg: 'Metodo no valido' };
      }

      if (Number(fk_id_profile) !== 1 && this.isProtectedObjectName(methodRow.object)) {
        return { sts: false, msg: 'No se puede asignar este objeto de negocio a perfiles no-admin' };
      }

      const methodResult = await database.executeQuery('security', 'createPermissionMethod', [
        fk_id_profile,
        fk_id_method
      ]);
      if (!methodResult) {
        console.error('No se pudo crear el permiso');
        return { sts: false, msg: 'No se pudo crear el permiso' };
      }

      sc.addMethodPermission({
        id_profile: fk_id_profile,
        object: methodRow.object,
        method: methodRow.method
      });

      return { sts: true, msg: 'Permiso creado exitosamente' };
    } catch (error) {
      console.error('Error en createPermissionMethod:', error);
      return { sts: false, msg: 'Error al crear el permiso' };
    }
  }

  // actualiza permiso de metodo
  async updatePermissionMethod(params) {
    try {
      const { id_permission_method, fk_id_profile, fk_id_method, old_fk_id_profile, method, object } = params;
      if (!id_permission_method || !fk_id_profile || !fk_id_method || !old_fk_id_profile || !method || !object) {
        return { sts: false, msg: 'Faltan datos obligatorios' };
      }

      const methodRow = await this.getMethodById(fk_id_method);
      if (!methodRow) {
        return { sts: false, msg: 'Metodo no valido' };
      }

      if (Number(fk_id_profile) !== 1 && this.isProtectedObjectName(methodRow.object)) {
        return { sts: false, msg: 'No se puede asignar este objeto de negocio a perfiles no-admin' };
      }

      const methodResult = await database.executeQuery('security', 'updatePermissionMethod', [
        fk_id_profile,
        fk_id_method,
        id_permission_method
      ]);
      if (!methodResult) {
        console.error('No se pudo actualizar el permiso');
        return { sts: false, msg: 'No se pudo actualizar el permiso' };
      }

      sc.updateMethodPermission(
        { id_profile: old_fk_id_profile, object, method },
        { fk_id_profile, object: methodRow.object, method: methodRow.method }
      );

      return { sts: true, msg: 'Permiso actualizado exitosamente' };
    } catch (error) {
      console.error('Error en updatePermissionMethod:', error);
      return { sts: false, msg: 'Error al actualizar el permiso' };
    }
  }

  // elimina permisos seleccionados
  async deletePermissionMethods(params) {
    try {
      const { permissions } = params;
      if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
        return { sts: false, msg: 'Faltan datos obligatorios o formato incorrecto' };
      }

      const permissionIds = permissions.map((p) => p.id_permission_method);

      const allPermissionsResult = await database.executeQuery('security', 'getPermissionMethods', []);
      let permissionsToRemove = [];
      if (allPermissionsResult && allPermissionsResult.rows) {
        permissionsToRemove = allPermissionsResult.rows.filter((row) =>
          permissions.some(
            (p) => p.id_permission_method === row.id_permission_method && p.object === row.object
          )
        );
      }

      const deleteResult = await database.executeQuery('security', 'deletePermissionMethods', [permissionIds]);
      if (!deleteResult) {
        console.error('No se pudieron eliminar los permisos');
        return { sts: false, msg: 'No se pudieron eliminar los permisos' };
      }

      permissionsToRemove.forEach((permission) => {
        sc.removeMethodPermission({
          id_profile: permission.fk_id_profile,
          object: permission.object,
          method: permission.method
        });
      });

      return { sts: true, msg: 'Permisos eliminados exitosamente' };
    } catch (error) {
      console.error('Error en deletePermissionMethods:', error);
      return { sts: false, msg: 'Error al eliminar los permisos' };
    }
  }

  // sincroniza permisos para un perfil
  async syncPermissions(params) {
    const { id_profile, method_ids } = params;
    const profileId = Number(id_profile);
    const requestedMethodIds = Array.isArray(method_ids) ? method_ids.map((id) => Number(id)) : [];

    if (profileId !== 1) {
      for (const methodId of requestedMethodIds) {
        const methodRow = await this.getMethodById(methodId);
        if (methodRow && this.isProtectedObjectName(methodRow.object)) {
          return { sts: false, msg: 'No se pueden asignar objetos de negocio predeterminados a perfiles no-admin' };
        }
      }
    }

    await database.executeQuery('security', 'deletePermissionsByProfile', [id_profile]);

    for (const id_method of requestedMethodIds) {
      await database.executeQuery('security', 'createPermissionMethod', [id_profile, id_method]);
    }

    await global.sc.loadPermission();
    return { sts: true, msg: 'Permisos sincronizados correctamente' };
  }
};

module.exports = MethodBO;

const MethodBO = class {
    constructor() {}
  
    async getMethods(params) {
      try {
        const result = await database.executeQuery("security", "getMethods", []);
        if (!result || !result.rows) {
          console.error("La consulta no devolvió resultados");
          return { sts: false, msg: "Error al obtener los metodos" };
        }

        return { sts: true, data: result.rows };
      } catch (error) {
        console.error("Error en getMethods:", error);
        return { sts: false, msg: "Error al ejecutar la consulta" };
      }
    }

    async getObjects(params) {
        try {
            const result = await database.executeQuery("security", "getObjects", []);
            if (!result || !result.rows) {
            console.error("La consulta no devolvió resultados");
            return { sts: false, msg: "Error al obtener los metodos" };
            }

            return { sts: true, data: result.rows };
        } catch (error) {
            console.error("Error en getObjects:", error);
            return { sts: false, msg: "Error al ejecutar la consulta" };
        }
    }

    async createMethod(params) {
        try {
          // Validar que existan todos los datos obligatorios
          const { name, id_object } = params;   
          
          if (!name || !id_object) {
            return { sts: false, msg: "Faltan datos obligatorios" };
          }
          
          // Insertar el menu en la tabla security.menu
          const methodResult = await database.executeQuery("security", "createMethod", [
            name,
            id_object
          ]);
          if (!methodResult) {
            console.error("No se pudo crear el metodo");
            return { sts: false, msg: "No se pudo crear el metodo" };
          }
  
          return { sts: true, msg: "Metodo creado exitosamente" };
        } catch (error) {
          console.error("Error en createMethod:", error);
          return { sts: false, msg: "Error al crear el metodo" };
        }
    }

    async updateMethod(params) {
        try {
          // Validar que existan todos los datos obligatorios
          const { id_method, method, fk_id_object } = params;   
          
          if (!id_method || !method || !fk_id_object) {
            return { sts: false, msg: "Faltan datos obligatorios" };
          }
          
          const methodResult = await database.executeQuery("security", "updateMethod", [
            method,
            fk_id_object,
            id_method
          ]);
          if (!methodResult) {
            console.error("No se pudo actualizar el metodo");
            return { sts: false, msg: "No se pudo actualizar el metodo" };
          }
  
          return { sts: true, msg: "Metodo actualizado exitosamente" };
        } catch (error) {
          console.error("Error en updateMethod:", error);
          return { sts: false, msg: "Error al actualizar el metodo" };
        }
    }

    async deleteMethods(params) {
        try {
          const { ids } = params; // Recibe un array de IDs
      
          if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return { sts: false, msg: "Faltan datos obligatorios o formato incorrecto" };
          }
      
          const methodResult = await database.executeQuery("security", "deleteMethods", [params.ids]);
      
          if (!methodResult) {
            console.error("No se pudieron eliminar los metodos");
            return { sts: false, msg: "No se pudieron eliminar los metodos" };
          }
      
          return { sts: true, msg: "Metodos eliminados exitosamente" };
        } catch (error) {
          console.error("Error en deleteMethods:", error);
          return { sts: false, msg: "Error al eliminar los metodos" };
        }
    }

    //Permisos a metodos
    async getPermissionMethods(params) {
      try {
        const result = await database.executeQuery("security", "getpermissionmethods", []);
        if (!result || !result.rows) {
          console.error("La consulta no devolvió resultados");
          return { sts: false, msg: "Error al obtener los metodos" };
        }

        return { sts: true, data: result.rows };
      } catch (error) {
        console.error("Error en getMethods:", error);
        return { sts: false, msg: "Error al ejecutar la consulta" };
      }
    }

    async createPermissionMethod(params) {
      try {
        // Validar que existan todos los datos obligatorios
        const { fk_id_profile, fk_id_method, method, object } = params;  
         
        
        if (!fk_id_profile || !fk_id_method || !method || !object) {
          return { sts: false, msg: "Faltan datos obligatorios" };
        }
        
        // Insertar el menu en la tabla security.menu
        const methodResult = await database.executeQuery("security", "createPermissionMethod", [
          fk_id_profile,
          fk_id_method
        ]);
        if (!methodResult) {
          console.error("No se pudo crear el metodo");
          return { sts: false, msg: "No se pudo crear el metodo" };
        }

        sc.addMethodPermission({
          id_profile: fk_id_profile,
          object: object,
          method: method
        });

        return { sts: true, msg: "Metodo creado exitosamente" };
      } catch (error) {
        console.error("Error en createMethod:", error);
        return { sts: false, msg: "Error al crear el metodo" };
      }
  }

    async updatePermissionMethod(params) {
      try {
        // Validar que existan todos los datos obligatorios
        const { id_permission_method, fk_id_profile, fk_id_method, old_fk_id_profile, method, object } = params;
        
        
        if (!id_permission_method || !fk_id_profile || !fk_id_method || !old_fk_id_profile || !method || !object) {  
          return { sts: false, msg: "Faltan datos obligatorios" };
        }
        
        const methodResult = await database.executeQuery("security", "updatePermissionMethod", [
          fk_id_profile,
          fk_id_method,
          id_permission_method
        ]);
        if (!methodResult) {
          console.error("No se pudo actualizar el metodo");
          return { sts: false, msg: "No se pudo actualizar el metodo" };
        }

        sc.updateMethodPermission(
          { id_profile: old_fk_id_profile, object: object, method: method },
          { fk_id_profile, object: object, method }
        );

        return { sts: true, msg: "Metodo actualizado exitosamente" };
      } catch (error) {
        console.error("Error en updateMethod:", error);
        return { sts: false, msg: "Error al actualizar el metodo" };
      }
  }

  async deletePermissionMethods(params) {
    try {
      // Se espera un arreglo de objetos: { id_permission_method, object }
      const { permissions } = params;
  
      if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
        return { sts: false, msg: "Faltan datos obligatorios o formato incorrecto" };
      }
  
      // Extraer únicamente los id_permission_method para el query
      const permissionIds = permissions.map(p => p.id_permission_method);
  
      // 1. Obtener los permisos a eliminar (para poder removerlos del mapa de seguridad)
      const allPermissionsResult = await database.executeQuery("security", "getpermissionmethods", []);
      let permissionsToRemove = [];
      if (allPermissionsResult && allPermissionsResult.rows) {
        permissionsToRemove = allPermissionsResult.rows.filter(row =>
          permissions.some(p => 
            p.id_permission_method === row.id_permission_method && 
            p.object === row.object
          )
        );
      }
  
      // 2. Ejecutar la eliminación en la base de datos pasando solo los IDs
      const deleteResult = await database.executeQuery("security", "deletePermissionMethods", [permissionIds]);
    
      if (!deleteResult) {
        console.error("No se pudieron eliminar los métodos");
        return { sts: false, msg: "No se pudieron eliminar los métodos" };
      }
      
      // 3. Remover cada permiso del mapa de seguridad usando removeMethodPermission
      permissionsToRemove.forEach(permission => {
        sc.removeMethodPermission({
          id_profile: permission.fk_id_profile,
          object: permission.object,
          method: permission.method
        });
      });
    
      return { sts: true, msg: "Métodos eliminados exitosamente" };
    } catch (error) {
      console.error("Error en deletePermissionMethods:", error);
      return { sts: false, msg: "Error al eliminar los métodos" };
    }
  }  
};
  
module.exports = MethodBO;
  
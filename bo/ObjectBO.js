// objectbo: crud de objetos
const ObjectBO = class {
  constructor() {}

  // lista objetos registrados
  async getObjects(params) {
    try {
      const result = await database.executeQuery('security', 'getObjects', []);
      if (!result || !result.rows) {
        console.error('La consulta no devolvio resultados');
        return { sts: false, msg: 'Error al obtener los objetos' };
      }

      return { sts: true, data: result.rows };
    } catch (error) {
      console.error('Error en getObjects:', error);
      return { sts: false, msg: 'Error al ejecutar la consulta' };
    }
  }

  // crea un objeto en security.object
  async createObject(params) {
    try {
      const { object } = params;
      if (!object) {
        return { sts: false, msg: 'Faltan datos obligatorios' };
      }

      const result = await database.executeQuery('security', 'createObject', [object]);
      if (!result || result.rowCount === 0) {
        return { sts: false, msg: 'No se pudo crear el objeto' };
      }

      return { sts: true, msg: 'Objeto creado exitosamente' };
    } catch (error) {
      console.error('Error en createObject:', error);
      return { sts: false, msg: 'Error al crear el objeto' };
    }
  }

  // actualiza un objeto en security.object
  async updateObject(params) {
    try {
      const { id_object, object } = params;
      if (!id_object || !object) {
        return { sts: false, msg: 'Faltan datos obligatorios' };
      }

      const result = await database.executeQuery('security', 'updateObject', [object, id_object]);
      if (!result || result.rowCount === 0) {
        return { sts: false, msg: 'No se pudo actualizar el objeto' };
      }

      return { sts: true, msg: 'Objeto actualizado exitosamente' };
    } catch (error) {
      console.error('Error en updateObject:', error);
      return { sts: false, msg: 'Error al actualizar el objeto' };
    }
  }

  // elimina objetos y limpia metodos/permisos
  async deleteObjects(params) {
    try {
      const { ids } = params;
      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return { sts: false, msg: 'Faltan datos obligatorios o formato incorrecto' };
      }

      // limpiar permisos y metodos dependientes antes de borrar objetos.
      await database.executeQuery('security', 'deletePermissionMethodsByObjectIds', [ids]);
      await database.executeQuery('security', 'deleteMethodsByObjectIds', [ids]);

      const result = await database.executeQuery('security', 'deleteObjects', [ids]);
      if (!result) {
        return { sts: false, msg: 'No se pudieron eliminar los objetos' };
      }

      await global.sc.loadPermission();
      return { sts: true, msg: 'Objetos eliminados exitosamente' };
    } catch (error) {
      console.error('Error en deleteObjects:', error);
      return { sts: false, msg: 'Error al eliminar los objetos' };
    }
  }
};

module.exports = ObjectBO;

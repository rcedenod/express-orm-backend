// security: permisos y ejecucion dinamica de metodos
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');

const Security = class {
  constructor() {
    this.methodPermission = new Map();
    this.optionPermission = new Map();
    this.auditEnabled = process.env.ENABLE_AUDIT === 'true';

    const bosConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'configs', 'bosconfig.json'), 'utf8'));
    this.allowedObjects = new Set(bosConfig.allowedObjects);
    this.protectedObjects = new Set(bosConfig.protectedObjects);

    this.loadPermission().catch((error) => console.error('Error cargando permisos:', error));
  }

  // recarga permisos de metodos y menu desde la base
  async loadPermission() {
    try {
      this.methodPermission.clear();
      this.optionPermission.clear();

      const r = await database.executeQuery('security', 'loadPermission', []);
      if (r && r.rows) {
        for (const row of r.rows) {
          const key = `${row.id_profile}_${row.object}_${row.method}`;
          this.methodPermission.set(key, true);
        }
      }

      const res = await database.executeQuery('security', 'loadMenu', []);
      if (res && res.rows) {
        for (const row of res.rows) {
          const key = `${row.id_profile}_${row.menu}_${row.fk_id_module}`;
          this.optionPermission.set(key, true);
        }
      }
    } catch (error) {
      console.error('Error en loadPermission:', error);
    }
  }

  // valida si un perfil puede ejecutar un metodo
  hasPermissionMethod({ profile, objectName, methodName }) {
    if (parseInt(profile, 10) === 1) {
      return true;
    }
    if (this.isProtectedBusinessObject(objectName)) {
      return false;
    }
    const key = `${profile}_${objectName}_${methodName}`;
    return this.methodPermission.get(key) || false;
  }

  // evita exponer objetos de negocio protegidos a no admin
  isProtectedBusinessObject(objectName) {
    if (!objectName) return false;
    return this.protectedObjects.has(String(objectName).toLowerCase());
  }

  // arma menu segun permisos del perfil actual
  getPermissionOption(req) {
    const options = [];
    const profileId = parseInt(req.session.profile, 10);

    for (const [key, value] of this.optionPermission) {
      const [permProfile, option] = key.split('_');
      if (profileId === parseInt(permProfile, 10) && value) {
        options.push({ option });
      }
    }

    return options;
  }

  // aplica permiso en cache
  addMethodPermission(row) {
    const key = `${row.id_profile}_${row.object}_${row.method}`;
    this.methodPermission.set(key, true);
  }

  // actualiza permiso en cache
  updateMethodPermission(oldRow, newRow) {
    const oldKey = `${oldRow.id_profile}_${oldRow.object}_${oldRow.method}`;
    if (this.methodPermission.has(oldKey)) {
      this.methodPermission.delete(oldKey);
    }
    const newKey = `${newRow.fk_id_profile}_${newRow.object || oldRow.object}_${newRow.method}`;
    this.methodPermission.set(newKey, true);
  }

  // elimina permiso en cache
  removeMethodPermission(row) {
    const key = `${row.id_profile}_${row.object}_${row.method}`;
    this.methodPermission.delete(key);
  }

  // ejecuta un metodo del bo via reflexion
  async exeMethod(req) {
    try {
      if (!this.allowedObjects.has(req.body.objectName)) {
        return { sts: false, msg: 'Objeto no válido' };
      }
      const boPath = path.join(__dirname, 'BO', `${req.body.objectName}.js`);
      const BOClass = require(boPath);
      const obj = new BOClass();
      obj.userId = req.session.userId;
      obj.profile = req.session.profile;

      if (typeof obj[req.body.methodName] !== 'function') {
        console.error(`Metodo no encontrado: ${req.body.methodName} en ${req.body.objectName}`);
        throw new Error('Metodo no encontrado');
      }

      if (this.auditEnabled && !req.body.methodName.toLowerCase().includes('get')) {
        try {
          await database.executeQuery('security', 'insertAudit', [
            obj.userId,
            req.body.methodName,
            obj.profile,
            dayjs().format('YYYY-MM-DD HH:mm:ss')
          ]);
        } catch (auditError) {
          console.warn('No se pudo registrar auditoria:', auditError.message || auditError);
        }
      }

      return obj[req.body.methodName](req.body.params);
    } catch (error) {
      console.error('Error en exeMethod:', error);
      throw error;
    }
  }
};

module.exports = Security;

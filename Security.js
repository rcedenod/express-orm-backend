const path = require('path');
const dayjs = require('dayjs');
const PROTECTED_DEFAULT_OBJECTS = new Set(['userbo', 'personbo', 'profilebo', 'methodbo', 'objectbo']);

const Security = class {
  constructor() {
    this.methodPermission = new Map();
    this.optionPermission = new Map();
    // Auditoria opt-in: habilitar con ENABLE_AUDIT=true
    this.auditEnabled = process.env.ENABLE_AUDIT === 'true';

    this.loadPermission().catch((error) => console.error('Error cargando permisos:', error));
  }

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

  isProtectedBusinessObject(objectName) {
    if (!objectName) return false;
    return PROTECTED_DEFAULT_OBJECTS.has(String(objectName).toLowerCase());
  }

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

  addMethodPermission(row) {
    const key = `${row.id_profile}_${row.object}_${row.method}`;
    this.methodPermission.set(key, true);
  }

  updateMethodPermission(oldRow, newRow) {
    const oldKey = `${oldRow.id_profile}_${oldRow.object}_${oldRow.method}`;
    if (this.methodPermission.has(oldKey)) {
      this.methodPermission.delete(oldKey);
    }
    const newKey = `${newRow.fk_id_profile}_${newRow.object || oldRow.object}_${newRow.method}`;
    this.methodPermission.set(newKey, true);
  }

  removeMethodPermission(row) {
    const key = `${row.id_profile}_${row.object}_${row.method}`;
    this.methodPermission.delete(key);
  }

  addMenuPermission(row) {
    const key = `${row.id_profile}_${row.menu}_${row.fk_id_module}`;
    this.optionPermission.set(key, true);
  }

  updateMenuPermission(oldRow, newRow) {
    const oldKey = `${oldRow.id_profile}_${oldRow.menu}_${oldRow.fk_id_module}`;
    if (this.optionPermission.has(oldKey)) {
      this.optionPermission.delete(oldKey);
    }
    const newKey = `${newRow.fk_id_profile || oldRow.id_profile}_${newRow.menu || oldRow.menu}_${newRow.fk_id_module || oldRow.fk_id_module}`;
    this.optionPermission.set(newKey, true);
  }

  removeMenuPermission(row) {
    const key = `${row.id_profile}_${row.menu}_${row.fk_id_module}`;
    this.optionPermission.delete(key);
  }

  async exeMethod(req) {
    try {
      const boPath = path.join(__dirname, 'BO', `${req.body.objectName}.js`);
      const BOClass = require(boPath);
      const obj = new BOClass();
      obj.userId = req.session.userId;
      obj.profile = req.session.profile;

      if (typeof obj[req.body.methodName] !== 'function') {
        throw new Error(`El metodo ${req.body.methodName} no existe en ${req.body.objectName}`);
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

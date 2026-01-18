const path = require('path');
const dayjs = require('dayjs');

const Security = class {
    constructor() {
        // Mapas para almacenar permisos por método y por opción
        this.methodPermission = new Map();
        this.optionPermission = new Map();

        // Carga inicial de permisos (se puede agregar un mecanismo de refresco periódico si se requiere)
        this.loadPermission().catch(error => console.error("Error cargando permisos:", error));
    }

    /**
     * Carga los permisos desde la base de datos.
     * Se ejecutan dos consultas: una para permisos a métodos y otra para permisos a opciones.
     */
    async loadPermission() {
        try {
            // Cargar permisos para métodos
            let r = await database.executeQuery('security', 'loadPermission', []);
            if (r && r.rows) {
                for (let row of r.rows) {
                    const key = `${row.id_profile}_${row.object}_${row.method}`;
                    this.methodPermission.set(key, true);
                }
            }

            // Cargar permisos para opciones de menú
            let res = await database.executeQuery('security', 'loadMenu', []);
            if (res && res.rows) {
                for (let row of res.rows) {
                    const key = `${row.id_profile}_${row.menu}_${row.fk_id_module}`;
                    this.optionPermission.set(key, true);
                }
            }
        } catch (error) {
            console.error("Error en loadPermission:", error);
        }
    }

    /**
     * Verifica si un usuario (según su perfil) tiene permiso para ejecutar un método.
     * @param {Object} obj - Objeto que debe incluir: profile, objectName y methodName.
     * @returns {boolean} - true si tiene permiso, false en caso contrario.
     */
    hasPermissionMethod({ profile, objectName, methodName }) {
        const key = `${profile}_${objectName}_${methodName}`;
        return this.methodPermission.get(key) || false;
    }

    /**
     * Obtiene las opciones de menú permitidas para el perfil del usuario almacenado en la sesión.
     * @param {Object} req - Objeto de la solicitud, que debe contener req.session.profile.
     * @returns {Array} - Arreglo de opciones (cada una es un objeto con la propiedad 'option').
     */
    getPermissionOption(req) {
        const options = [];
        const profileId = parseInt(req.session.profile, 10);
        
        for (const [key, value] of this.optionPermission) {
            const [permProfile, option] = key.split("_");
            if (profileId === parseInt(permProfile, 10) && value) {
                options.push({ option });
            }
        }
        return options;
    }

    // Método para agregar un permiso a métodos
    addMethodPermission(row) {
        const key = `${row.id_profile}_${row.object}_${row.method}`;
        this.methodPermission.set(key, true);
    }

    // Método para actualizar un permiso de método
    updateMethodPermission(oldRow, newRow) {
        const oldKey = `${oldRow.id_profile}_${oldRow.object}_${oldRow.method}`;
        
        // Eliminar la clave antigua si existe
        if (this.methodPermission.has(oldKey)) {
        this.methodPermission.delete(oldKey);
        }
        // Agregar el nuevo permiso
        const newKey = `${newRow.fk_id_profile}_${newRow.object || oldRow.object}_${newRow.method}`;
        this.methodPermission.set(newKey, true);
    }

    // Método para eliminar un permiso de método
    removeMethodPermission(row) {
        const key = `${row.id_profile}_${row.object}_${row.method}`;
        this.methodPermission.delete(key);
    }

    // Método para agregar un permiso de menú
    addMenuPermission(row) {
        // Se construye la clave utilizando id_profile, menu y fk_id_module
        const key = `${row.id_profile}_${row.menu}_${row.fk_id_module}`;
        this.optionPermission.set(key, true);
    }

    // Método para actualizar un permiso de menú
    updateMenuPermission(oldRow, newRow) {
        // Se construye la clave antigua
        const oldKey = `${oldRow.id_profile}_${oldRow.menu}_${oldRow.fk_id_module}`;
        // Se elimina la clave antigua si existe
        if (this.optionPermission.has(oldKey)) {
            this.optionPermission.delete(oldKey);
        }
        // Se construye la nueva clave; se usan valores nuevos o se mantienen los antiguos en caso de que no se modifiquen
        const newKey = `${newRow.fk_id_profile || oldRow.id_profile}_${newRow.menu || oldRow.menu}_${newRow.fk_id_module || oldRow.fk_id_module}`;
        this.optionPermission.set(newKey, true);
    }

    // Método para eliminar un permiso de menú
    removeMenuPermission(row) {
        // Se construye la clave utilizando id_profile, menu y fk_id_module
        const key = `${row.id_profile}_${row.menu}_${row.fk_id_module}`;
        this.optionPermission.delete(key);
    }

    /**
     * Ejecuta un método de negocio (BO) de forma dinámica.
     * Se importa el módulo solicitado
     * @param {Object} req - Objeto de la solicitud, que debe incluir req.body.objectName, req.body.methodName y req.body.params.
     * @returns {any} - Resultado de la ejecución del método.
     */
    exeMethod(req) {
        try {
            const boPath = path.join(__dirname, 'BO', `${req.body.objectName}.js`);
            const BOClass = require(boPath);
            const obj = new BOClass();
            obj.userId = req.session.userId;
            obj.profile = req.session.profile;
            if (typeof obj[req.body.methodName] !== 'function') {
                throw new Error(`El método ${req.body.methodName} no existe en ${req.body.objectName}`);

            } else {
                if(!req.body.methodName.toLowerCase().includes("get")){
                    let r = database.executeQuery('security', 'insertAudit', [
                        obj.userId,
                        req.body.methodName,
                        obj.profile,
                        dayjs().format('YYYY-MM-DD HH:mm:ss')
                    ]);
                        
                    if (r && r.rows) {
                        console.log("auditado");
                    }
                }                
                
                return obj[req.body.methodName](req.body.params);
            }
        } catch (error) {
            console.error("Error en exeMethod:", error);
            throw error;
        }
    }
};

module.exports = Security;

// database: carga de queries y ejecucion contra postgres
const fs = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

class DataBase {
    constructor(callback) {
        this.callback = callback || (() => {});
        this.Pool = Pool;
        this.query = {};
        this.connection = {};
        this.init();
    }

    // lee json y elimina bom si existe
    parseJson(text) {
        if (text && text.charCodeAt(0) === 0xFEFF) {
            text = text.slice(1);
        }
        return JSON.parse(text);
    }

    // inicia la carga de queries y conexion
    async init() {
        try {
            await this.loadQueries();
            await this.loadConnection();
            this.callback();
        } catch (error) {
            console.error("Error inicializando la base de datos:", error);
        }
    }

    // ejecuta una consulta contra el pool
    async executeQuery(schema, queryId, params) {
        let connection;
        try {
            connection = await this.connectionPool.connect();
            let query = this.getQuery(schema, queryId);
            let response = await connection.query(query, params);
            return response;
        } catch (e) {
            console.error("Error ejecutando la consulta:", e.stack || e);
            return null;
        } finally {
            if (connection) connection.release();
        }
    }

    // carga queries desde configs/queries.json
    async loadQueries() {
        try {
            const data = await fs.readFile(path.join(__dirname, "configs/queries.json"), 'utf8');
            this.query = this.parseJson(data);
        } catch (err) {
            console.error("Error cargando queries:", err);
            this.query = {};
        }
    }

    // carga conexion desde configs/connections.json
    async loadConnection() {
        try {
            const data = await fs.readFile(path.join(__dirname, "configs/connections.json"), 'utf8');
            this.connection = this.parseJson(data);
            const baseConfig = (this.connection && this.connection.config && this.connection.config[0]) || {};
            const normalized = {
                ...baseConfig,
                password: typeof baseConfig.password === 'string' ? baseConfig.password : (baseConfig.password == null ? '' : String(baseConfig.password))
            };
            this.connectionPool = new this.Pool(normalized);
        } catch (err) {
            console.error("Error cargando conexión:", err);
        }
    }

    // devuelve el sql por schema y id
    getQuery(schema, queryId) {
        if (!this.query || !this.query[schema] || !this.query[schema][queryId]) {
            throw new Error(`Consulta no encontrada: ${schema}.${queryId}`);
        }
        return this.query[schema][queryId];
    }
}

module.exports = DataBase;

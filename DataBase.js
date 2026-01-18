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

    async init() {
        try {
            await this.loadQueries();
            await this.loadConnection();
            this.callback();
        } catch (error) {
            console.error("Error inicializando la base de datos:", error);
        }
    }

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

    async loadQueries() {
        try {
            const data = await fs.readFile(path.join(__dirname, "configs/queries.json"), 'utf8');
            this.query = JSON.parse(data);
        } catch (err) {
            console.error("Error cargando queries:", err);
            this.query = {};
        }
    }

    async loadConnection() {
        try {
            const data = await fs.readFile(path.join(__dirname, "configs/connections.json"), 'utf8');
            this.connection = JSON.parse(data);
            this.connectionPool = new this.Pool(this.connection.config[0]);
        } catch (err) {
            console.error("Error cargando conexión:", err);
        }
    }

    getQuery(schema, queryId) {
        if (!this.query || !this.query[schema] || !this.query[schema][queryId]) {
            throw new Error(`Consulta no encontrada: ${schema}.${queryId}`);
        }
        return this.query[schema][queryId];
    }
}

module.exports = DataBase;

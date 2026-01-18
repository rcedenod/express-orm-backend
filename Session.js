const fs = require('fs');
const path = require('path');
const session = require('express-session');

const Session = class {
    constructor(app) {
        // Leer el archivo JSON de configuración
        const configPath = path.join(__dirname, 'configs/sessionconfig.json');        
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        // Configurar express-session con los valores del JSON
        app.use(session({
            secret: config.secret,
            resave: config.resave,
            saveUninitialized: config.saveUninitialized,
            cookie: config.cookie
        }));

        app.use((req, res, next) => {
            if (req.session) {
                req.session.cookie.maxAge = config.cookie.maxAge;
            }
            next();
        });

        // Inicializar el objeto de sesión con los valores del JSON
        this.sessionObject = config.sessionObject;
    }

    //Verificar que la sesion exista
    sessionExist(req){
        if(req.session && req.session.userName){
            return true;
        }
        return false;
    }
    

    //Autenticacion de usuario
    async authenticateUser(req) {
        try {
            let response = await database.executeQuery("public", "getUser", [req.body.email]);

            if (response.rows.length > 0) {
                const password = response.rows[0].password;
    
                if (req.body.password === password) {
                    this.sessionObject.userId = response.rows[0].id_user;
                    this.sessionObject.userName = response.rows[0].email;
                    this.sessionObject.profile = response.rows[0].fk_id_profile;
                    this.sessionObject.status = true;
                    
                } else {
                    this.sessionObject.status = false;
                }
            }

        } catch (error) {
            console.log(error);
            this.sessionObject.status = false;

        }
    }

    //Crear la sesion
    createSession(req, id_profile) {
        try {
            if (this.sessionObject.status) {
                req.session.userId = this.sessionObject.userId;
                req.session.userName = this.sessionObject.userName;
                req.session.profile = id_profile;
                return true;
            } else {
                throw error;
            }
        } catch (error) {
            console.log("Datos inválidos, no se puede crear la sesión..!");
            return false;
        }
    }    

    // Cerrar la sesión usando promesas y reiniciando sessionObject
    closeSession(req) {
        return new Promise((resolve, reject) => {
            req.session.destroy((err) => {
                if (err) {
                    console.log("Error al cerrar la sesión:", err);
                    reject(err);
                } else {
                    // Reinicia el objeto sessionObject para que no retenga datos del usuario
                    this.sessionObject = {
                        userId: '',
                        userName: '',
                        profile: '',
                        status: ''
                    };
                    resolve(true);
                }
            });
        });
    }

}

module.exports = Session;
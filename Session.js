// session: autenticacion y ciclo de sesion
const fs = require('fs');
const path = require('path');
const session = require('express-session');

const Session = class {
    constructor(app) {
        // lee config y aplica express-session
        const configPath = path.join(__dirname, 'configs/sessionconfig.json');        
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

        // configura express-session con valores del json
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

        // inicializa sessionobject con valores del json
        this.sessionObject = config.sessionObject;
    }

    // verifica si hay sesion activa
    sessionExist(req){
        if(req.session && req.session.userName){
            return true;
        }
        return false;
    }
    

    // autentica usuario contra la base
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

    // crea sesion en req.session
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

    // cierra sesion y limpia sessionobject
    closeSession(req) {
        return new Promise((resolve, reject) => {
            req.session.destroy((err) => {
                if (err) {
                    console.log("Error al cerrar la sesión:", err);
                    reject(err);
                } else {
                    // reinicia el objeto sessionobject para que no retenga datos del usuario
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

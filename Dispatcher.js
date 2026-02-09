// dispatcher: rutas http y bootstrap del servidor
const express = require('express');
let fs = require("fs");
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const cors = require('cors');
const session = require('express-session');
const { profile } = require('console');
const path = require('path');
const port = 3000;

// carga configuracion general (cors, etc.)
const appConfigPath = path.join(__dirname, 'configs', 'appconfig.json');
let appConfig = {
  cors: {
    origin: 'http://localhost:5173',
    credentials: true
  }
};
try {
  let rawConfig = fs.readFileSync(appConfigPath, 'utf8');
  if (rawConfig && rawConfig.charCodeAt(0) === 0xFEFF) {
    rawConfig = rawConfig.slice(1);
  }
  const parsed = JSON.parse(rawConfig);
  appConfig = {
    ...appConfig,
    ...parsed,
    cors: { ...appConfig.cors, ...(parsed.cors || {}) }
  };
} catch (error) {
  console.warn('No se pudo cargar configs/appconfig.json, usando valores por defecto');
}

app.use(cors({
  origin: appConfig.cors.origin,
  credentials: appConfig.cors.credentials,
}));
app.use(express.json());
app.use('/views', express.static(path.join(__dirname, 'views')));
app.use('/tailwind', express.static(path.join(__dirname, 'tailwind')));
app.use('/icons', express.static(path.join(__dirname, 'public', 'icons')));

// objeto global para almacenar los códigos de restablecimiento de contraseña
// estructura: { [email]: { code: "123456", expires: timestamp } }
global.resetCodes = {};
global.ss = new (require('./Session'))(app);
global.database = new (require('./DataBase'))(() => {global.sc = new (require('./Security'))(app);});

  // redirige la raíz '/' al login
  app.get('/', (req, res) => {
      res.redirect('/login-view');
  });

  app.get('/login-view', (req, res) => {
      // si ya tiene sesión, lo mandamos directo al panel
      if (global.ss.sessionExist(req)) {
          return res.redirect('/control-panel');
      }
      res.sendFile(path.join(__dirname, 'views', 'login', 'index.html'));
  });

  // panel restringido a adminá
  app.get('/control-panel', (req, res) => {
      // verifica si hay sesión
      if (!global.ss.sessionExist(req)) {
          return res.redirect('/login-view');
      }

      // verifica si es admin (asumiendo que el id 1 es admin)
      // el objeto sessionobject tiene el perfil actual
      if (global.ss.sessionObject.profile !== 1) { 
          return res.status(403).send("Acceso denegado. Solo administradores.");
      }

      // sirve el archivo html
      res.sendFile(path.join(__dirname, 'views', 'control-panel', 'index.html'));
  });

  // login y creacion de sesion
  app.post('/login', async (req, res) => {
    if (ss.sessionExist(req)) {
        return res.status(400).send('Ya tienes una sesión activa');
    }

    await ss.authenticateUser(req);

    if (!ss.sessionObject.status) {
        return res.status(401).json({ sts: false, msg: "Datos inválidos" });
    }
    
    // buscar los perfiles del usuario
    let profileResults = await database.executeQuery("security", "getUserProfiles", [ss.sessionObject.userName]);
    

    if (!profileResults || !profileResults.rows || profileResults.rows.length === 0) {
        return res.status(403).json({ sts: false, msg: "No tienes perfiles asignados" });
    }

    // si el usuario tiene más de un perfil, enviamos la lista de perfiles para que seleccione
    if (profileResults.rows.length > 1) {
        return res.json({
            sts: true,
            msg: "Selecciona un perfil",
            profiles: profileResults.rows.map(row => ({
                id_profile: row.fk_id_profile,
                profile: row.profile
            }))
        });
    }

    // si solo tiene un perfil, iniciamos sesión directamente
    ss.createSession(req, profileResults.rows[0].fk_id_profile);
    console.log(`El usuario ${req.body.email} inició sesión con el perfil ${profileResults.rows[0].profile}`);

    res.json({
        sts: true,
        msg: "Usuario autenticado",
        options: sc.getPermissionOption(req)
    });
  });

  // seleccion de perfil cuando hay multiples
  app.post('/select-profile', async (req, res) => {

    const { id_profile } = req.body;
    if (!id_profile) {
        return res.status(400).json({ sts: false, msg: "Debes seleccionar un perfil" });
    }

    // verificamos si el perfil pertenece al usuario autenticado
    let profileResults = await database.executeQuery("security", "getUserProfiles", [ss.sessionObject.userName]);
    const validProfile = profileResults.rows.find(row => row.fk_id_profile === id_profile);

    if (!validProfile) {
        return res.status(403).json({ sts: false, msg: "Perfil no válido" });
    }

    // creamos la sesión con el perfil seleccionado
    ss.createSession(req, id_profile);
    console.log(`El usuario ${ss.sessionObject.userName} seleccionó el perfil ${validProfile.profile}`);

    res.json({
        sts: true,
        msg: "Perfil seleccionado correctamente",
        options: sc.getPermissionOption(req)
    });
  });

  // cierre de sesion
  app.post('/logout', async (req, res) => {    
      try {
          await ss.closeSession(req);
          // limpia la cookie (el nombre por defecto es "connect.sid")
          res.clearCookie('connect.sid');
          res.send("Logout ok!");
      } catch (error) {
          res.status(500).send("Error al cerrar la sesión");
      }
  });

  // crea usuario desde endpoint publico
  app.post('/create-user', async (req, res) => {
    try {
      // extraer y validar los datos enviados
      const { name, last_name, birth_date, email, password, number_id } = req.body;
      if (!name || !last_name || !birth_date || !email || !password || !number_id) {
        return res.status(400).json({ sts: false, msg: "Faltan datos obligatorios" });
      }
  
      // insertar la persona en la tabla public.person
      let personResult = await database.executeQuery("public", "createPerson", [name, last_name, birth_date]);
      if (!personResult || !personResult.rows || personResult.rows.length === 0) {
        return res.status(500).json({ sts: false, msg: "No se pudo crear la persona" });
      }
      
      // obtener el id_person generado
      const id_person = personResult.rows[0].id_person;
      console.log(`Persona creada con id_person: ${id_person}`);
      
      // insertar el usuario en la tabla security.user
      let userResult = await database.executeQuery("security", "createUser", [email, password, number_id, id_person]);

      // obtener el id del usuario recién creado
      const id_user = userResult.rows[0].id_user;
      const id_profile = 2;

      // insertar en la tabla user_profile para asignar el perfil al usuario
      const userProfileResult = await database.executeQuery("security", "createUserProfile", [
        id_user,
        id_profile
      ]);
      
      if (userResult && userResult.rowCount > 0) {
        console.log(`El usuario: ${email} fue creado correctamente`);
        return res.json({ sts: true, msg: "Usuario creado correctamente" });
      } else {
        return res.status(500).json({ sts: false, msg: "No se pudo crear el usuario" });
      }
    } catch (error) {
      console.error("Error en createUser endpoint:", error);
      return res.status(500).json({ sts: false, msg: "Error al crear el usuario" });
    }
  });

  // endpoint: enviar código de restablecimiento de contraseña
  // envia codigo de reset de password
  app.post('/reset-password', async (req, res) => {
    const emailRegex = /^\S+@\S+\.\S+$/; // expresion regular para email
    const maxEmailLength = 50; // limite de caracteres para el email
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ sts: false, msg: "Falta el email" });
      }

      if (email.length > maxEmailLength) {
        return res.status(400).json({ sts: false, msg: "Email muy largo" });
      }
      if (!emailRegex.test(email)) {
        return res.status(400).json({ sts: false, msg: "Email invalido" });
      }

      let userCheck = await database.executeQuery("security", "getUserByEmail", [email]);
      if (!userCheck || !userCheck.rows || userCheck.rows.length === 0) {
        return res.status(400).json({ sts: false, msg: "El correo no está registrado." });
      }

      // genera un código aleatorio de 6 dígitos
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      // establece expiración en 15 minutos
      const expires = Date.now() + 15 * 60 * 1000;
      global.resetCodes[email] = { code, expires, email };

      // configura el transporter
      const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
      const smtpPort = Number(process.env.SMTP_PORT || 587);
      const smtpSecure = String(process.env.SMTP_SECURE || "false") === "true";
      const smtpUser = process.env.SMTP_USER || "";
      const smtpPass = process.env.SMTP_PASS || "";
      const smtpFrom = process.env.SMTP_FROM || smtpUser;

      if (!smtpUser || !smtpPass) {
        return res.status(500).json({ sts: false, msg: "SMTP no configurado" });
      }

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      const mailOptions = {
        from: smtpFrom,
        to: email,
        subject: "Código para restablecer contraseña",
        text: `Tu código de restablecimiento es: ${code}`
      };

      await transporter.sendMail(mailOptions);
      res.json({ sts: true, msg: "Correo enviado con el código de restablecimiento." });
    } catch (error) {
      console.error("Error en /reset-password:", error);
      res.status(500).json({ sts: false, msg: "Error al enviar el correo." });
    }
  });

  // endpoint: confirmar código y actualizar la contraseña
  // confirma codigo y actualiza password
  app.post('/confirm-reset-password', async (req, res) => {
    try {
      const { code, newPassword } = req.body;
  
      // busca un código almacenado sin requerir el email
      const storedEntry = Object.values(global.resetCodes).find(entry => entry.code === code);
  
      if (!storedEntry) {
        return res.status(400).json({ sts: false, msg: "Código incorrecto o no encontrado." });
      }
  
      const { email, expires } = storedEntry;
  
      if (Date.now() > expires) {
        delete global.resetCodes[email];
        return res.status(400).json({ sts: false, msg: "El código ha expirado." });
      }
  
      // actualiza la contraseña en la base de datos
      let updateResult = await database.executeQuery("security", "updatePassword", [newPassword, email]);
  
      if (updateResult && updateResult.rowCount > 0) {
        delete global.resetCodes[email];
        res.json({ sts: true, msg: "Contraseña actualizada correctamente." });
      } else {
        res.status(500).json({ sts: false, msg: "No se pudo actualizar la contraseña." });
      }
    } catch (error) {
      console.error("Error en /confirm-reset-password:", error);
      res.status(500).json({ sts: false, msg: "Error al actualizar la contraseña." });
    }
  });
  

  // endpoint: restablecer el email
  // se requiere que se envíe la cédula (number_id), la contraseña actual y el nuevo email.
  // actualiza email con credenciales actuales
  app.post('/reset-email', async (req, res) => {
    try {
      const { number_id, password, newEmail } = req.body;
      if (!number_id || !password || !newEmail) {
        return res.status(400).json({ sts: false, msg: "Faltan datos obligatorios" });
      }

      // verifica que exista un usuario con esa cédula y contraseña.
      let userCheck = await database.executeQuery("security", "getUserByNumberAndPassword", [number_id, password]);
      if (!userCheck || !userCheck.rows || userCheck.rows.length === 0) {
        return res.status(400).json({ sts: false, msg: "Credenciales incorrectas" });
      }

      // actualiza el email en la tabla security.user.
      let updateResult = await database.executeQuery("security", "updateUserEmail", [newEmail, number_id, password]);
      if (updateResult && updateResult.rowCount > 0) {
        res.json({ sts: true, msg: "Email actualizado correctamente." });
      } else {
        res.status(500).json({ sts: false, msg: "No se pudo actualizar el email." });
      }
    } catch (error) {
      console.error("Error en /reset-email:", error);
      res.status(500).json({ sts: false, msg: "Error al actualizar el email." });
    }
  });

  // devuelve menu segun permisos
  app.get('/menu-options', (req, res) => {
    // verifica que la sesión exista y que el usuario esté autenticado
    if (!req.session || !req.session.profile) {
      return res.status(401).json({ sts: false, msg: "No autorizado" });
    }
    // obtiene las opciones de menú basadas en el perfil
    const options = sc.getPermissionOption(req);
    //console.log('opciones del menu: ', options);
    res.json({ sts: true, options });
  });

  // valida sesion en front
  app.get('/check-session', (req, res) => {
    if (ss.sessionExist(req)) {
      res.json({ authenticated: true });
    } else {
      res.json({ authenticated: false });
    }
  });

  // endpoint unico de despacho de metodos
  app.post('/to-process', async function (req, res) {
    if(ss.sessionExist(req)){
      if(sc.hasPermissionMethod({
        profile: req.session.profile,
        objectName: req.body.objectName,
        methodName: req.body.methodName,
        params: req.body.params
      })){
        let r = await sc.exeMethod(req);
        res.send(JSON.stringify(r));
      }
      else {
        res.send({sts:false, msg:'No tiene permisos para ejecutar el metodo...'});
      }
      
    } else {
      res.send({sts:false, msg:'debe hacer login...'});
    }
  });

  // crea un link clickeable en terminales compatibles
const makeTerminalLink = (label, url) => `\u001b]8;;${url}\u001b\\${label}\u001b]8;;\u001b\\`;

  // arranque del servidor
  app.listen(port, () => {
    const controlPanelUrl = `http://localhost:${port}/control-panel`;
    console.log(`Servidor activo en el puerto ${port}`);
    console.log(`Panel de control: ${controlPanelUrl}`);
    console.log(`Vinculo panel: ${makeTerminalLink('Abrir panel de control', controlPanelUrl)}`);
  });

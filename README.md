# GrapORM

GrapORM es un backend ORM educativo desarrollado en la universidad para aprender como funcionan soluciones mas sofisticadas de este tipo. No esta terminado y puede mejorar mucho mas, pero ofrece una base funcional para estudiar arquitectura, seguridad y despacho de metodos.

Repositorio: `https://github.com/rcedenod/grap-orm`

## Instalacion

Requisitos:

- Node.js 18+
- PostgreSQL instalado y disponible en PATH (comandos `psql` y `pg_restore`)

Instalar el paquete:

```bash
npm i grap-orm
```

## Configuracion

1. Inicializar la base y generar la conexion:

```bash
npm run init
```

El asistente pedira:

- Host
- Puerto
- Usuario
- Contrasena
- Nombre de la base
- Si deseas inicializar la base por primera vez

Si respondes `s`, se creara (si no existe) y se restaurara `backup/orm-db.sql`.
Si respondes `n`, solo se genera `configs/connections.json`.

2. Configurar correo (opcional, para reset de password):

Crea un `.env` con:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_correo
SMTP_PASS=tu_contrasena
SMTP_FROM=tu_correo
```

Archivo de ejemplo: `.env.example`.

3. Configurar CORS:

Editar `configs/appconfig.json`:

```json
{
  "cors": {
    "origin": "http://localhost:5173",
    "credentials": true
  }
}
```

## Uso del servidor

Levantar el servidor:

```bash
npm run start
```

Endpoints principales:

- `GET /login-view`: vista de inicio de sesion
- `GET /control-panel`: panel de control (solo admin)
- `POST /login`: autentica usuario
- `POST /select-profile`: seleccion de perfil
- `POST /logout`: cierra sesion
- `GET /check-session`: valida sesion
- `POST /to-process`: endpoint unico de ejecucion de metodos

## Flujo de uso (alto nivel)

1. El cliente envia `objectName`, `methodName` y `params` a `/to-process`.
2. Se valida sesion activa.
3. `Security` valida permisos por perfil, objeto y metodo.
4. Se ejecuta el metodo por reflexion.
5. Se retorna el resultado.

Ejemplo de payload:

```json
{
  "objectName": "MethodBO",
  "methodName": "getMethods",
  "params": {}
}
```

## Componentes principales

- `Dispatcher.js`: arranque del servidor, rutas HTTP, CORS y vistas.
- `Session.js`: manejo de sesion (express-session) y login basico.
- `Security.js`: permisos, menu, validacion y ejecucion de metodos.
- `DataBase.js`: carga de queries y ejecucion contra PostgreSQL.

## Objetos de negocio (BO)

Carpeta `bo/`:

- `UserBO.js`: CRUD de usuarios y perfiles.
- `ProfileBO.js`: CRUD de perfiles.
- `ObjectBO.js`: CRUD de objetos.
- `MethodBO.js`: CRUD de metodos y permisos.
- `PersonBO.js`: CRUD de personas.

Cada BO se invoca via `/to-process` con `objectName` y `methodName`.

## Estructura de carpetas

```text
grap-orm/
├─ bo/
├─ configs/
├─ views/
├─ public/
├─ tailwind/
├─ backup/
├─ DataBase.js
├─ Dispatcher.js
├─ Security.js
└─ Session.js
```

## Estado del proyecto

Este proyecto es educativo y esta en progreso. Se puede mejorar en:

- seguridad (hash de contrasenas, validaciones, manejo de secretos)
- pruebas automatizadas
- estandar de errores y respuestas
- documentacion adicional

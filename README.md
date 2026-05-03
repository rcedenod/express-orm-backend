# GrapORM

GrapORM es un backend educativo desarrollado en Node.js y PostgreSQL que implementa un patrón de despacho único: todas las operaciones de negocio pasan por un solo endpoint (`/to-process`), donde se valida sesión, se verifican permisos y se ejecuta el método solicitado por reflexión.

Repositorio: `https://github.com/rcedenod/grap-orm`

## Instalación

Requisitos:

- Node.js 18+
- PostgreSQL instalado y disponible en PATH (comandos `psql` y `pg_restore`)

Instalar dependencias:

```bash
npm install
```

## Configuración

### 1. Variables de entorno

Copia el archivo de ejemplo y completa los valores:

```bash
cp .env.example .env
```

El archivo `.env` debe contener al menos:

```bash
# Requerido — genera una clave con:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=tu_clave_secreta_larga

# Opcional — para reset de contraseña por correo
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_correo
SMTP_PASS=tu_contrasena
SMTP_FROM=tu_correo
```

### 2. Base de datos

Inicializa la base de datos y genera el archivo de conexión:

```bash
npm run init
```

El asistente pedirá:

- Host, puerto, usuario y contraseña de PostgreSQL
- Nombre de la base de datos
- Si deseas crear e inicializar la base desde cero

Si respondes `s`, se creará la base (si no existe) y se restaurará el esquema desde `backup/orm-db.sql`.  
Si respondes `n`, solo se genera `configs/connections.json` con los datos ingresados.

### 3. CORS

Edita `configs/appconfig.json` para que el origen coincida con tu frontend:

```json
{
  "cors": {
    "origin": "http://localhost:5173",
    "credentials": true
  }
}
```

## Uso

Levantar el servidor:

```bash
npm run start
```

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/login-view` | Vista de inicio de sesión |
| `GET` | `/control-panel` | Panel de control (solo admin) |
| `POST` | `/login` | Autenticación de usuario |
| `POST` | `/select-profile` | Selección de perfil (multi-perfil) |
| `POST` | `/logout` | Cierre de sesión |
| `GET` | `/check-session` | Valida si hay sesión activa |
| `POST` | `/to-process` | Endpoint único de ejecución de métodos |
| `POST` | `/create-user` | Registro público de usuarios |
| `POST` | `/reset-password` | Envío de código de restablecimiento |
| `POST` | `/confirm-reset-password` | Confirmación de código y cambio de contraseña |
| `POST` | `/reset-email` | Actualización de correo electrónico |

### Uso de `/to-process`

Todos los métodos de negocio se invocan con el mismo payload:

```json
{
  "objectName": "UserBO",
  "methodName": "getUsers",
  "params": {}
}
```

El servidor valida sesión activa, verifica que el perfil tenga permiso sobre ese objeto y método, y ejecuta el método correspondiente.

## Decisiones de diseño

### Single endpoint dispatch

En lugar de un endpoint por operación, todas las llamadas de negocio van a `/to-process`. Esto centraliza la validación de sesión y permisos en un solo lugar, y permite agregar nuevos métodos sin crear nuevas rutas.

### Ejecución por reflexión con whitelist

`Security.js` carga dinámicamente el BO correspondiente usando `require()` y llama al método por nombre. Para evitar que se cargue un módulo arbitrario del filesystem, los objetos de negocio permitidos se declaran explícitamente en `configs/bosconfig.json`:

```json
{
  "allowedObjects": ["UserBO", "ProfileBO", "MethodBO", "ObjectBO", "PersonBO"],
  "protectedObjects": ["userbo", "personbo", "profilebo", "methodbo", "objectbo"]
}
```

Para agregar un nuevo BO basta con crear el archivo en `bo/` y registrar su nombre en `allowedObjects`.

### Caché de permisos en memoria

Al arrancar, `Security.js` carga todos los permisos desde la base de datos en dos `Map`s:

- `methodPermission` — clave: `profileId_objectName_methodName`
- `optionPermission` — clave: `profileId_menu_moduleId`

Cada request a `/to-process` verifica permisos en O(1) sin consultar la base. El caché se actualiza cuando se modifican permisos desde el panel de control.

### Queries externalizadas en JSON

Todas las consultas SQL viven en `configs/queries.json` organizadas por esquema e identificadas por nombre. `DataBase.js` las carga al inicio y las ejecuta siempre con parámetros posicionales (`$1`, `$2`...) para prevenir inyección SQL.

## Componentes principales

| Archivo | Responsabilidad |
|---------|----------------|
| `Dispatcher.js` | Servidor Express, rutas HTTP y arranque |
| `Session.js` | Autenticación y ciclo de sesión |
| `Security.js` | Permisos, caché y ejecución de métodos |
| `DataBase.js` | Conexión a PostgreSQL y ejecución de queries |

## Objetos de negocio

Ubicados en `bo/`, cada uno expone métodos invocables vía `/to-process`:

| BO | Métodos principales |
|----|-------------------|
| `UserBO` | `getUsers`, `createUser`, `updateUser`, `deleteUsers` |
| `ProfileBO` | `getProfiles`, `createProfile`, `updateProfile`, `deleteProfiles` |
| `MethodBO` | `getMethods`, `createMethod`, `getPermissionMethods`, `syncPermissions` |
| `ObjectBO` | `getObjects`, `createObject`, `updateObject`, `deleteObjects` |
| `PersonBO` | `getPeople` |

## Estructura de carpetas

```
grap-orm/
├── bo/                  # Objetos de negocio
├── configs/             # Queries SQL, configuración de sesión, CORS y BOs
├── views/               # Vistas HTML y JS del frontend
├── public/              # Assets estáticos
├── backup/              # Esquema de base de datos
├── bin/                 # CLI de inicialización
├── DataBase.js
├── Dispatcher.js
├── Security.js
└── Session.js
```

## Seguridad implementada

- Contraseñas hasheadas con **bcrypt** (factor 10)
- Whitelist de BOs permitidos antes de cualquier `require()` dinámico
- `SESSION_SECRET` leído desde variable de entorno — el servidor no arranca si no está definido
- Queries 100% parametrizadas — sin interpolación de strings en SQL
- Handler global de errores — ningún stack trace llega al cliente

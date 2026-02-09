# express-orm-backend

Monolito desacoplado desarrollado con fines educativos para entender y practicar ideas de ORM y capas de negocio similares a enfoques usados en ecosistemas como Prisma y TypeORM.

El proyecto implementa un backend en Node.js + Express con un patrón de **despacho por un único endpoint** (`/to-process`) y un modelo de seguridad basado en:

- sesión por cookie (`express-session`)
- perfiles/roles
- permisos por método
- ejecución dinámica (reflexión) de métodos de objetos de negocio

## Objetivo

Este repositorio busca enseñar cómo desacoplar:

- transporte HTTP
- autenticación/sesión
- autorización
- lógica de negocio
- acceso a datos

Todo con una estructura simple de entender y extender.

## Arquitectura actual

### Núcleo del servidor

- `Dispatcher.js`: arranque de Express, rutas HTTP, vistas y endpoint `to-process`.
- `Session.js`: manejo de autenticación y estado de sesión.
- `Security.js`: carga/validación de permisos y ejecución dinámica de métodos de negocio.
- `DataBase.js`: capa de consultas PostgreSQL usando `pg` y queries en JSON.

### Objetos de negocio (BO)

Carpeta `bo/`:

- `UserBO.js`
- `ProfileBO.js`
- `MethodBO.js`
- `ObjectBO.js`
- `PersonBO.js`

Cada BO contiene métodos de negocio que luego son invocados mediante `/to-process`.

## Flujo de una solicitud (`/to-process`)

1. Cliente envía `objectName`, `methodName`, `params`.
2. El servidor valida que exista sesión activa.
3. `Security.hasPermissionMethod` verifica permiso según perfil + objeto + método.
4. Si está autorizado, `Security.exeMethod` instancia el BO solicitado y ejecuta el método por reflexión.
5. Para métodos que no contienen `get` en el nombre, se registra auditoría.
6. Se retorna el resultado al cliente.

Ejemplo de payload:

```json
{
  "objectName": "MethodBO",
  "methodName": "getMethods",
  "params": {}
}
```

## Seguridad, sesión y permisos

- Sesión configurada en `configs/sessionconfig.json`.
- Identidad de sesión guardada en cookie (`connect.sid`) y datos en `req.session`.
- Permisos de métodos y menú cargados en memoria al iniciar (`Security.loadPermission`).
- La autorización se calcula con clave compuesta:
  - métodos: `profile_object_method`
  - menú: `profile_menu_module`

## Endpoint nuevo: `control-panel`

Estado actual:

- Existe endpoint `GET /control-panel`.
- Sirve `views/control-panel.html` directamente desde el backend.
- Requiere sesión activa.
- Restringido a perfil administrador (`profile === 1`).

Este panel está orientado a gestionar:

- usuarios
- perfiles/roles
- permisos
- objetos
- métodos

y consume el backend mediante llamadas a `/to-process`.

## Panel de control (estado actual)

El panel administrativo incluye:

- CRUD de usuarios
- CRUD de perfiles
- CRUD de objetos
- CRUD de métodos
- asignación de permisos por perfil
- filtros por método y objeto en vistas de métodos y permisos
- modal de feedback/confirmación (se reemplazaron `alert`/`confirm`)

Reglas aplicadas:

- solo perfil Admin puede abrir `/control-panel`
- para perfiles no-admin, no se muestran métodos de objetos protegidos:
  - `UserBO`, `PersonBO`, `ProfileBO`, `MethodBO`, `ObjectBO`

## Endpoints HTTP disponibles (estado actual)

Autenticación y sesión:

- `POST /login`
- `POST /select-profile`
- `POST /logout`
- `GET /check-session`
- `GET /menu-options`

Registro y cuenta:

- `POST /create-user`
- `POST /reset-password`
- `POST /confirm-reset-password`
- `POST /reset-email`

Vistas:

- `GET /` (redirige a login)
- `GET /login-view`
- `GET /register` (deshabilitado: redirige a `/login-view`)
- `GET /control-panel`

Despacho ORM:

- `POST /to-process`

## Base de datos

- Motor: PostgreSQL
- Configuración: `configs/connections.json`
- Consultas SQL centralizadas: `configs/queries.json`
- Respaldo incluido: `backup/orm-db.sql` (formato dump binario de PostgreSQL)

Para restaurar el dump usa `pg_restore` (no `psql` directo), por ejemplo:

```bash
pg_restore -U postgres -d orm-db backup/orm-db.sql
```

## Instalación y ejecución

### Requisitos

- Node.js 18+
- PostgreSQL 14+

### Pasos

1. Instalar dependencias:

```bash
npm install
```

2. Configurar conexión PostgreSQL en `configs/connections.json`.

3. Restaurar o preparar el esquema y datos de base.

4. Iniciar servidor:

```bash
node Dispatcher.js
```

Servidor por defecto:

- `http://localhost:3000`

## Cómo agregar un nuevo BO

1. Crear archivo en `bo/`, por ejemplo `InvoiceBO.js`.
2. Implementar métodos públicos del objeto.
3. Registrar el objeto en tabla `security.object`.
4. Registrar métodos en tabla `security.method` vinculados al objeto.
5. Asignar permisos en `security.permission_method` a los perfiles necesarios.
6. Consumir por `/to-process` enviando `objectName: "InvoiceBO"`.

## Estado del proyecto y consideraciones

Este repositorio está en evolución educativa, con base funcional para:

- autenticación y sesión
- permisos por método
- ejecución dinámica de BO
- panel administrativo inicial (`control-panel`)

Aspectos a mejorar en siguientes iteraciones:

- endurecimiento de seguridad (hash de contraseñas, manejo de secretos, validaciones)
- scripts de arranque (`npm start`, `npm dev`)
- tests automatizados
- estandarización de errores y respuestas
- mejoras de consistencia entre nombre de carpetas/rutas (`bo` vs `BO`)

## Estructura de carpetas

```text
express-orm-backend/
├─ bo/
├─ configs/
├─ public/
├─ views/
├─ backup/
├─ DataBase.js
├─ Dispatcher.js
├─ Security.js
└─ Session.js
```

# Inventory Pro — Backend

API REST para panel administrativo y catálogo público de bisutería.

## Stack

- Node.js 20+
- Express (ES modules)
- MySQL (Railway) vía `mysql2/promise`
- JWT + bcryptjs
- Multer + Cloudinary
- helmet, cors, express-rate-limit, express-validator

## Requisitos previos

1. MySQL con `sql/database.sql` y `sql/seeds.sql` ejecutados.
2. Usuario administrador creado con `npm run create-admin`.
3. Variables de entorno según `.env.example`.

## Instalación

```bash
cd backend
npm install
cp .env.example .env
# Editar .env con MySQL, JWT y Cloudinary
npm run create-admin
npm run dev
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor con nodemon |
| `npm start` | Producción |
| `npm run create-admin` | Crear/actualizar admin |
| `npm run db:init` | Ejecutar database.sql + seeds.sql |
| `npm run db:verify` | Verificar tablas e índices |

## Variables Railway

El backend usa exactamente:

- `MYSQLHOST`
- `MYSQLPORT`
- `MYSQLDATABASE`
- `MYSQLUSER`
- `MYSQLPASSWORD`

Además: `JWT_SECRET`, `JWT_EXPIRES_IN`, Cloudinary, `FRONTEND_URL`, `PORT`.

## Endpoints principales

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/perfil` (JWT)
- `/api/admin/*` (JWT + rol Administrador)
- `/api/public/*` (catálogo)

## Discrepancia Doc 2 vs Doc 3

Documento 3 (ejemplo de producto) usa `color` y `talla`.  
Documento 2 (BD) define `color_estilo` y `material`. **No existe columna `talla`.**

Implementación (sin inventar columna):
- `color` se acepta como alias de `color_estilo`
- `material` se usa tal cual
- `talla` se ignora (no hay columna en MySQL)

## Despliegue Railway

1. Servicio MySQL + servicio backend desde GitHub.
2. Enlazar variables `MYSQL*`.
3. Start Command: `npm start`.
4. Probar `GET /api/health` y `POST /api/auth/login`.

## Seguridad

- No subir `.env` a GitHub.
- No registrar secretos en consola.
- Rutas admin protegidas con JWT y rol Administrador.

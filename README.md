# CSE Backend API

Backend Node.js/Express + TypeScript pour une mini application SaaS de gestion d'Oeuvre Sociale (CSE), avec PostgreSQL + Prisma.

## Installation

1. Installer les dependances:

```bash
npm install
```

2. Copier les variables d'environnement:

```bash
cp .env.example .env
```

3. Configurer `.env` avec toutes les variables ci-dessous:

```env
PORT=4000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require
JWT_SECRET=your_strong_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_strong_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d
REFRESH_TOKEN_COOKIE_NAME=refresh_token
```

4. Generer le client Prisma et appliquer les migrations:

```bash
npm run prisma:generate
npm run prisma:migrate:dev
```

5. Lancer le serveur en dev:

```bash
npm run dev
```

API disponible sur `http://localhost:4000/api`.

## Variables d'environnement

Fichier: `.env`

```env
PORT=4000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB?sslmode=require
JWT_SECRET=your_strong_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_strong_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d
REFRESH_TOKEN_COOKIE_NAME=refresh_token
```

## Endpoints principaux

Tous les endpoints sont prefixes par `/api`.

### Health

- `GET /health`

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /me` (token requis)
- `GET /me/permissions` (token requis)

### Users

- `GET /users/:id`
- `GET /users/by-email?email=...`
- `POST /users` (ADMIN + permission `BENEFICIARY/CREATE`)
- `PATCH /users/:id` (self ou permission `BENEFICIARY/UPDATE`)

### Help Requests

- `GET /requests` (token + permission `HELP_REQUEST/READ`)
- `GET /requests/:id` (token + permission `HELP_REQUEST/READ` + scope policy)
- `POST /requests` (token + permission `HELP_REQUEST/CREATE` + role `BENEFICIARY`)
- `PATCH /requests/:id` (owner + `DRAFT`)
- `POST /requests/:id/submit` (owner + `DRAFT`)
- `POST /requests/:id/approve` (MANAGER + `SUBMITTED` + budget suffisant)
- `POST /requests/:id/reject` (MANAGER + `SUBMITTED`)
- `POST /requests/:id/pay` (MANAGER + `APPROVED` + transaction budget/request)

### Budget annuel

- `GET /budget?year=2026` (ADMIN + permission `BUDGET/READ`)
- `PUT /budget` (ADMIN + permission `BUDGET/UPDATE`)

Exemple payload:

```json
{
  "year": 2026,
  "totalAmount": 1000000
}
```

## Securite

- Hash des mots de passe avec `bcrypt`.
- Authentification JWT (`Bearer token`) avec expiration configurable.
- RBAC strict cote backend:
  - verification du token (`requireAuth`)
  - verification des permissions role-permission (`requirePermission`)
  - verification de role quand necessaire (`requireRole`)
  - policies metier (owner, statut, manager only, etc...)
- Validation des inputs avec `zod` (DTO parse + erreurs 400).
- Workflow strict des demandes:
  - `DRAFT -> SUBMITTED -> APPROVED/REJECTED -> PAID`
  - pas de saut d'etape
  - `DRAFT` modifiable, `SUBMITTED` non modifiable
- Regle budget:
  - verification budget au `APPROVE`
  - decrementation au `PAID` dans une transaction
- Audit log metier en base (`audit_logs`) sur les actions critiques:
  - `userId`, `action`, `resource`, `resourceId`, `metadata`, `createdAt`
- Gestion d'erreurs centralisee:
  - erreurs metier (`BadRequest`, `Unauthorized`, `Forbidden`, `Conflict`, `NotFound`)
  - format JSON uniforme via middleware global.

## Scripts utiles

- `npm run dev`: demarrage dev (nodemon)
- `npm run build`: compilation TypeScript
- `npm run start`: lancement prod (`dist/server.js`)
- `npm run prisma:generate`
- `npm run prisma:migrate:dev`
- `npm run prisma:migrate:create`
- `npm run prisma:migrate:deploy`
- `npm run prisma:migrate:status`

# WORKLOG - CSE Backend

## 2026-02-25

### 1. Configuration environnement
- Ajout et alignement `.env` / `.env.example`.
- Variables utilisees:
  - `PORT`
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN`
- Integration de la validation d'env via Zod.

### 2. Base de donnees Prisma + PostgreSQL (Neon)
- Initialisation Prisma + generation du client.
- Connexion Neon via adaptateur `@prisma/adapter-pg`.
- Creation des schemas et migrations progressives:
  - users
  - roles / permissions / role_permissions
  - help_requests
  - budgets
  - audit_logs

### 3. Error class et gestion d'erreurs
- Middleware global de gestion d'erreurs.
- Middleware 404.
- Request id middleware.
- Definition des erreurs metier (`BadRequest`, `Unauthorized`, `Forbidden`, `Conflict`, `NotFound`).
- Reponses d'erreurs homogenes JSON.

### 4. Module Prisma
- Creation du module Prisma pour centraliser la connexion DB.
- Ajout des methodes de cycle de vie `connect` / `disconnect`.
- Integration dans le bootstrap serveur.

### 5. Module Health
- Route `GET /api/health` pour verifier l'etat de l'API.

### 6. Module User
- Endpoints implementes:
  - `findById`
  - `findByEmail`
  - `create`
  - `edit`
- Regles metier:
  - creation user via endpoint admin limitee aux BENEFICIARY.
  - edition autorisee selon regles admin/self.
- Validation DTO + hash password.

### 7. Authentification
- Module `auth`:
  - `POST /auth/login`
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `GET /me`
  - `GET /me/permissions`
- Hash mot de passe: bcrypt.
- JWT avec expiration configurable (`accessToken` court + `refreshToken` long).
- Refresh token transporte via cookie HttpOnly (pas de stockage `localStorage`).
- Chargement role + permissions depuis la base.

### 8. Configuration Role et Permission
- Configuration des tables `roles`, `permissions`, `role_permissions`.
- Chargement des permissions effectives via le role utilisateur.
- Exposition `GET /api/me/permissions` pour le frontend.

### 9. Module Help Request
- Endpoints workflow:
  - create, edit draft, submit, approve, reject, pay
  - list + read by id
- Regles appliquees:
  - owner-only sur edition/soumission
  - DRAFT modifiable, SUBMITTED non modifiable
  - manager-only pour approve/reject/pay
  - pas de saut d'etape
- Organisation pipeline lisible:
  - middleware -> policy -> controller -> service.

### 10. Module Budget annuel
- Endpoints:
  - `GET /budget?year=...`
  - `PUT /budget`
- Acces reserve ADMIN + permission budget.
- Budget annuel unique par annee (`year` unique).
- Regles update:
  - impossible de fixer `totalAmount` sous le deja consomme.

### 11. Liaison Budget <-> Help Request
- Verification budget au `approve`.
- Au `pay`:
  - transaction Prisma,
  - re-check budget,
  - decrement `remainingAmount`,
  - passage status `PAID`.
- Utilisation d'updates conditionnels pour limiter les races.

### 12. RBAC strict backend
- Guard `requireAuth`.
- Guard `requirePermission(resource, action)`.
- Guard `requireRole`.
- Guard `requirePermissionOrSelf`.
- Application des guards sur routes sensibles (`users`, `requests`, `budget`).

### 13. Audit log
- Ajout table `audit_logs`.
- Ajout service `AuditLogService`.
- Audit branche sur actions critiques:
  - auth (login/register),
  - user (create/edit),
  - help request (create/edit/submit/approve/reject/pay),
  - budget (upsert/update).
- Arbitrage retenu:
  - audit metier (actions reussies) dans les services,
  - pas de log HTTP brut global pour l'instant.

### 14. Documentation
- Creation/mise a jour `README.md`:
  - installation,
  - variables d'environnement,
  - endpoints principaux,
  - securite (RBAC, validation, workflow, budget, audit).

## Difficultes et arbitrages
- Choix d'une architecture modulaire (`module`, `controller`, `service`, `dto`) pour separer clairement les responsabilites.
- Cette organisation rend le code plus facile a lire, maintenir et faire evoluer (ajout de nouveaux modules sans casser les existants).
- La modularite facilite aussi les tests cibles (tester un service ou un module independamment).

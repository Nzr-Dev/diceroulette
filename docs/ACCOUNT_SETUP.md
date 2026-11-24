# Account and sync: setup / Cuenta y sincronización: puesta en marcha

## English

The account is optional. Without it the app works fully offline with IndexedDB. With it, the library syncs between devices.

### 1. Install (pnpm)

```powershell
pnpm add better-auth@1.7.27 @prisma/client@7.10.1 @prisma/adapter-neon@7.10.1 dotenv
pnpm add -D prisma@7.10.1
```

Pin Prisma 7: `latest` on npm is currently Prisma 8 (release candidate), which Better Auth's Prisma adapter does not support yet.

Edit `package.json` scripts so the Prisma client is generated before building (Vercel runs `build`):

```json
"scripts": {
  "postinstall": "nuxt prepare",
  "build": "prisma generate && nuxt build",
  "dev": "nuxt dev"
}
```

Add to `.gitignore`:

```
.env
server/generated
```

### 2. Neon (database)

1. In Neon, open your project > **Connect**. Copy the **pooled** connection string (host contains `-pooler`) as `DATABASE_URL`, and the **direct** one (no `-pooler`) as `DATABASE_URL_UNPOOLED`.
2. Copy `.env.example` to `.env` and fill in the values.
3. Create the tables:

```powershell
pnpm prisma migrate dev --name init
pnpm prisma generate
```

### 3. Google sign-in

1. Google Cloud Console > create a project > **APIs & Services > OAuth consent screen** (External, app name DiceRoulette, your email).
2. **Credentials > Create credentials > OAuth client ID > Web application**.
3. Authorized JavaScript origins: `http://localhost:3000` and your production domain.
4. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` and `https://YOUR-DOMAIN/api/auth/callback/google`.
5. Put the client ID and secret in `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`).
6. `BETTER_AUTH_SECRET`: run `openssl rand -base64 32` (or any long random text). `BETTER_AUTH_URL`: `http://localhost:3000` locally, your domain in production.

### 4. Vercel

Add the same five variables in **Project Settings > Environment Variables** (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`). `DATABASE_URL_UNPOOLED` is only needed on your computer, to run migrations. Never commit `.env`.

### How sync works

- Every saved table gets the account's next revision number. A device asks for "everything after revision N".
- If two devices change the same table, the server version wins and the other device keeps its own version as a copy named "(conflict copy)". Nothing is lost.
- Limits: 1 MB per table, 25 MB per account. The quick table of the home page never leaves the device. History stays local.
- Deleted tables stay 30 days in the trash (local and cloud), then are purged.

## Español

La cuenta es opcional. Sin ella la app funciona entera sin conexión con IndexedDB. Con ella, la biblioteca se sincroniza entre dispositivos.

1. **Instalar**: los comandos de arriba. Fija Prisma en la versión 7 (la `latest` de npm es ahora Prisma 8 en candidata, que el adaptador de Better Auth aún no soporta). Cambia el script `build` y añade `.env` y `server/generated` al `.gitignore`.
2. **Neon**: copia la cadena *pooled* (con `-pooler`) en `DATABASE_URL` y la directa en `DATABASE_URL_UNPOOLED`; rellena `.env` a partir de `.env.example`; ejecuta `pnpm prisma migrate dev --name init`.
3. **Google**: crea el proyecto en Google Cloud Console, la pantalla de consentimiento (externa) y un ID de cliente OAuth de tipo web. Orígenes: `http://localhost:3000` y tu dominio. URI de redirección: `…/api/auth/callback/google` en ambos. Copia ID y secreto al `.env`.
4. **Vercel**: añade las mismas variables en Settings > Environment Variables (menos `DATABASE_URL_UNPOOLED`). Nunca subas `.env` a Git.

**Cómo sincroniza**: cada mesa guardada recibe el siguiente número de revisión de la cuenta y cada dispositivo pide «todo lo posterior al número N». Si dos dispositivos cambian la misma mesa, gana la versión del servidor y el otro dispositivo guarda la suya como copia «(copia por conflicto)»: no se pierde nada. Límites: 1 MB por mesa y 25 MB por cuenta; la mesa rápida y el historial no salen del dispositivo; las mesas borradas se conservan 30 días.

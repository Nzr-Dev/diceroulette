# Deploy / Despliegue

## English

1. **Git**: `git init`, check that `git status` does NOT list `.env`, commit, create a public GitHub repository and push.
2. **Vercel**: *Add New > Project* > import the repository. Framework: Nuxt (detected). The build command is the `build` script (`prisma generate && nuxt build`).
3. **Environment variables** (Project Settings > Environment Variables, for Production and Preview):
   `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (your final address, e.g. `https://diceroulette.com`), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NUXT_PUBLIC_SITE_URL` (same address as `BETTER_AUTH_URL`).
4. **Database tables in production**: from your computer, with `DATABASE_URL_UNPOOLED` pointing to the production database, run `pnpm prisma migrate deploy`.
5. **Domain**: Project Settings > Domains > add your domain and follow the DNS instructions. Then update `BETTER_AUTH_URL` and `NUXT_PUBLIC_SITE_URL` and redeploy.
6. **Google**: in the OAuth client add the production origin and the redirect URI `https://YOUR-DOMAIN/api/auth/callback/google`. While the Google consent screen is in "Testing" only the test users you add can sign in: publish it to "In production" when you are ready.
7. **Analytics**: Project > Analytics > Enable.
8. **Region**: `vercel.json` already puts the functions in Frankfurt (`fra1`). Create the Neon project in a European region.
9. **Check after deploying** (phone, real URL): the page loads; install it; turn on airplane mode and open it; sign in with Google on two devices and see a table sync; `/sitemap.xml` and `/robots.txt` show your domain; share a table link and import it.
10. **Search engines**: add the site in Google Search Console and submit `/sitemap.xml`.

Before a public launch also check that the name is free: the domain, the trademark offices (EUIPO TMview, USPTO) and a web search for "DiceRoulette". I found at least one small game with a very similar name ("Dice Roulette" on itch.io).

## Español

1. **Git**: `git init`, comprueba que `git status` NO lista `.env`, haz commit, crea un repositorio público en GitHub y sube el código.
2. **Vercel**: *Add New > Project* > importa el repositorio. Framework Nuxt (lo detecta). El comando de build es el script `build` (`prisma generate && nuxt build`).
3. **Variables de entorno** (Project Settings > Environment Variables, en Production y Preview): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (tu dirección final, p. ej. `https://diceroulette.com`), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NUXT_PUBLIC_SITE_URL` (la misma dirección que `BETTER_AUTH_URL`).
4. **Tablas en producción**: desde tu ordenador, con `DATABASE_URL_UNPOOLED` apuntando a la base de producción, ejecuta `pnpm prisma migrate deploy`.
5. **Dominio**: Project Settings > Domains > añade tu dominio y sigue las instrucciones de DNS. Después actualiza `BETTER_AUTH_URL` y `NUXT_PUBLIC_SITE_URL` y vuelve a desplegar.
6. **Google**: en el cliente OAuth añade el origen de producción y la URI de redirección `https://TU-DOMINIO/api/auth/callback/google`. Mientras la pantalla de consentimiento esté en «Testing» solo pueden entrar los usuarios de prueba que añadas: pásala a «In production» cuando quieras abrirlo.
7. **Analítica**: Project > Analytics > Enable.
8. **Región**: `vercel.json` ya pone las funciones en Fráncfort (`fra1`). Crea el proyecto de Neon en una región europea.
9. **Comprueba tras desplegar** (móvil, URL real): carga la página; instálala; activa el modo avión y ábrela; inicia sesión con Google en dos dispositivos y mira cómo se sincroniza una mesa; `/sitemap.xml` y `/robots.txt` muestran tu dominio; comparte una mesa por enlace e impórtala.
10. **Buscadores**: añade el sitio en Google Search Console y envía `/sitemap.xml`.

Antes del lanzamiento público comprueba también que el nombre está libre: el dominio, las oficinas de marcas (EUIPO TMview, USPTO) y una búsqueda web de «DiceRoulette». Encontré al menos un juego pequeño con un nombre casi igual («Dice Roulette» en itch.io).

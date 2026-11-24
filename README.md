# DiceRoulette

Dice, wheels, counters and timers for board games, role-playing games and card games. Mobile first, works offline, and everything can be customized.

> **License: all rights reserved.** The code is public so you can read it. You may not copy, reuse or redistribute it. See [LICENSE](LICENSE).

## Features

- **Tables**: group the dice, wheels, counters and timers of one game. A quick table on the home page works right away.
- **Dice**: any number of faces and dice, custom faces (text + value), groups (1d20 + 2d6), modifiers, operations (sum, highest, lowest...), critical / fumble highlights, difficulty, exclusion (draw without repeats) and history.
- **Wheels**: weighted and colored sectors, exclusion, templates.
- **Counters**: steps, limits, decimals, alerts, hold to repeat, flip 180° for the player in front of you.
- **Timers**: countdown and stopwatch with a visual alert.
- **Share and export**: JSON file or link (the data travels after the `#` and never reaches a server). JSON is size-checked and validated before it is imported.
- **Local first**: everything is saved in the browser (IndexedDB). It works offline and can be installed as an app (PWA). Optional Google account to sync the library between devices.
- 12 languages, dark and light theme, accessible (checked with axe).
- Secure randomness (`crypto.getRandomValues`).

## Stack

Nuxt 4, TypeScript, Vue 3, Nuxt UI, Pinia, Dexie, Zod, `@nuxtjs/i18n`, `@vite-pwa/nuxt`, Prisma 7 + Neon Postgres, Better Auth (Google), Vercel, Vitest.

## Getting started

```bash
pnpm install
cp .env.example .env     # fill it in (only needed for the account / sync)
pnpm dev
```

Without `.env` everything works except the account. See [docs/ACCOUNT_SETUP.md](docs/ACCOUNT_SETUP.md), [docs/LEGAL_CHECKLIST.md](docs/LEGAL_CHECKLIST.md) and [docs/DEPLOY.md](docs/DEPLOY.md).

```bash
pnpm vitest run          # tests
pnpm tsc -p tsconfig.json
pnpm build
```

## Structure

- `shared/`: code with no Vue, used by the app and the server: Zod schemas, roll engine, sharing, sync logic.
- `app/`: the Nuxt app (pages, components, Pinia stores, Dexie database, sync client).
- `server/`: Nitro API (`/api/auth/*`, `/api/sync`) and Prisma.
- `i18n/locales/`: translations. A test checks that every language is complete.

---

# DiceRoulette (Español)

Dados, ruletas, contadores y temporizadores para juegos de mesa, de rol y de cartas. Pensado primero para el móvil, funciona sin conexión y todo es personalizable.

> **Licencia: todos los derechos reservados.** El código es público para que se pueda leer. No se puede copiar, reutilizar ni redistribuir. Ver [LICENSE](LICENSE).

## Funciones

- **Mesas**: agrupan los dados, ruletas, contadores y temporizadores de un juego. La mesa rápida de la página de inicio funciona al instante.
- **Dados**: cualquier número de caras y de dados, caras personalizadas (texto + valor), grupos (1d20 + 2d6), modificadores, operaciones (suma, mayor, menor...), resaltes de crítico y pifia, dificultad, exclusión (sacar sin repetir) e historial.
- **Ruletas**: sectores con pesos y colores, exclusión, plantillas.
- **Contadores**: pasos, límites, decimales, avisos, pulsación larga para repetir y giro de 180° para el jugador de enfrente.
- **Temporizadores**: cuenta atrás y cronómetro con aviso visual.
- **Compartir y exportar**: archivo JSON o enlace (los datos viajan tras el `#` y no llegan a ningún servidor). El JSON se valida y se comprueba su tamaño antes de importarlo.
- **Primero local**: todo se guarda en el navegador (IndexedDB). Funciona sin conexión y se instala como app (PWA). Cuenta opcional de Google para sincronizar la biblioteca entre dispositivos.
- 12 idiomas, tema oscuro y claro, accesible (comprobado con axe).
- Aleatoriedad segura (`crypto.getRandomValues`).

## Cómo empezar

```bash
pnpm install
cp .env.example .env     # rellénalo (solo hace falta para la cuenta / sincronización)
pnpm dev
```

Sin `.env` todo funciona salvo la cuenta. Mira [docs/ACCOUNT_SETUP.md](docs/ACCOUNT_SETUP.md), [docs/LEGAL_CHECKLIST.md](docs/LEGAL_CHECKLIST.md) y [docs/DEPLOY.md](docs/DEPLOY.md).

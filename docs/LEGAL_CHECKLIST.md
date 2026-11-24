# Legal checklist / Lista legal

Not legal advice. These texts are a solid starting point for a free personal project; have a professional review them before you add ads, payments or a company.
No es asesoramiento legal. Son un buen punto de partida para un proyecto personal gratuito; que los revise un profesional antes de añadir publicidad, pagos o una empresa.

## Before publishing / Antes de publicar

1. `app/utils/legal.ts`: change `contactEmail` to a real address (it appears in the privacy page and the terms). Cambia `contactEmail` por un correo real.
2. Install the statistics package / Instala el paquete de estadísticas: `pnpm add @vercel/analytics@2.0.1` (pnpm may warn about optional peer dependencies like next or svelte: ignore it).
3. In Vercel: your project > **Analytics** > Enable Web Analytics. It is cookieless, so no cookie banner is needed.
4. Keep the data in the EU / Mantén los datos en la UE: create the Neon project in a European region (for example AWS Frankfurt) and set the Vercel function region to Frankfurt (`fra1`, in Project Settings > Functions).
5. Read both texts (`app/utils/legalText.ts`) and check they match what you actually do. The privacy text says: no ads, cookieless statistics, Google sign-in, Vercel + Neon + Google as processors, under-14 not allowed, rights via the account panel or your email.

## If something changes / Si algo cambia

- **Ads or Google Analytics**: they need a consent banner (accept/reject with equal weight, nothing loaded before accepting) and an updated privacy text.
- **Another login provider or new data**: update the "With an account" section.
- Update `updated` in `app/utils/legal.ts` every time you change the texts.

## What needs no banner / Qué no necesita banner

Strictly necessary storage: your tables in IndexedDB, theme/language/screen-on choices, the offline app cache and the sign-in session cookie.

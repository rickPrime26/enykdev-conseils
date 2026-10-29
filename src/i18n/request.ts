// ===========================================================================
// FILE:  i18n/request.ts
// ROLE:  Load the right message file for the request being served.
//
// WHEN THIS RUNS
//   Once per request, on the server, before any component renders. Whatever
//   it returns is what useTranslations() reads from — on the server directly,
//   and in Client Components through the provider that NextIntlClientProvider
//   sets up in the layout.
//
// WHY THE IMPORT IS DYNAMIC
//   `await import(...)` with a variable in the path means only the requested
//   language is loaded. A static import of both files would ship English
//   strings to every French visitor — small today, less so when the audit
//   report has three hundred keys.
// ===========================================================================

import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // requestLocale is a promise: Next.js resolves the [locale] segment
  // asynchronously, because a middleware upstream may still rewrite it.
  const requested = await requestLocale;

  // A URL can carry anything — /de/factures, /xx/factures. Falling back
  // rather than trusting the segment avoids an import of a file that does
  // not exist, which would be a 500 instead of a page in the wrong language.
  let locale: string;

  if (requested && routing.locales.includes(requested as 'fr' | 'en')) {
    locale = requested;
  } else {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

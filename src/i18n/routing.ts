// ===========================================================================
// FILE:  i18n/routing.ts
// ROLE:  Which languages exist, and which one is used when none is asked for.
//
// WHY THE LOCALE LIVES IN THE URL
//   /fr/factures/nouvelle and /en/factures/nouvelle are two real addresses.
//   That matters for a document you send to a client: the audit report link
//   carries its own language, so a landlord who opens it in English does not
//   get French because of a cookie set on your machine.
//
//   It also means a Server Component knows the language before rendering —
//   no flash of the wrong language, nothing to hydrate.
//
// WHY FRENCH IS THE DEFAULT
//   Gatineau is majority francophone, and the first targets are Quebec
//   daycares and residences. English is not an afterthought — it is the
//   Ottawa side of the river, and it is required — but a visitor with no
//   preference is more likely to want French.
// ===========================================================================

import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['fr', 'en'],
  defaultLocale: 'fr',

  // 'always' means /fr/... is written out even for the default language.
  //
  // The alternative, 'as-needed', serves French at /factures/nouvelle and
  // English at /en/factures/nouvelle. Shorter, but it creates two shapes of
  // URL for the same page — and anything that builds links by hand has to
  // know which case it is in. One rule is worth the four extra characters.
  localePrefix: 'always',
});

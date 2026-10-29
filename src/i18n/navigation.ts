// ===========================================================================
// FILE:  i18n/navigation.ts
// ROLE:  Locale-aware replacements for Link, redirect, useRouter and
//        usePathname.
//
// WHY THE NEXT.JS ONES ARE NOT ENOUGH
//   With localePrefix: 'always', every real URL starts with /fr or /en.
//
//     <Link href="/factures">        → /factures     → 404
//     <Link href="/factures">        → /fr/factures  ← with this file
//
//   The wrappers below read the current locale and prepend it. So you keep
//   writing paths WITHOUT the language, and the language follows the user.
//
// THE RULE
//   Everywhere in the app, import Link, redirect, useRouter and usePathname
//   from '@/i18n/navigation' — never from 'next/link' or 'next/navigation'.
//
//   Forgetting once gives a 404 that only shows up in the other language,
//   which is exactly the kind of bug nobody finds before a client does.
//
//   usePathname here also STRIPS the prefix: on /fr/factures it returns
//   /factures. That is what app-nav needs — otherwise every startsWith()
//   test would have to know the current language.
// ===========================================================================

import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

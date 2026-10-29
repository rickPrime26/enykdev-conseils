// ===========================================================================
// FILE:  middleware.ts
// ROLE:  Put a language in front of every URL.
//
// WHAT IT ACTUALLY DOES
//   Someone hits /factures/nouvelle with no language. The middleware reads
//   their Accept-Language header, picks fr or en, and redirects to
//   /fr/factures/nouvelle. From then on the segment is in the address bar
//   and every link keeps it.
//
// WHERE THIS FILE HAS TO LIVE
//   src/middleware.ts, next to app/ — not inside app/. Next.js looks for it
//   at the root of the source directory and nowhere else. Put it one level
//   off and it silently never runs.
//
// LATER: THIS IS WHERE THE AUTH GUARD GOES
//   The middleware sees every request before any page renders, which makes
//   it the right place to bounce someone without a cookie to /login — rather
//   than letting a Server Component fetch, get a 401, and throw.
//
//   Not now: it would need to know which routes are public, and /login and
//   /changer-mot-de-passe both are. Worth doing once the screens settle.
// ===========================================================================

import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Which paths the middleware runs on.
  //
  //   (?!...)  is a negative lookahead — "match anything NOT followed by
  //            one of these".
  //
  // Excluded on purpose:
  //   api        no language prefix on API routes
  //   _next      the build output; prefixing it would break every asset
  //   _vercel    platform internals
  //   .*\\..*    anything with a dot, so favicon.ico and images are served
  //              as-is rather than redirected to /fr/favicon.ico
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};

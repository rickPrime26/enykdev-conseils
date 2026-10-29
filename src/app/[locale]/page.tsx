// ===========================================================================
// FILE:  app/page.tsx
// ROLE:  The root URL. Sends you where the work actually happens.
//
// WHY A REDIRECT RATHER THAN A HOME PAGE
//   This is an internal tool with one user. A landing page with a welcome
//   message would be one click between you and the only screen you came for.
//
//   When the dashboard exists — the matching queue, recent invoices — this
//   file becomes that page instead.
//
// redirect() THROWS ON PURPOSE
//   It is not a normal function that returns. Next.js implements it by
//   throwing a special error it catches upstream to emit the HTTP redirect.
//   So nothing after this line ever runs, and there is no return statement.
// ===========================================================================

// redirect from @/i18n/navigation, not next/navigation: it keeps the locale,
// so a visitor on /fr lands on /fr/factures/nouvelle rather than a 404.
import { redirect } from '@/i18n/navigation';

export default async function RootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: '/factures/nouvelle', locale });
}

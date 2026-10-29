// ===========================================================================
// FILE:  app/[locale]/layout.tsx
// ROLE:  The <html> shell. Now the only layout that renders it, because
//        every route lives under a language segment.
//
// WHY <html lang> MATTERS
//   It used to be hardcoded to "en" while the interface was in French. That
//   is not cosmetic: screen readers pick their pronunciation from it, and it
//   tells the browser which language to offer to translate from.
//
// NextIntlClientProvider
//   Server Components read translations directly. Client Components cannot —
//   they run in the browser, where nothing loaded the message file.
//
//   The provider serialises the messages into the HTML so that a 'use client'
//   component calling useTranslations() finds them. That is why login and
//   the invoice form work at all.
//
// setRequestLocale
//   Tells next-intl which language this render is for, so pages underneath
//   can stay statically renderable. Without it, anything calling
//   useTranslations() forces dynamic rendering on every request.
// ===========================================================================

import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import '../globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Jambo',
  description: "Agent d'achat — audit de factures",
};

/**
 * Builds /fr and /en at build time instead of on first visit.
 *
 * Two languages, so two versions of every static page. It costs nothing here
 * and it means the first visitor does not wait for a render.
 */
export function generateStaticParams() {
  return routing.locales.map((locale) => {
    return { locale };
  });
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // params is a promise in Next 15+. Awaiting it is not optional.
  const { locale } = await params;

  // /de/factures would otherwise try to import messages/de.json and crash
  // with a module error. A 404 is the honest answer: that page does not exist.
  if (!routing.locales.includes(locale as 'fr' | 'en')) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}

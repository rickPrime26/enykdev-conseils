// ===========================================================================
// FILE:  components/app-nav.tsx
// ROLE:  La navigation de l'outil opérateur. Barre horizontale, cinq liens.
//
// POURQUOI PAS UNE BARRE LATÉRALE
//   Un outil de saisie a besoin de LARGEUR. Un tableau de lignes de facture
//   porte sept colonnes ; une barre latérale de 240 px les comprime pour
//   afficher cinq liens qu'on connaît par cœur au bout de deux jours.
//
// 'use client' — POURQUOI CE FICHIER EN A BESOIN
//   usePathname lit l'URL courante pour souligner le lien actif. C'est une
//   information qui n'existe que dans le navigateur, donc ce composant doit
//   s'exécuter côté client.
//
//   Le layout qui l'entoure reste un Server Component : seule cette barre
//   traverse la frontière, pas les pages.
// ===========================================================================

'use client';

import { useTranslations } from 'next-intl';
// Link and usePathname from @/i18n/navigation, not next/*. Link prepends the
// locale; usePathname STRIPS it, so the startsWith tests below never have to
// know which language is showing.
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

interface NavLink {
  href: string;
  /** Key under "nav" in messages/*.json, not the visible text. */
  key: string;
}

const LINKS: NavLink[] = [
  { href: '/', key: 'home' },
  { href: '/factures', key: 'invoices' },
  { href: '/arbitrage', key: 'matching' },
  { href: '/produits', key: 'products' },
  { href: '/membres', key: 'members' },
];

export function AppNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <header className="border-b">
      <nav className="mx-auto flex h-14 max-w-7xl items-center gap-1 px-4">
        <span className="mr-6 font-semibold tracking-tight">
          {t('brand')}
        </span>

        {LINKS.map((link) => {
          // L'accueil ne doit s'allumer que sur "/" exactement, sinon il
          // resterait actif sur toutes les pages — toute URL commence par "/".
          let isActive: boolean;

          if (link.href === '/') {
            isActive = pathname === '/';
          } else {
            isActive = pathname.startsWith(link.href);
          }

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive
                  ? 'bg-muted font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(link.key)}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}

// ===========================================================================
// FILE:  app/(app)/layout.tsx
// ROLE:  La coquille de l'outil opérateur. Navigation + emplacement de page.
//
// CE QUE LES PARENTHÈSES VEULENT DIRE
//   (app) est un GROUPE DE ROUTES. Les parenthèses disent à Next.js :
//   regroupe ces fichiers sous un layout commun, mais NE METS PAS "app" dans
//   l'URL.
//
//     app/(app)/page.tsx            sert  /
//     app/(app)/factures/page.tsx   sert  /factures
//
//   Plus tard, app/(membre)/ aura son propre layout — un espace client avec
//   une autre navigation — sans que rien n'apparaisse dans l'adresse.
//
// CE QU'EST UN LAYOUT
//   Il enveloppe chaque page en dessous de lui. Il se monte une fois et reste
//   monté pendant que les pages changent : la navigation ne clignote pas
//   quand on passe de Factures à Arbitrage.
//
// SERVER COMPONENT PAR DÉFAUT
//   Ce fichier n'a pas 'use client', donc il s'exécute sur le serveur. Seul
//   AppNav traverse la frontière, parce qu'il lit l'URL courante.
// ===========================================================================

import { AppNav } from '@/components/app-nav';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <AppNav />

      {/* max-w-7xl et non w-full : au-delà d'environ 1280 px, une ligne de
          tableau devient trop longue pour que l'œil suive de la première
          colonne à la dernière. */}
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}

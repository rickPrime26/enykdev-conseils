// ===========================================================================
// FILE:  app/(app)/factures/nouvelle/page.tsx
// ROLE:  Saisir une facture reçue par un membre. L'écran du quotidien.
//
// LE DÉCOUPAGE SERVEUR / CLIENT
//   Cette page est un SERVER COMPONENT : elle s'exécute sur le serveur
//   Next.js, va chercher les membres et les distributeurs, et n'envoie au
//   navigateur que du HTML déjà rempli.
//
//   Le formulaire, lui, est un CLIENT COMPONENT : il a besoin d'état — les
//   lignes qu'on ajoute, les champs qu'on remplit — donc il doit vivre dans
//   le navigateur.
//
//   Pourquoi séparer plutôt que tout mettre client : les deux listes ne
//   changent pas pendant la saisie. Les charger sur le serveur évite deux
//   allers-retours au chargement de la page, et le formulaire s'affiche déjà
//   rempli plutôt que vide puis peuplé.
//
// getServerCookie()
//   Un Server Component tourne sur le serveur Next.js, où il n'y a pas de
//   navigateur, donc pas de bocal à cookies. credentials: 'include' n'y fait
//   rien. Il faut lire les cookies de la requête entrante et les transmettre
//   à la main.
// ===========================================================================

import { getTranslations, setRequestLocale } from 'next-intl/server';
import { apiGet, getServerCookie } from '@/lib/api';
import type { Member, Distributor, Product } from '@/lib/types';
import { InvoiceForm } from '@/components/invoice-form';

export default async function NouvelleFacturePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  // A Server Component gets its translations from getTranslations, not the
  // useTranslations hook — hooks only exist in Client Components.
  //
  // setRequestLocale keeps the page statically renderable; without it,
  // reading translations forces a dynamic render on every request.
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('invoiceEntry');

  const cookie = await getServerCookie();

  // Promise.all fires all three requests IN PARALLEL. Written as three
  // separate awaits, each would wait for the previous one for no reason —
  // they do not depend on each other.
  const [members, distributors, products] = await Promise.all([
    apiGet<Member[]>('/members', cookie),
    apiGet<Distributor[]>('/distributors', cookie),
    apiGet<Product[]>('/products/me', cookie),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t('title')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
      </div>

      <InvoiceForm
        members={members}
        distributors={distributors}
        products={products}
      />
    </div>
  );
}

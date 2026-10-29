// ===========================================================================
// FILE:  lib/format.ts
// ROLE:  Transformer les valeurs de l'API en quelque chose qu'un humain lit.
//        Français par défaut — Gatineau est majoritairement francophone.
//
// LA RÈGLE QUE CE FICHIER FAIT RESPECTER : JAMAIS D'ARITHMÉTIQUE D'ARGENT
// EN JAVASCRIPT.
//
//   Les prix arrivent en chaînes ("140.00") parce que NUMERIC est du décimal
//   exact et qu'un number JS ne l'est pas.
//
//   Et le piège n'est pas la comparaison, c'est l'ADDITION :
//     "48.00" + "52.50"  donne  "48.0052.50"
//   Seul + se comporte comme ça. ×, − et / convertissent tout seuls, donc le
//   code marche jusqu'au jour où on fait une somme.
//
//   Tout ce qui suit CONVERTIT POUR L'AFFICHAGE SEULEMENT. Dès qu'il faut une
//   somme, un total ou un pourcentage, on le demande à l'API — le backend
//   calcule en SQL, où l'arithmétique est exacte.
// ===========================================================================

import type {
  Numeric,
  IsoDate,
  DateOnly,
  MatchStatus,
  InvoiceStatus,
  UseUnit,
} from './types';

export type Locale = 'fr-CA' | 'en-CA';

// --- argent -----------------------------------------------------------------

/**
 * "3.50" → "3,50 $". Prend la chaîne brute de l'API, sans pré-conversion.
 */
export function formatMoney(value: Numeric, locale: Locale = 'fr-CA'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'CAD',
  }).format(Number(value));
}

/**
 * Le coût par unité d'usage : "0,0120 $ / feuille".
 *
 * QUATRE DÉCIMALES, et ce n'est pas cosmétique. Un coût par feuille vaut de
 * l'ordre de 0,012 $. Arrondi au centime, il afficherait « 0,01 $ » pour
 * 0,0120 comme pour 0,0149 — soit 24 % d'écart devenu invisible. C'est
 * précisément l'écart que Jambo existe pour montrer.
 */
export function formatCostPerUseUnit(
  value: Numeric | null,
  useUnit: UseUnit | null,
  locale: Locale = 'fr-CA',
): string {
  if (value === null) {
    return '—';
  }

  const amount = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(Number(value));

  if (useUnit === null) {
    return amount;
  }

  return `${amount} / ${useUnitLabel(useUnit, locale)}`;
}

/** "140.00" → "140". Enlève les zéros inutiles. */
export function formatQuantity(
  value: Numeric,
  locale: Locale = 'fr-CA',
): string {
  const n = Number(value);
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
}

/**
 * Le facteur de substitution : "40,1×".
 *
 * Une décimale suffit. « 40,15× » suggère une précision que l'estimation de
 * consommation annuelle ne porte pas.
 */
export function formatFactor(value: number, locale: Locale = 'fr-CA'): string {
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
  return `${formatted}×`;
}

// --- dates ------------------------------------------------------------------

/** "2026-09-05" → "5 septembre 2026". */
export function formatDate(
  value: IsoDate | DateOnly,
  locale: Locale = 'fr-CA',
): string {
  // Une date seule ("2026-09-05") est interprétée en UTC par new Date, ce qui
  // la décale d'un jour vers l'arrière dans les fuseaux à l'ouest de
  // Greenwich — Gatineau est à UTC−4 ou −5. On ajoute donc l'heure locale
  // pour que le 5 reste le 5.
  const iso = value.length === 10 ? `${value}T12:00:00` : value;

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso));
}

/** "2026-09-05" → "05/09/2026". Pour les tableaux denses. */
export function formatDateShort(
  value: IsoDate | DateOnly,
  locale: Locale = 'fr-CA',
): string {
  const iso = value.length === 10 ? `${value}T12:00:00` : value;

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso));
}

// --- vocabulaire ------------------------------------------------------------

/**
 * Les unités d'usage sont du vocabulaire de base, pas d'utilisateur.
 * 'litre_ready' ne veut rien dire pour un opérateur pressé.
 */
export function useUnitLabel(
  useUnit: UseUnit,
  locale: Locale = 'fr-CA',
): string {
  const fr = locale === 'fr-CA';

  switch (useUnit) {
    case 'sheet':
      return fr ? 'feuille' : 'sheet';
    case 'roll':
      return fr ? 'rouleau' : 'roll';
    case 'litre_ready':
      return fr ? 'litre prêt' : 'ready litre';
    case 'wash':
      return fr ? 'lavage' : 'wash';
    case 'wipe':
      return fr ? 'lingette' : 'wipe';
    case 'unit':
      return fr ? 'unité' : 'unit';
  }
}

/**
 * Le statut de rapprochement, dit du point de vue du GESTE À FAIRE.
 *
 * 'ambiguous' et 'unmatched' ont le même product_id null, mais demandent deux
 * actions très différentes : choisir dans une liste (5 secondes) ou créer un
 * produit au catalogue (5 minutes, parfois un appel au fabricant).
 */
export function matchStatusLabel(
  status: MatchStatus,
  locale: Locale = 'fr-CA',
): string {
  const fr = locale === 'fr-CA';

  switch (status) {
    case 'pending':
      return fr ? 'à traiter' : 'pending';
    case 'matched':
      return fr ? 'rapprochée' : 'matched';
    case 'ambiguous':
      return fr ? 'à choisir' : 'choose one';
    case 'unmatched':
      return fr ? 'produit absent' : 'product missing';
  }
}

/** La couleur du badge, par statut. Rouge pour ce qui coûte du temps. */
export function matchStatusTone(
  status: MatchStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'matched':
      return 'default';
    case 'ambiguous':
      return 'secondary';
    case 'unmatched':
      return 'destructive';
    case 'pending':
      return 'outline';
  }
}

export function invoiceStatusLabel(
  status: InvoiceStatus,
  locale: Locale = 'fr-CA',
): string {
  const fr = locale === 'fr-CA';

  switch (status) {
    case 'draft':
      return fr ? 'saisie en cours' : 'draft';
    case 'submitted':
      return fr ? 'saisie complète' : 'submitted';
    case 'matched':
      return fr ? 'rapprochée' : 'matched';
  }
}

/**
 * La confiance du rapprochement : "95 %".
 *
 * Sert à trier la file d'arbitrage — les cas presque sûrs d'abord, ils se
 * traitent d'un coup d'œil.
 */
export function formatConfidence(
  value: Numeric | null,
  locale: Locale = 'fr-CA',
): string {
  if (value === null) {
    return '—';
  }

  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

// --- erreurs ---------------------------------------------------------------
//
// errorMessage() vivait ici. Supprimée : elle faisait en TypeScript ce que
// messages/*.json fait maintenant, avec un paramètre locale que personne ne
// passait — deux endroits à tenir à jour pour une seule chose.
//
// À la place, dans un composant :
//
//   const t = useTranslations();
//
//   if (t.has(`errors.${err.code}`)) {
//     setError(t(`errors.${err.code}`));
//   } else {
//     setError(t('errors.unknown', { code: err.code }));
//   }
//
// t.has() évite qu'un code d'API non traduit fasse planter le rendu : une
// traduction manquante doit dégrader, pas casser.

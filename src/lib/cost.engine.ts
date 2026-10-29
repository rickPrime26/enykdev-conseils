// ===========================================================================
// FILE:  lib/cost.engine.ts
// ROLE:  Le calcul du coût par unité d'usage, côté navigateur.
//
// ⚠ CE FICHIER EST UNE COPIE DÉLIBÉRÉE
//   L'original vit dans jambo-api/src/pricing/cost.engine.ts.
//
//   POURQUOI DUPLIQUER PLUTÔT QUE PARTAGER
//     Le brief §3 exige que cost_per_use_unit s'affiche À CÔTÉ DE LA LIGNE
//     PENDANT LA SAISIE — « c'est comme ça que tu vois l'erreur avant de la
//     sauvegarder ». Une mauvaise unité produit une erreur de 1 000×.
//
//     Appeler l'API à chaque frappe défait l'intérêt : latence, et on ne voit
//     rien « pendant ». Un paquet partagé demanderait un monorepo, du build et
//     de la configuration pour deux fonctions.
//
//   CE QUI REND LA DUPLICATION SÛRE
//     Les MÊMES quatre vecteurs de test tournent des deux côtés. Si une copie
//     dérive, un test tombe. Sans ces tests, cette duplication serait une
//     dette silencieuse — avec eux, c'est un choix.
//
//   RÈGLE : toute modification ici se fait AUSSI dans jambo-api, et
//   inversement. Les deux .spec.ts doivent rester identiques.
// ===========================================================================

export type DilutionBasis = 'parts_water' | 'total_parts';

export type UseUnit =
  | 'sheet'
  | 'roll'
  | 'litre_ready'
  | 'wash'
  | 'wipe'
  | 'unit';

export interface PackSpec {
  /** Nombre d'unités de vente dans le format. Une caisse de 16 rouleaux : 16. */
  packQuantity: number;
  /** Taille d'une unité de vente. Un rouleau de 250 feuilles : 250. */
  unitSize: number;
  isConcentrate: boolean;
  /** 64 pour un ratio 1:64. Obligatoire si isConcentrate. */
  dilutionRatio?: number | null;
  /** Obligatoire si isConcentrate. Jamais devinée. */
  dilutionBasis?: DilutionBasis | null;
}

/** Levée quand un concentré arrive sans sa base de dilution. */
export class MissingDilutionBasisError extends Error {
  constructor() {
    super(
      "Un concentré exige dilutionRatio ET dilutionBasis. La base ne se " +
        "devine jamais : « 1:64 » vaut 65 parts en parts_water et 64 en " +
        'total_parts.',
    );
    this.name = 'MissingDilutionBasisError';
  }
}

// ---------------------------------------------------------------------------
// useUnitsPerPack — combien d'unités d'usage un format contient réellement
//
//   Prêt à l'emploi : 16 × 250            = 4000 feuilles
//   Concentré 1:64  : 4 × 1 × (64 + 1)    = 260 litres prêts
//
// LE +1 EST LE PIÈGE LE PLUS FACILE DU PROJET.
//   En parts_water, une part de concentré PLUS 64 parts d'eau donnent 65
//   parts de solution, pas 64. Sans lui, le facteur de substitution tombe de
//   40,15× à 39,53× — hors tolérance, et chaque rapport devient faux de 1,5 %.
// ---------------------------------------------------------------------------
export function useUnitsPerPack(spec: PackSpec): number {
  if (spec.packQuantity <= 0 || spec.unitSize <= 0) {
    throw new Error('packQuantity et unitSize doivent être strictement positifs.');
  }

  const base = spec.packQuantity * spec.unitSize;

  if (spec.isConcentrate === false) {
    return base;
  }

  if (
    spec.dilutionRatio === undefined ||
    spec.dilutionRatio === null ||
    spec.dilutionBasis === undefined ||
    spec.dilutionBasis === null
  ) {
    throw new MissingDilutionBasisError();
  }

  if (spec.dilutionRatio <= 0) {
    throw new Error('dilutionRatio doit être strictement positif.');
  }

  let multiplier: number;

  if (spec.dilutionBasis === 'parts_water') {
    multiplier = spec.dilutionRatio + 1;
  } else {
    multiplier = spec.dilutionRatio;
  }

  return base * multiplier;
}

// ---------------------------------------------------------------------------
// costPerUseUnit — le seul chiffre comparable du système (règle R4)
//
//   packPrice        le prix du FORMAT, tel qu'il figure sur la facture
//   useUnitsInPack   le résultat de useUnitsPerPack
//
// Comparer deux packPrice est un bug métier : 42 $ contre 68 $ ne dit rien,
// 10,50 $ contre 0,26 $ par litre prêt dit tout.
// ---------------------------------------------------------------------------
export function costPerUseUnit(
  packPrice: number,
  useUnitsInPack: number,
): number {
  if (useUnitsInPack <= 0) {
    throw new Error(
      'useUnitsInPack doit être strictement positif — division impossible.',
    );
  }

  if (packPrice < 0) {
    throw new Error('packPrice ne peut pas être négatif.');
  }

  return packPrice / useUnitsInPack;
}

// ---------------------------------------------------------------------------
// safeCostPerUseUnit — la variante qui ne lève pas
//
// Pendant la saisie, les champs sont incomplets à chaque frappe. Une
// exception à chaque caractère tapé rendrait le formulaire inutilisable.
//
// Cette variante rend null quand le calcul n'est pas encore possible, et
// l'écran affiche « — » au lieu d'un chiffre. C'est la seule différence avec
// la version de jambo-api, qui n'en a pas besoin : elle reçoit des données
// déjà validées.
// ---------------------------------------------------------------------------
export function safeCostPerUseUnit(
  packPrice: number | null,
  spec: Partial<PackSpec>,
): number | null {
  if (packPrice === null || packPrice < 0) {
    return null;
  }

  if (!spec.packQuantity || !spec.unitSize) {
    return null;
  }

  try {
    const units = useUnitsPerPack({
      packQuantity: spec.packQuantity,
      unitSize: spec.unitSize,
      isConcentrate: spec.isConcentrate ?? false,
      dilutionRatio: spec.dilutionRatio ?? null,
      dilutionBasis: spec.dilutionBasis ?? null,
    });

    return costPerUseUnit(packPrice, units);
  } catch {
    // Concentré incomplet, format invalide. On n'affiche rien plutôt qu'un
    // chiffre faux — c'est le principe du projet.
    return null;
  }
}

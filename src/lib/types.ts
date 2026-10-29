// ===========================================================================
// FILE:  lib/types.ts
// ROLE:  Les formes que l'API renvoie réellement. Écrites à la main pour
//        refléter le backend — il n'y a aucune génération de code entre les
//        deux, donc quand une réponse de jambo-api change, ce fichier change.
//
// LA RÈGLE QUI COMPTE : L'ARGENT ARRIVE EN CHAÎNE DE CARACTÈRES.
//
//   Les colonnes NUMERIC de Postgres reviennent en string, volontairement.
//   NUMERIC(12,4) est de l'arithmétique décimale exacte ; un number
//   JavaScript est un flottant et ne peut pas représenter un décimal
//   exactement — 0,1 + 0,2 donne bien 0.30000000000000004.
//
//   Et le piège n'est pas la comparaison, c'est l'ADDITION : "48.00" + "52.50"
//   donne "48.0052.50", pas 100,50. Seul + se comporte comme ça ; ×, − et /
//   convertissent tout seuls. Donc le code marche jusqu'au jour où on fait
//   une somme.
//
//   Typer ces champs en `string` n'est pas de la négligence : c'est le
//   système de types qui refuse qu'on additionne deux montants dans un
//   composant. On formate pour l'affichage, et on laisse Postgres calculer.
//
// SNAKE_CASE ASSUMÉ
//   Ce sont des lignes de base brutes, renvoyées telles quelles par l'API.
//   Les renommer ici demanderait une couche de traduction sans bénéfice.
// ===========================================================================

// --- partagé ---------------------------------------------------------------

/** Un NUMERIC Postgres tel qu'il arrive, par exemple "0.012000". */
export type Numeric = string;

/** Un horodatage ISO 8601, par exemple "2026-09-21T08:47:48.457Z". */
export type IsoDate = string;

/** Une date seule, par exemple "2026-09-05". */
export type DateOnly = string;

/**
 * 'producer' est la valeur historique du modèle revendeur. Les dossiers et
 * classes ont été renommés en manufacturers, mais la valeur en base porte
 * encore ce nom — la changer invaliderait les JWT en cours.
 */
export type UserRole = 'buyer' | 'producer' | 'admin';

// --- authentification -------------------------------------------------------

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  must_change_password: boolean;
}

export interface LoginBody {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
}

// --- membres ----------------------------------------------------------------

/** Où en est le membre dans le cycle commercial. */
export type MemberStatus = 'prospect' | 'audited' | 'member' | 'churned';

/** B7 — un site sous le plancher de son secteur est candidat au libre-service. */
export type ServiceTier = 'managed' | 'self_serve';

/** B4 — une capacité déclarée par le membre n'est pas un fait vérifié. */
export type CapacitySource = 'ministere' | 'declare' | 'verifie';

export interface Member {
  id: number;
  name: string;
  city: string | null;
  province: string;
  sector_id: number | null;
  member_type_id: number | null;
  /** Places, unités, logements — selon le secteur. */
  capacity: number | null;
  capacity_source: CapacitySource | null;
  group_id: number | null;
  status: MemberStatus;
  service_tier: ServiceTier;
  joined_at: DateOnly | null;
  notes: string | null;
}

// --- fabricants et distributeurs --------------------------------------------

export interface Manufacturer {
  id: number;
  name: string;
  city: string | null;
}

/**
 * A4 — trois rôles, deux porteurs de grille.
 *
 * 'retailer' (Costco, Walmart) pratique un prix uniforme : aucun mécanisme de
 * prix contractuel. C'est une source d'observation de prix légitime, jamais
 * un porteur de grille.
 */
export type DistributorRole = 'distributor' | 'retailer';

export type OrderMethod = 'email' | 'phone' | 'portal' | 'edi';

export interface Distributor {
  id: number;
  name: string;
  role: DistributorRole;
  city: string | null;
  order_email: string | null;
  order_method: OrderMethod;
  notes: string | null;
}

// --- produits ---------------------------------------------------------------

/**
 * L'unité dans laquelle un produit est CONSOMMÉ, pas vendu.
 *
 * Un concentré se vend au litre et se consomme en litres prêts. C'est cette
 * différence que tout le système existe pour capturer.
 */
export type UseUnit =
  | 'sheet'
  | 'roll'
  | 'litre_ready'
  | 'wash'
  | 'wipe'
  | 'unit';

export type UnitSizeUom = 'sheet' | 'roll' | 'ml' | 'l' | 'g' | 'kg' | 'unit';

/**
 * « 1:64 » est ambigu dans l'industrie, et l'écart n'est pas anodin :
 *   parts_water  1 part de concentré PLUS 64 d'eau   = 65 parts
 *   total_parts  1 part de concentré DANS 64 au total = 64 parts
 * Le facteur de substitution passe de 40,15× à 39,53× — hors tolérance.
 */
export type DilutionBasis = 'parts_water' | 'total_parts';

export interface Product {
  id: number;
  manufacturer_id: number | null;
  name: string;
  /** Le code lisible, pas l'identifiant : l'API résout la traduction. */
  category: string | null;
  manufacturer_sku: string | null;

  pack_description: string | null;
  pack_quantity: Numeric | null;
  unit_size: Numeric | null;
  unit_size_uom: UnitSizeUom | null;

  is_concentrate: boolean;
  dilution_ratio: Numeric | null;
  dilution_basis: DilutionBasis | null;

  use_unit: UseUnit | null;
  /** Le dénominateur du coût par unité d'usage. 16 × 250 = 4000 feuilles. */
  use_units_per_pack: Numeric | null;

  /** Santé Canada. Règle non négociable : jamais de substitut sans DIN
   *  pour un produit qui en a un. */
  din: string | null;
  ecologo: boolean;

  is_active: boolean;
}

export interface CreateProductBody {
  name: string;
  category: string;
  manufacturerId?: number;
  manufacturerSku?: string;
  packDescription: string;
  packQuantity: number;
  unitSize: number;
  unitSizeUom: UnitSizeUom;
  isConcentrate: boolean;
  dilutionRatio?: number;
  dilutionBasis?: DilutionBasis;
  useUnit: UseUnit;
  din?: string;
  ecologo?: boolean;
}

// --- factures ---------------------------------------------------------------

/** L'avancement de la SAISIE chez Jambo, jamais du paiement (règle R1). */
export type InvoiceStatus = 'draft' | 'submitted' | 'matched';

/**
 * Trois issues, pas deux. ambiguous et unmatched partagent product_id null
 * mais demandent deux gestes différents à l'opérateur :
 *   ambiguous → le produit est au catalogue, il choisit dans la liste
 *   unmatched → le produit manque, il faut le créer
 */
export type MatchStatus = 'pending' | 'matched' | 'ambiguous' | 'unmatched';

export interface InvoiceLine {
  id: number;
  invoice_id: number;

  /** Le libellé EXACT de la facture, fautes comprises. */
  raw_label: string;
  normalized_label: string | null;
  distributor_sku: string | null;

  /** Nombre de FORMATS achetés. 3 caisses, pas 3 feuilles. */
  quantity: Numeric;
  /** Le prix d'UN format. Jamais un prix unitaire — voir R4. */
  pack_price: Numeric;
  line_total: Numeric | null;

  product_id: number | null;
  match_status: MatchStatus;
  match_confidence: Numeric | null;
  matched_manually: boolean;

  /** pack_price / use_units_per_pack. Le seul chiffre comparable. */
  cost_per_use_unit: Numeric | null;

  // Ajoutés par la jointure côté API, absents de la table.
  product_name?: string | null;
  product_pack_description?: string | null;
}

export interface Invoice {
  id: number;
  member_id: number;
  distributor_id: number;
  invoice_number: string;
  invoice_date: DateOnly;
  status: InvoiceStatus;
  subtotal: Numeric | null;
  currency: string;
  notes: string | null;

  // Ajoutés par la jointure.
  member_name?: string;
  distributor_name?: string;
}

/** Ce que findOne renvoie : l'en-tête et ses lignes. */
export interface InvoiceWithLines extends Invoice {
  lines: InvoiceLine[];
}

/** Ce que findForMember renvoie : l'en-tête et deux compteurs. */
export interface InvoiceSummary extends Invoice {
  line_count: string;
  lines_to_review: string;
}

/** Une ligne de la file d'arbitrage, avec son contexte. */
export interface PendingLine extends InvoiceLine {
  invoice_number: string;
  invoice_date: DateOnly;
  member_name: string | null;
  distributor_name: string | null;
}

// --- création d'une facture -------------------------------------------------

export interface CreateInvoiceLineBody {
  rawLabel: string;
  distributorSku?: string;
  quantity: number;
  packPrice: number;
  lineTotal?: number;
}

export interface CreateInvoiceBody {
  memberId: number;
  distributorId: number;
  invoiceNumber: string;
  /** Format ISO : "2026-09-05". */
  invoiceDate: string;
  subtotal?: number;
  notes?: string;
  lines: CreateInvoiceLineBody[];
}

/** L'arbitrage humain. productId null = « aucun produit ne correspond ». */
export interface MatchLineBody {
  productId: number | null;
  /** Vrai par défaut. Un refus explicite empêche d'apprendre un alias
   *  ambigu, qui contaminerait tous les rapprochements suivants. */
  learnAlias?: boolean;
}

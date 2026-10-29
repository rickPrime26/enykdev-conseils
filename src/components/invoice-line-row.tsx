

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type {
  Product,
  UnitSizeUom,
  UseUnit,
  DilutionBasis,
  CreateProductBody,
} from '@/lib/types';
import { apiPost, ApiError } from '@/lib/api';
import { safeCostPerUseUnit } from '@/lib/cost.engine';
import { formatCostPerUseUnit } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { error } from 'console';

/** A line as it is being typed. Every field is a string — a form input
 *  always yields text, and forcing numbers here would mean handling
 *  "the user just cleared the field" on every keystroke. */
export interface DraftLine {
  rawLabel: string;
  distributorSku: string;
  quantity: string;
  packPrice: string;
  lineTotal: string;
  /** Empty string until a product is picked. Not null: a <select> value
   *  must be a string. */
  productId: string;
}

/** The fields needed to create a product without leaving the entry screen. */
export interface DraftProduct {
  name: string;
  category: string;
  packQuantity: string;
  unitSize: string;
  unitSizeUom: UnitSizeUom | '';
  useUnit: UseUnit | '';
  isConcentrate: boolean;
  dilutionRatio: string;
  /** '' means "not chosen yet" and must block saving. Never a default. */
  dilutionBasis: DilutionBasis | '';
}

export function emptyDraftProduct(): DraftProduct {
  return {
    name: '',
    category: '',
    packQuantity: '',
    unitSize: '',
    unitSizeUom: '',
    useUnit: '',
    isConcentrate: false,
    dilutionRatio: '',
    dilutionBasis: '',
  };
}

interface InvoiceLineRowProps {
  line: DraftLine;
  products: Product[];
  onChange: (field: keyof DraftLine, value: string) => void;
  onRemove: () => void;
  /** Called with the new product's id once it has been created. */
  onProductCreated: (productId: number) => void;
  /** Enter on the last field adds a row. */
  onEnterAtEnd: () => void;
}

export function InvoiceLineRow({
  line,
  products,
  onChange,
  onRemove,
  onProductCreated,
  onEnterAtEnd,
}: InvoiceLineRowProps) {
  const t = useTranslations();

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<DraftProduct>(emptyDraftProduct());
  const [createError, setCreateError] = useState<string | null>(null);

  // --- Le chiffre vivant : la raison d'être de l'écran ----------------------
  // Recalculé à chaque frappe. Une division, pas de useMemo.

  // Quel produit cette ligne désigne. String() : un <select> rend du texte,
  // p.id === line.productId serait toujours faux.
  const selectedProduct: Product | undefined = products.find((p) => {
    return String(p.id) === line.productId;
  });

  // null tant qu'on ne peut pas calculer. Le JSX affiche « — ».
  let liveCost: number | null = null;

  if (selectedProduct !== undefined && line.packPrice !== '') {
    // Tout chiffre venant de l'API est une chaîne : "16.0000", pas 16.
    const packPrice = Number(line.packPrice);
    const packQuantity = Number(selectedProduct.pack_quantity);
    const unitSize = Number(selectedProduct.unit_size);

    // Number(null) vaut 0 : convertir aveuglément transformerait « pas de
    // dilution » en « ratio zéro » et ferait lever un produit normal.
    let dilutionRatio: number | null = null;

    if (selectedProduct.dilution_ratio !== null) {
      dilutionRatio = Number(selectedProduct.dilution_ratio);
    }

    // Pas de try/catch : safeCostPerUseUnit rend null au lieu de lever.
    liveCost = safeCostPerUseUnit(packPrice, {
      packQuantity,
      unitSize,
      isConcentrate: selectedProduct.is_concentrate,
      dilutionRatio,
      dilutionBasis: selectedProduct.dilution_basis,
    });
  }

  function updateDraft(field: keyof DraftProduct, value: string | boolean) {
    setDraft((current) => {
      return { ...current, [field]: value };
    });
  }

  // --- Créer un produit sans quitter l'écran --------------------------------
  async function handleCreateProduct() {
    setCreateError(null);

    // Une liste + une boucle, plutôt que six if identiques.
    const requiredFields: (keyof DraftProduct)[] = [
      'name',
      'category',
      'packQuantity',
      'unitSize',
      'unitSizeUom',
      'useUnit',
    ];

    for (const field of requiredFields) {
      if (draft[field] === '') {
        setCreateError(t('errors.MISSING_REQUIRED_FIELDS'));
        return;
      }
    }

    // Le contrôle qui compte : un ratio sans base, c'est 1,5 % d'écart sur
    // chaque rapport où ce produit apparaîtra.
    if (draft.isConcentrate === true) {
      if (draft.dilutionRatio === '' || draft.dilutionBasis === '') {
        setCreateError(t('errors.CONCENTRATE_REQUIRES_DILUTION'));
        return;
      }
    }

    // Les chaînes deviennent des nombres ici, et nulle part ailleurs.
    const body: CreateProductBody = {
      name: draft.name,
      category: draft.category,
      packDescription: `${draft.packQuantity} x ${draft.unitSize} ${draft.unitSizeUom}`,
      packQuantity: Number(draft.packQuantity),
      unitSize: Number(draft.unitSize),
      unitSizeUom: draft.unitSizeUom as UnitSizeUom,
      useUnit: draft.useUnit as UseUnit,
      isConcentrate: draft.isConcentrate,
    };

    // undefined, jamais '' : une clé absente du JSON laisse la colonne NULL,
    // une chaîne vide écrirait '' en base.
    if (draft.isConcentrate === true) {
      body.dilutionRatio = Number(draft.dilutionRatio);
      body.dilutionBasis = draft.dilutionBasis as DilutionBasis;
    }

    try {
      const created = await apiPost<Product>('/products', body);

      // Le parent l'ajoute au catalogue ET le sélectionne sur cette ligne,
      // donc le coût apparaît tout de suite.
      onProductCreated(created.id);
      setCreating(false);
      setDraft(emptyDraftProduct());
    } catch (err) {
      if (err instanceof ApiError && t.has(`errors.${err.code}`)) {
        setCreateError(t(`errors.${err.code}`));
      } else {
        setCreateError(t('errors.unreachable'));
      }
    }
  }

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[1fr_200px_110px_70px_100px_150px_36px] items-center gap-2">
        {/* The label is copied EXACTLY as printed, typos included. Correcting
            it would destroy the information the matcher learns from. */}
        <Input
          value={line.rawLabel}
          onChange={(e) => onChange('rawLabel', e.target.value)}
          placeholder={t('invoiceEntry.labelPlaceholder')}
        />

        <select
          value={line.productId}
          onChange={(e) => onChange('productId', e.target.value)}
          className="h-9 w-full rounded-md border bg-transparent px-2 text-sm"
        >
          <option value="">{t('invoiceEntry.noProduct')}</option>
          {products.map((p) => {
            return (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.pack_description ? ` · ${p.pack_description}` : ''}
              </option>
            );
          })}
        </select>

        <Input
          value={line.distributorSku}
          onChange={(e) => onChange('distributorSku', e.target.value)}
          placeholder={t('invoiceEntry.codePlaceholder')}
        />

        <Input
          inputMode="decimal"
          value={line.quantity}
          onChange={(e) => onChange('quantity', e.target.value)}
          placeholder={t('invoiceEntry.columns.quantity')}
        />

        <Input
          inputMode="decimal"
          value={line.packPrice}
          onChange={(e) => onChange('packPrice', e.target.value)}
          placeholder={t('invoiceEntry.columns.packPrice')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onEnterAtEnd();
            }
          }}
        />

        {/* THE LIVE NUMBER. Right-aligned and monospaced so the decimal points
            line up down the column — a misplaced one is then visible without
            reading the digits. */}
        <span className="text-right font-mono text-sm tabular-nums">
          {liveCost === null ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            formatCostPerUseUnit(
              String(liveCost),
              selectedProduct?.use_unit ?? null,
            )
          )}
        </span>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          aria-label={t('invoiceEntry.removeLine')}
        >
          ×
        </Button>
      </div>

      {/* The create-product affordance only shows when no product is picked. */}
      {line.productId === '' && !creating ? (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="ml-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {t('invoiceEntry.createProduct')}
        </button>
      ) : null}

      {/* ---- the expandable creation panel ---- */}
      {creating ? (
        <div className="ml-4 space-y-3 rounded-md border border-dashed p-3">
          <div className="grid gap-2 md:grid-cols-4">
            <Input
              value={draft.name}
              onChange={(e) => updateDraft('name', e.target.value)}
              placeholder={t('productDraft.name')}
            />
            <Input
              value={draft.category}
              onChange={(e) => updateDraft('category', e.target.value)}
              placeholder={t('productDraft.category')}
            />
            <Input
              inputMode="decimal"
              value={draft.packQuantity}
              onChange={(e) => updateDraft('packQuantity', e.target.value)}
              placeholder={t('productDraft.packQuantity')}
            />
            <Input
              inputMode="decimal"
              value={draft.unitSize}
              onChange={(e) => updateDraft('unitSize', e.target.value)}
              placeholder={t('productDraft.unitSize')}
            />
          </div>

          <div className="grid gap-2 md:grid-cols-4">
            <select
              value={draft.unitSizeUom}
              onChange={(e) => updateDraft('unitSizeUom', e.target.value)}
              className="h-9 rounded-md border bg-transparent px-2 text-sm"
            >
              <option value="">{t('productDraft.unitSizeUom')}</option>
              {(['sheet', 'roll', 'ml', 'l', 'g', 'kg', 'unit'] as const).map(
                (u) => {
                  return (
                    <option key={u} value={u}>
                      {t(`units.${u}`)}
                    </option>
                  );
                },
              )}
            </select>

            <select
              value={draft.useUnit}
              onChange={(e) => updateDraft('useUnit', e.target.value)}
              className="h-9 rounded-md border bg-transparent px-2 text-sm"
            >
              <option value="">{t('productDraft.useUnit')}</option>
              {(
                ['sheet', 'roll', 'litre_ready', 'wash', 'wipe', 'unit'] as const
              ).map((u) => {
                return (
                  <option key={u} value={u}>
                    {t(`units.${u}`)}
                  </option>
                );
              })}
            </select>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.isConcentrate}
                onChange={(e) => updateDraft('isConcentrate', e.target.checked)}
              />
              {t('productDraft.concentrate')}
            </label>
          </div>

          {/* Dilution fields appear only for a concentrate. Showing them
              greyed out for every product would invite filling them in. */}
          {draft.isConcentrate ? (
            <div className="grid gap-2 md:grid-cols-4">
              <Input
                inputMode="decimal"
                value={draft.dilutionRatio}
                onChange={(e) => updateDraft('dilutionRatio', e.target.value)}
                placeholder={t('productDraft.dilutionRatio')}
              />

              {/* NO DEFAULT VALUE. "1:64" is 65 parts in parts_water and 64
                  in total_parts — a 1,5 % gap that propagates into every
                  savings report. The operator chooses, or nothing saves. */}
              <select
                value={draft.dilutionBasis}
                onChange={(e) => updateDraft('dilutionBasis', e.target.value)}
                className="h-9 rounded-md border bg-transparent px-2 text-sm"
              >
                <option value="">{t('productDraft.dilutionBasis')}</option>
                <option value="parts_water">
                  {t('productDraft.dilutionPartsWater')}
                </option>
                <option value="total_parts">
                  {t('productDraft.dilutionTotalParts')}
                </option>
              </select>
            </div>
          ) : null}

          {createError !== null ? (
            <p className="text-sm text-destructive">{createError}</p>
          ) : null}

          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={handleCreateProduct}>
              {t('productDraft.create')}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setCreateError(null);
              }}
            >
              {t('productDraft.cancel')}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ===========================================================================
// FILE:  components/invoice-form.tsx
// ROLE:  Invoice entry. Header, lines, and the totals check.
//
// BUILT FOR SPEED, NOT FOR LOOKS
//   An invoice carries fifteen to twenty lines. Every avoided mouse click is
//   worth more than a rounded border. Hence: Enter on the last field adds a
//   row, fields follow the reading order of the paper invoice, and no
//   optional field blocks saving.
//
// MONEY STAYS A STRING
//   Price fields are strings in state, converted to numbers only at submit.
//   Adding two amounts here would concatenate: "48.00" + "52.50" gives
//   "48.0052.50". Only + behaves that way — ×, − and / coerce silently, so
//   the bug waits for the first sum.
//
// THE TOTALS CHECK IS A WARNING, NOT A BLOCK
//   Brief §3: "an invoice that does not balance does not enter a report."
//   But a real invoice carries delivery charges, credits, deposits. Blocking
//   would make the operator round numbers until it balances — which is worse
//   than a mismatch nobody hid.
// ===========================================================================

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
// From @/i18n/navigation so router.push keeps the locale prefix.
import { useRouter } from '@/i18n/navigation';
import type {
  Member,
  Distributor,
  Product,
  CreateInvoiceBody,
  CreateInvoiceLineBody,
  InvoiceWithLines,
} from '@/lib/types';
import { apiPost, ApiError } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InvoiceLineRow,
  type DraftLine,
} from '@/components/invoice-line-row';

function emptyLine(): DraftLine {
  return {
    rawLabel: '',
    distributorSku: '',
    quantity: '',
    packPrice: '',
    lineTotal: '',
    productId: '',
  };
}

interface InvoiceFormProps {
  members: Member[];
  distributors: Distributor[];
  products: Product[];
}

export function InvoiceForm({
  members,
  distributors,
  products: initialProducts,
}: InvoiceFormProps) {
  const router = useRouter();
  const t = useTranslations();

  // --- header ---------------------------------------------------------------
  const [memberId, setMemberId] = useState('');
  const [distributorId, setDistributorId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [subtotal, setSubtotal] = useState('');

  // --- lines ----------------------------------------------------------------
  // Three empty rows to start: one would suggest a one-line invoice.
  const [lines, setLines] = useState<DraftLine[]>([
    emptyLine(),
    emptyLine(),
    emptyLine(),
  ]);

  // The catalogue lives in state, not in props, because creating a product
  // from inside a row has to make it appear in every other row's dropdown
  // without a page reload.
  const [products, setProducts] = useState<Product[]>(initialProducts);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =========================================================================
  // TO WRITE — editing the lines
  //
  // THE RULE THESE THREE FUNCTIONS EXIST TO RESPECT: NEVER MUTATE STATE.
  //
  //   React decides whether to redraw by comparing REFERENCES, not contents.
  //
  //     lines[i].rawLabel = 'x';   ← the array is the same object
  //     setLines(lines);           ← React sees no change, screen frozen
  //
  //   So every one of these returns a NEW array. The old one is discarded.
  //
  // THE UPDATER FORM: setLines((current) => ...)
  //   Passing a function rather than a value guarantees `current` is the
  //   latest state. With setLines(newArray) built from the outer `lines`,
  //   two updates in the same tick would read the same stale array and the
  //   first would be lost.
  // =========================================================================
  //
  // updateLine(index, field, value)
  //   .map() walks the array and returns a new one of the same length.
  //   Return the line untouched when i !== index — returning undefined would
  //   put a hole in the array.
  //   For the matching line, { ...line, [field]: value } copies every field
  //   and overwrites one. The square brackets make the key dynamic: without
  //   them you would literally create a property named "field".
  //
  // addLine()
  //   [...current, emptyLine()] — spread the existing items into a new array
  //   and append one. current.push() would mutate.
  //
  // removeLine(index)
  //   .filter() keeps the items whose test returns true. The first parameter
  //   is the item, which you do not need here — name it _ by convention. The
  //   second is the index, which is what you test on.
  //
  // handleProductCreated(index, product)
  //   Two things at once: append the product to the catalogue so every other
  //   row's dropdown sees it, and select it on this line. The second is just
  //   updateLine(index, 'productId', String(product.id)) — String() because a
  //   <select> value is always text.
  // =========================================================================
  function updateLine(index: number, field: keyof DraftLine, value: string) {
    setLines((current) => {
      return current.map((line, i) => {
        // Toute ligne non visée est renvoyée telle quelle : .map() produit un
        // tableau de MÊME longueur, un return manquant y laisserait un trou.
        if (i !== index) {
          return line;
        }

        // Nouvel objet, une seule clé remplacée. [field] entre crochets :
        // sans eux, on créerait une propriété nommée "field".
        return { ...line, [field]: value };
      });
    });
  }

  function addLine() {
    setLines((current) => {
      // current.push() modifierait le tableau existant — React ne verrait
      // aucun changement de référence et ne redessinerait pas.
      return [...current, emptyLine()];
    });
  }

  function removeLine(index: number) {
    setLines((current) => {
      // .filter() garde les éléments dont le test rend true. Le premier
      // paramètre est l'élément, inutile ici : _ par convention.
      return current.filter((_, i) => {
        return i !== index;
      });
    });
  }

  function handleProductCreated(index: number, product: Product) {
    // Deux effets. Le catalogue d'abord : sans lui, le <select> de cette
    // ligne n'aurait aucune option portant ce nouvel id, et la sélection
    // juste en dessous n'afficherait rien.
    setProducts((current) => {
      return [...current, product];
    });

    // String() : la valeur d'un <select> est toujours du texte.
    updateLine(index, 'productId', String(product.id));
  }

  // =========================================================================
  // TO WRITE — the totals check
  // =========================================================================
  //
  // Brief §3: "sum of lines ≠ invoice total → visible warning."
  //
  // [P] PREPARE — sum the filled lines. Two ways to get a line's amount:
  //       lineTotal if the operator typed it
  //       otherwise quantity × packPrice
  //
  //     Number() on each value BEFORE adding. This is the one place in the
  //     file where that matters — "48.00" + "52.50" gives "48.0052.50".
  //
  // [C] CHECK — compare to Number(subtotal). Tolerance: 0,05 $. Below that
  //     it is rounding, not an error.
  //
  // [R] RESPOND — return null when it balances or when subtotal is empty,
  //     otherwise a message naming BOTH numbers and the gap. "Does not
  //     balance" alone is useless; the operator needs to see which is which.
  //
  //     Common legitimate causes worth mentioning in the message: delivery
  //     charges, a credit, a deposit. The gap is information, not a fault.
  // =========================================================================
  function totalsWarning(): string | null {
    // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
    //
    //   WRITE HERE  —  C2 step 7.  Le plan [P]/[C]/[R] est juste au-dessus.
    //
    //   Ne bloque jamais la sauvegarde : un écart peut être légitime
    //   (livraison, crédit, consigne). Bloquer pousserait l'opérateur à
    //   arrondir jusqu'à ce que ça balance — pire qu'un écart visible.
    //
    //   La clé de traduction existe déjà : t('totals.mismatch', { lines,
    //   total, gap }). formatMoney() attend une chaîne, donc String(...)
    //   sur les trois valeurs calculées.
    //
    // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

    return null;

    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲  END OF WHAT YOU WRITE  ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
  }

  // =========================================================================
  // TO WRITE — handleSubmit
  // =========================================================================
  //
  // [C] CHECK — header complete: memberId, distributorId, invoiceNumber,
  //     invoiceDate. The API returns 400 without them, but a message here is
  //     faster than a round trip.
  //
  // [P] PREPARE — keep only the FILLED lines.
  //     Three rows start empty; someone entering twelve lines leaves one
  //     empty at the bottom. Filter on rawLabel !== ''.
  //
  //     Then map to CreateInvoiceBody:
  //       rawLabel        as typed, no aggressive trim
  //       distributorSku  undefined when empty, never ''
  //       quantity        Number(...)
  //       packPrice       Number(...)
  //       lineTotal       undefined when empty
  //
  //     This is the ONLY place amounts become numbers.
  //
  // [C] CHECK — at least one filled line.
  //
  // [A] ACT — apiPost<InvoiceWithLines>('/invoices', body)
  //     try/catch, then t(`errors.${err.code}`) with the t.has() guard
  //     described at the end of lib/format.ts.
  //     setSubmitting(true) before, false in a finally — otherwise a failure
  //     leaves the button disabled forever.
  //
  // [R] RESPOND — router.push(`/factures/${created.id}`)
  //
  // NOTE — productId is deliberately NOT sent. The API matches each line
  // itself through matching.service, and that is what teaches it aliases.
  // Sending the answer would skip the learning entirely.
  // =========================================================================
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    // [C] En-tête complet. Le message NOMME les champs manquants : « tous les
    //     champs sont requis » oblige l'opérateur à chercher lequel.
    const missing: string[] = [];

    if (memberId === '') {
      missing.push(t('invoiceEntry.member'));
    }

    if (distributorId === '') {
      missing.push(t('invoiceEntry.supplier'));
    }

    if (invoiceNumber === '') {
      missing.push(t('invoiceEntry.invoiceNumber'));
    }

    if (invoiceDate === '') {
      missing.push(t('invoiceEntry.date'));
    }

    if (missing.length > 0) {
      setError(t('errors.missingFields', { fields: missing.join(', ') }));
      return;
    }

    // [P] Garder les lignes REMPLIES. Trois rangées démarrent vides, et qui
    //     saisit douze lignes en laisse une vide en bas.
    const filledLines = lines.filter((line) => {
      return line.rawLabel !== '';
    });

    // [C] Une facture sans ligne n'est pas une facture.
    if (filledLines.length === 0) {
      setError(t('errors.INVOICE_MUST_HAVE_LINES'));
      return;
    }

    // Seul endroit du fichier où les montants deviennent des nombres.
    const body: CreateInvoiceBody = {
      memberId: Number(memberId),
      distributorId: Number(distributorId),
      invoiceNumber,
      invoiceDate,
      lines: filledLines.map((line) => {
        const bodyLine: CreateInvoiceLineBody = {
          // Copié tel que tapé : le matcher apprend des fautes de frappe.
          rawLabel: line.rawLabel,
          quantity: Number(line.quantity),
          packPrice: Number(line.packPrice),
        };

        // undefined, jamais '' : une clé absente laisse la colonne NULL.
        if (line.distributorSku !== '') {
          bodyLine.distributorSku = line.distributorSku;
        }

        if (line.lineTotal !== '') {
          bodyLine.lineTotal = Number(line.lineTotal);
        }

        return bodyLine;
      }),
    };

    if (subtotal !== '') {
      body.subtotal = Number(subtotal);
    }

    // productId n'est volontairement PAS envoyé : l'API fait le matching
    // elle-même, et c'est ce qui lui apprend les alias. Envoyer la réponse
    // supprimerait l'apprentissage.

    setSubmitting(true);

    try {
      const created = await apiPost<InvoiceWithLines>('/invoices', body);

      router.push(`/factures/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError && t.has(`errors.${err.code}`)) {
        setError(t(`errors.${err.code}`));
      } else {
        setError(t('errors.unreachable'));
      }
    } finally {
      // Dans un finally : sinon un échec laisse le bouton désactivé à vie.
      setSubmitting(false);
    }
  }

  const warning = totalsWarning();

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ---- header ---- */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1.5">
          <Label htmlFor="member">{t('invoiceEntry.member')}</Label>
          <select
            id="member"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="">{t('invoiceEntry.none')}</option>
            {members.map((m) => {
              return (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              );
            })}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="distributor">{t('invoiceEntry.supplier')}</Label>
          <select
            id="distributor"
            value={distributorId}
            onChange={(e) => setDistributorId(e.target.value)}
            className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
          >
            <option value="">{t('invoiceEntry.none')}</option>
            {distributors.map((d) => {
              return (
                <option key={d.id} value={d.id}>
                  {d.name}
                  {/* The role is shown because a retailer is never a price
                      grid holder — only an observation source (A4, A5). */}
                  {d.role === 'retailer' ? ` · ${t('invoiceEntry.supplierRetailer')}` : ''}
                </option>
              );
            })}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="number">{t('invoiceEntry.invoiceNumber')}</Label>
          <Input
            id="number"
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date">{t('invoiceEntry.date')}</Label>
          <Input
            id="date"
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="subtotal">{t('invoiceEntry.subtotal')}</Label>
          <Input
            id="subtotal"
            inputMode="decimal"
            value={subtotal}
            onChange={(e) => setSubtotal(e.target.value)}
          />
        </div>
      </section>

      {/* ---- lines ---- */}
      <section className="space-y-2">
        <div className="grid grid-cols-[1fr_200px_110px_70px_100px_150px_36px] gap-2 text-xs font-medium text-muted-foreground">
          <span>{t('invoiceEntry.columns.label')}</span>
          <span>{t('invoiceEntry.columns.product')}</span>
          <span>{t('invoiceEntry.columns.supplierCode')}</span>
          <span>{t('invoiceEntry.columns.quantity')}</span>
          <span>{t('invoiceEntry.columns.packPrice')}</span>
          <span className="text-right">{t('invoiceEntry.columns.costPerUseUnit')}</span>
          <span />
        </div>

        {lines.map((line, index) => {
          return (
            <InvoiceLineRow
              key={index}
              line={line}
              products={products}
              onChange={(field, value) => updateLine(index, field, value)}
              onRemove={() => removeLine(index)}
              onProductCreated={(productId) => {
                const created = products.find((p) => p.id === productId);
                if (created) {
                  handleProductCreated(index, created);
                }
              }}
              onEnterAtEnd={() => {
                if (index === lines.length - 1) {
                  addLine();
                }
              }}
            />
          );
        })}

        <Button type="button" variant="outline" size="sm" onClick={addLine}>
          {t('invoiceEntry.addLine')}
        </Button>
      </section>

      {/* The totals warning sits ABOVE the submit button, where the eye
          passes before clicking — not below it, where it would be read
          after the fact. */}
      {warning !== null ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
          {warning}
        </p>
      ) : null}

      {error !== null ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      <Button type="submit" disabled={submitting}>
        {submitting ? t('invoiceEntry.submitting') : t('invoiceEntry.submit')}
      </Button>
    </form>
  );
}

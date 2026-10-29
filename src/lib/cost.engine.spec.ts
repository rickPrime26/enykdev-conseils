// ===========================================================================
// FILE:  lib/cost.engine.spec.ts
// ROLE:  The four vectors from brief §3, run in the browser copy.
//
// ⚠ THIS FILE IS WHAT MAKES THE DUPLICATION SAFE
//   cost.engine.ts is a copy of jambo-api/src/pricing/cost.engine.ts. The
//   vectors below are the same on both sides. If one copy drifts, a test
//   falls here or there.
//
//   Without them the duplication would be silent debt.
//
// WHY THE NUMBERS ARE HARDCODED
//   4000, 260, 0,2615 come from the brief — from outside the program.
//   Recomputing them with the formula under test would compare the code to
//   itself and verify nothing.
//
// WHAT THIS FILE DOES NOT TEST
//   areComparable, savingsFactor, annualSaving. The browser copy does not
//   carry them — the entry form never compares two products. Their tests
//   stay in jambo-api.
// ===========================================================================

import {
  useUnitsPerPack,
  costPerUseUnit,
  safeCostPerUseUnit,
  MissingDilutionBasisError,
} from './cost.engine';

// ===========================================================================
// The four vectors
//
// Units first, then cost. Checking only the cost lets a compensating error
// through — wrong units with a wrong price can land on the right number.
// ===========================================================================
describe('The four vectors from brief §3', () => {
  it('case of 16 × 250 sheets at 48,00 $ → 4000 sheets, 0,0120 $/sheet', () => {
    const units = useUnitsPerPack({
      packQuantity: 16,
      unitSize: 250,
      isConcentrate: false,
    });

    expect(units).toBe(4000);
    expect(costPerUseUnit(48.0, units)).toBeCloseTo(0.012, 6);
  });

  it('ready-to-use 4 L at 42,00 $ → 4 L, 10,5000 $/L', () => {
    const units = useUnitsPerPack({
      packQuantity: 1,
      unitSize: 4,
      isConcentrate: false,
    });

    expect(units).toBe(4);
    expect(costPerUseUnit(42.0, units)).toBeCloseTo(10.5, 6);
  });

  it('concentrate 1:64 parts_water, 4 L at 68,00 $ → 260 L, 0,2615 $/L', () => {
    const units = useUnitsPerPack({
      packQuantity: 1,
      unitSize: 4,
      isConcentrate: true,
      dilutionRatio: 64,
      dilutionBasis: 'parts_water',
    });

    // 4 L × (64 + 1) = 260 L ready. The +1 is the trap of the project.
    expect(units).toBe(260);
    expect(costPerUseUnit(68.0, units)).toBeCloseTo(0.261538, 6);
  });

  it('substitution factor between the last two → 40,15× (±0,05)', () => {
    // savingsFactor lives only in jambo-api, so the ratio is written out.
    // Same arithmetic, no missing assertion: both products are litres.
    const readyToUse = costPerUseUnit(42.0, 4);
    const concentrate = costPerUseUnit(68.0, 260);

    const factor = readyToUse / concentrate;

    // The number that sells: 40 times cheaper per ready litre, on a product
    // whose pack price is HIGHER. That inversion is the whole argument.
    expect(factor).toBeGreaterThan(40.1);
    expect(factor).toBeLessThan(40.2);
  });
});

// ===========================================================================
// The dilution basis
//
// The gap between the two bases is 1,5 %, and it propagates into every
// savings report. A client who spots it stops believing every other number.
//
//   parts_water   1 × 1 × (64 + 1) = 65     ← the +1
//   total_parts   1 × 1 × 64       = 64
// ===========================================================================
describe('The dilution basis', () => {
  it('parts_water adds +1, total_parts does not', () => {
    const base = {
      packQuantity: 1,
      unitSize: 1,
      isConcentrate: true,
      dilutionRatio: 64,
    };

    // Same product, same ratio, two readings of "1:64".
    expect(useUnitsPerPack({ ...base, dilutionBasis: 'parts_water' })).toBe(65);
    expect(useUnitsPerPack({ ...base, dilutionBasis: 'total_parts' })).toBe(64);
  });

  it('a concentrate with no basis is refused', () => {
    // The wrapper matters: the form catches THIS error to show "—".
    expect(() => {
      useUnitsPerPack({
        packQuantity: 1,
        unitSize: 4,
        isConcentrate: true,
        dilutionRatio: 64,
        dilutionBasis: null,
      });
    }).toThrow(MissingDilutionBasisError);
  });

  it('without the +1 the factor falls out of tolerance', () => {
    // Why the basis is never guessed: reading 1:64 the wrong way moves the
    // headline number by 0,6×, which is outside the ±0,05 the brief allows.
    const wrongUnits = useUnitsPerPack({
      packQuantity: 1,
      unitSize: 4,
      isConcentrate: true,
      dilutionRatio: 64,
      dilutionBasis: 'total_parts',
    });

    expect(wrongUnits).toBe(256);

    const wrongFactor = costPerUseUnit(42.0, 4) / costPerUseUnit(68.0, 256);

    expect(wrongFactor).toBeCloseTo(39.53, 2);
    expect(wrongFactor).toBeLessThan(40.1);
  });
});

// ===========================================================================
// safeCostPerUseUnit — the only function the API copy does not have
//
// While typing, fields are incomplete on every keystroke. An exception per
// character would make the form unusable, so this variant returns null and
// the screen shows "—". Never a wrong number.
// ===========================================================================
describe('safeCostPerUseUnit', () => {
  it('returns the cost when everything is filled in', () => {
    const cost = safeCostPerUseUnit(48.0, {
      packQuantity: 16,
      unitSize: 250,
      isConcentrate: false,
    });

    // Same answer as the strict pair above — the safety is at the edges only.
    expect(cost).toBeCloseTo(0.012, 6);
  });

  it('returns null while the format is incomplete', () => {
    // unitSize absent: the state after typing "16" and nothing else.
    expect(safeCostPerUseUnit(48.0, { packQuantity: 16 })).toBeNull();

    // No price yet.
    expect(
      safeCostPerUseUnit(null, { packQuantity: 16, unitSize: 250 }),
    ).toBeNull();
  });

  it('returns null for a concentrate with no basis — never a wrong number', () => {
    // The strict version THROWS here. This one swallows it, because a
    // half-filled concentrate is a normal keystroke, not an error.
    const cost = safeCostPerUseUnit(68.0, {
      packQuantity: 1,
      unitSize: 4,
      isConcentrate: true,
      dilutionRatio: 64,
    });

    // Null, not 0 and not NaN: both would render as a number on screen.
    expect(cost).toBeNull();
  });
});

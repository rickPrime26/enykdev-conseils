// ===========================================================================
// FILE:  components/product-card.tsx
// ROLE:  One product in the catalogue. The most repeated component in the app.
//
// ONE COMPONENT, TWO STATES
//   A buyer scanning the catalogue should never have to work out which list
//   she is looking at. Every product renders the same card, and the card
//   answers one question: can I join something, or do I have to start it?
//
//     State A — a pool is running   -> progress, countdown, "Rejoindre"
//     State B — no pool yet         -> minimum order, "Démarrer un groupage"
//
//   Both states MUST render at the same height, or the grid breaks into a
//   ragged mess.
//
//   State B is what answers "how does a buyer start a pool?" — the question
//   the first design failed. Do not drop it.
//
// ---------------------------------------------------------------------------
// WHAT TO BUILD
// ---------------------------------------------------------------------------
//
// Use Card and CardContent from @/components/ui/card.
// Use Button from @/components/ui/button.
//
// SHARED HEADER (both states)
//   supplier name   12px, muted        e.g. "Dustbane"
//   product name    15px, medium       e.g. "Dégraissant alcalin concentré"
//                   Two lines maximum, then truncate. French names are long.
//
// STATE A — pool running
//   progress bar    6px, #D85A30 fill on #F1EFE8 track
//   below the bar, one row:
//     left   "164 L sur 200 L"     13px muted
//     right  "82 %"                13px muted
//   countdown       "6 h 20" at 18px medium, then "restantes" at 13px muted
//                   #D85A30 when under 6 hours, near-black otherwise.
//                   This is the loudest thing on the card after the name —
//                   pools last 24-48h, so time is the deciding factor.
//   hairline divider
//   bottom row:
//     left   "4,20 $ / litre"
//     right  filled green Button: "Rejoindre"
//   text link below: "Plus d'informations ›"
//
// STATE B — no pool
//   "Aucun groupage en cours"                 13px muted
//   "Minimum du producteur : 150 caisses"     13px muted
//   spacer, so the card matches State A's height
//   hairline divider
//   bottom row:
//     left   "2,80 $ / caisse"
//     right  outline Button: "Démarrer un groupage"
//
// PROPS
//   Take a product, and a pool that may be null:
//     product   name, supplier name, unit, unit_price, min order volume
//     pool      null in State B; otherwise current_volume, target_volume,
//               closes_at
//
//   Deciding the state is a single check: is pool null or not.
//
// FORMATTING
//   Everything displayable comes from @/lib/format:
//     formatUnitPrice   "4,20 $ / litre"
//     formatVolume      "164 L"
//     poolProgress      the percentage, for the bar width
//   NEVER do arithmetic on prices here. They arrive as strings on purpose.
//
//   formatDeadline currently speaks in days ("ferme dans 6 jours"), which is
//   useless for 24-48h pools. It needs an hours-and-minutes version — either
//   extend it in lib/format.ts or write a new helper there. Not here.
//
// COLOUR
//   Terracotta only on the progress bar and an urgent countdown.
//   Green only on the "Rejoindre" button.
//   Everything else greyscale.
//   Never a green progress bar: green reads as "all good", which would lie
//   about a pool sitting at 20%.
//
// NOTE
//   This replaces components/pool-card.tsx, which only handles State A.
//   Delete that file once this one works.
// ===========================================================================

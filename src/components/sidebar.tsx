// ===========================================================================
// FILE:  components/sidebar.tsx
// ROLE:  The fixed left column. Navigation on top, live pool status below.
//
// WHY THE POOLS LIVE HERE
//   Pools last 24-48 hours, so a countdown that scrolls off screen is a
//   countdown the buyer misses. The sidebar is already fixed, so putting them
//   here costs zero vertical space in the main area.
//
//   It must NEVER look empty. A buyer with no pools sees "À rejoindre" only —
//   that empty state is a brand-new account's first impression of what Jambo
//   actually does.
//
// ---------------------------------------------------------------------------
// WHAT TO BUILD
// ---------------------------------------------------------------------------
//
// Fixed column, 280px wide, white background, hairline right border,
// full viewport height.
//
// 1. WORDMARK
//      "Jambo", 15px, medium weight.
//
// 2. NAVIGATION — five links, 13px, with a lucide icon each:
//      Accueil        /            Home
//      Catalogue      /catalogue   LayoutGrid
//      Groupages      /groupages   Users
//      Mes commandes  /orders      Receipt
//      Paramètres     /settings    Settings
//
//      The active route gets a light grey pill background and darker text.
//      Import Link from 'next/link' — never a bare <a>, which would reload
//      the whole page and lose client state.
//
//      "Groupages" is NOT "Mes groupages": that page shows the buyer's own
//      pools AND ones she has not joined.
//
// 3. HAIRLINE DIVIDER
//
// 4. SECTION "GROUPAGES"
//      Heading: 11px, uppercase, muted, letter-spacing 0.04em.
//
//      Sub-list 1 — label "Vous participez · {n}", 11px muted.
//        Rendered ONLY when the buyer has at least one active pool.
//
//      Hairline divider between the two sub-lists.
//
//      Sub-list 2 — label "À rejoindre", 11px muted.
//        Pools she has NOT joined. Always rendered.
//
//      When sub-list 1 is empty, replace it with one line of 12px muted copy:
//        "Vous ne participez à aucun groupage. En voici près de chez vous."
//      and show three entries in sub-list 2 instead of two.
//
//      Text link at the bottom: "Voir tout" -> /groupages
//
// 5. ONE ENTRY (extract as a small component in this same file)
//      product name    13px, dark, truncated on overflow — French product
//                      names are long and WILL overflow 280px
//      progress bar    4px tall, #D85A30 fill on #F1EFE8 track
//      countdown       12px, "6 h 20 restantes"
//                      #D85A30 when under 6 hours, muted grey otherwise
//      12px gap between entries. The whole entry links to /pools/{id}.
//
// PROPS
//   Take the two lists as props — joined and available. This component only
//   renders; it never fetches. Fetching belongs to the page.
//
//   For now, pass hardcoded arrays from page.tsx. Real data comes later.
//
// NOTE ON COLOUR
//   Terracotta is the only colour in this file, and only on progress bars and
//   urgent countdowns. No green here — nothing in the sidebar is a primary
//   action.
// ===========================================================================

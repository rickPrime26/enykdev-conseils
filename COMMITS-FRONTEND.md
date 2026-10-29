# Front-end — ordered work, with commit messages

Each block is one commit. Do them top to bottom — the order is dependency
order, not preference. Stop asking what's next; it's the first unchecked box.

`[me]` means I write it, `[you]` means you do.

**Standing convention for every `[me skeleton]` from C4b onward:**
the skeleton ships with **2 or 3 JSX fields left blank**, marked `▼ WRITE HERE`,
alongside the handlers. Not all of them — enough to keep the markup readable
when something breaks at 11pm in December. Pick fields that differ from each
other: one plain `<Input>`, one `<select>`, one conditional block.

---

## ✅ C1 — Foundations *(done, uncommitted)*

lib layer rewritten for the buying-agent model, invoice entry screen,
auth screens, bilingual routing.

```
git add -A jambo-web jambo-db/seed-premier-audit.sql
git commit -m "Front-end: invoice entry screen, auth, bilingual

Invoice entry (brief screen 1, phase 1 admin):
- invoice-form + invoice-line-row, cost per use unit computed and shown
  beside the line while typing (brief §3)
- product creation inline, in an expanding panel
- dilution basis has NO default: 1:64 is 65 parts in parts_water and 64 in
  total_parts, 1.5 percent that propagates into every report

cost.engine.ts: deliberate copy of jambo-api, with the SAME four vectors
tested on both sides. If one copy drifts, a test falls.

Auth: login and password change. must_change_password redirects rather than
showing a message — without it the user lands where every request 403s.

Bilingual (next-intl): routes under [locale], fr default, 95 keys in
messages/fr.json and en.json. errorMessage() removed from format.ts, API
codes go through t(errors.CODE) with a t.has() guard.

Removed: pool-card, bottom-nav, (buyer) — abandoned pooling model."
```

---

## C2 — The six handlers `[you]`

Everything currently throwing `to be written`. Nothing else works until these
do.

**Order matters:**

1. `cost.engine.spec.ts` — 11 `it.todo`. Depends on nothing, gives you the
   four vectors in hand.
2. `invoice-line-row.tsx` — the live number (`selectedProduct`, `liveCost`).
   The reason the screen exists.
3. `invoice-form.tsx` — `updateLine`, `addLine`, `removeLine`,
   `handleProductCreated`. The immutable pattern, Rule 7.
4. `invoice-line-row.tsx` — `handleCreateProduct`.
5. `invoice-form.tsx` — `handleSubmit`.
6. `changer-mot-de-passe` — `handleSubmit`.
7. `invoice-form.tsx` — `totalsWarning`. Last: it's a warning, nothing
   depends on it.

```
git commit -m "Invoice entry: handlers written, screen usable end to end"
```

**Done when:** you enter a real invoice line and the cost per use unit appears
beside it while typing.

---

## C3 — Middleware auth guard `[me skeleton] [you handler]`

Rule 3. Today an expired token crashes the page instead of redirecting.

- `middleware.ts` — cookie check before the locale handling
- public routes: `/login`, `/changer-mot-de-passe`
- `lib/api.ts` — catch a 401 and redirect, for calls made from the browser

```
git commit -m "Auth: redirect to login before rendering, not after a 401"
```

**Done when:** deleting the cookie in devtools and reloading sends you to
login instead of an error screen.

---

## C4 — User context `[me skeleton] [you handler]`

Rule 4. Nothing currently knows who is logged in.

- `contexts/user-context.tsx` — provider + `useUser()`
- `[locale]/(app)/layout.tsx` — fetch the profile once, wrap children
- `app-nav.tsx` — show the email and a logout button

```
git commit -m "User context: profile fetched once, readable anywhere"
```

**Done when:** your email shows in the nav bar and no page refetches it.

---

## C4b — My profile `[me skeleton] [you handlers]`

Small, but today there is **no way back** to the password screen. Once the
temporary password is changed, `/changer-mot-de-passe` is unreachable — it is
only ever entered by forced redirect from login.

- `/profil` — email, role, member attached (read from `GET /users/profile`,
  not from the token: the token is a snapshot from login and goes stale)
- change password, reusing the existing form
- logout button — `POST /auth/logout`, then redirect to `/login`

Why `/users/profile` and not `/auth/profile`: the second only echoes the
token back. If an admin changed your role an hour ago, only the first knows.

```
git commit -m "Profile screen: identity, voluntary password change, logout"
```

**Done when:** you can change your password twice in a row without clearing
the cookie.

---

## C5 — Invoice detail screen `[me skeleton] [you handlers]`

`/factures/[id]` — what you see right after saving. The result of the whole
chain.

- header: member, supplier, date, totals
- lines table with `cost_per_use_unit` and a `match_status` badge
- lines needing arbitration flagged

```
git commit -m "Invoice detail: lines, costs per use unit, match status"
```

**Done when:** after saving an invoice you land here and can read every
computed cost.

---

## C6 — Matching queue `[me skeleton] [you handlers]`

Screen 2 of the brief, spec §10. The daily work screen.

- `/arbitrage` — everything `pending` or `ambiguous`, sorted by confidence
- raw line on the left, three suggestions on the right
- keyboard shortcuts 1 / 2 / 3 / I
- confirming writes the alias — that's what makes the system learn

```
git commit -m "Matching queue: human arbitration, alias learning"
```

**Done when:** an ambiguous line can be resolved in under five seconds, and
the same label on the next invoice matches automatically.

---

## C7 — Member screen `[me skeleton] [you handlers]`

Screen 3 of the brief. Needs migration 011 first.

**Migration 011** — the columns the brief references and nobody wrote:
- `members.purchasing_function` — `none` / `partagee` / `dediee` (A12)
- `members.is_public_body` — hard block, not a warning (A13)
- `members.user_id` made nullable — the operator creates members, they have
  no account
- `users.role` CHECK rewritten: `operator` / `member`, dropping `buyer` and
  `producer` (reseller-model leftovers). Needed by C7b.

**Screen:**
- sector, capacity + source, number of sites, buying group
- blocking warnings: `cost_passthrough = full` (A11), `dediee` (A12),
  "supplies included" maintenance contract
- hard block: public body

```
git commit -m "Member screen + migration 011: A12, A13, and user_id nullable"
```

**Done when:** you can create the 120-door building from the UI instead of SQL.

---

## C7b — Account administration `[me skeleton] [you handlers]`

Admin only. Today the only way to create an account is a curl call.

- `/administration/utilisateurs` — list, with role and
  `must_change_password` shown
- create an account → `POST /users/provision-producer`
- **the temporary password is returned ONCE.** Display it in a panel that
  says so, with a copy button. Do not store it, do not refetch it — a second
  call creates a second account.
- the whole route hidden **and** server-guarded on `role !== 'admin'`.
  Hiding the link is not protection (Rule 2) — the page itself must check.

**Roles are still wrong.** The database says `buyer` / `admin` / `producer` —
leftovers from the reseller model. Jambo has operators and members. Rename in
migration 011 alongside A12/A13, or the UI ends up saying "producer" to
someone who runs a daycare.

```
git commit -m "Account administration: provision operators, temp password shown once"
```

**Done when:** you can give the 120-door building's manager an account
without touching a terminal.

---

## C8 — Products screen `[me skeleton] [you handlers]`

- `/produits` — list, with `use_units_per_pack` visible
- create and edit, same format fields as the inline panel
- flag products missing their format: `use_units_per_pack IS NULL` means no
  cost can be computed for any line pointing at them

```
git commit -m "Products screen: catalogue, format, incomplete flagged"
```

---

## C9 — Move `normalizeLabel` to `common/` `[me]`

Debt. It lives in `MatchingService`, so a product search bar would force
`ProductsModule` to import the whole invoices module.

Move it to a pure function **before** writing search, or two copies will drift.

```
git commit -m "Extract normalizeLabel to common/, shared by matching and search"
```

---

## C10 — Audit report `[me skeleton] [you handlers]`

**The product.** Depends on PR6 on the API side.

Two rendered versions, **filtered server-side** — brief §5:
- free: total saving + 3 lines, chosen from the *middle* of the ranking, one
  per saving type
- full: everything

The hidden lines must never reach the browser. A CSS blur over present data
is bypassed in ten seconds with devtools.

Also: annualisation factor shown, seasonal categories flagged. Three months
of summer invoices in a building means zero de-icing salt — never multiply by
four in silence.

```
git commit -m "Audit report: two server-filtered versions, annualisation shown"
```

---

## C11 — Report PDF `[me]`

Equal priority to the screen — it's the document you put on a desk. Letter
format, readable in black and white, one to two pages for the free version.

```
git commit -m "Audit report PDF, free and full"
```

---

# Blocked until there is data

**C12 — Benchmarks screen.** PR5 on the API. A benchmark needs 3 observations
from 2 members; with no invoices there is nothing to aggregate.

**C13 — Member space.** Phase 2 of the brief. Its main job is invoice
*upload*, not consultation — it's a data pipe first.

**C14 — Billing screens.** Phase 3, at the first paying member.

---

# The thing this list can't do for you

`decisions-jambo.md` §7: *"Zero new lines of code before 8 invoice sets."*

Every screen above is built on a spend estimate of 11.70 $ per place per
month that no real invoice has confirmed. The stop criterion in §7 — median
gap under 1.15× and no substitution above 3× — decides whether any of this
is worth finishing.

Two invoice sets are within reach: your school apartment and the 120-door
building. **Ask for twelve consecutive months**, and ask first whether the
janitorial and snow-removal contracts include supplies — if they do, most of
the spend never appears on a purchase invoice at all.

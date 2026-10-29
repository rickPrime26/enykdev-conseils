# Front-end rules — auth, tokens, React

Living file. Add a rule when something costs you more than an hour.

Stack: Next.js 16 App Router, React 19, next-intl, Tailwind.

---

# Part 1 — Authentication

## Rule 1 — The token never touches JavaScript

```js
// ❌ any injected script can read this, and it keeps working until expiry
localStorage.setItem('token', result.access_token);

// ✅ nothing to store — the browser holds the cookie
await apiPost('/auth/login', { email, password });
```

The API answers with `Set-Cookie: access_token=…; HttpOnly`. **HttpOnly means
`document.cookie` cannot see it.** That's the whole point: a script injected
into your page can't steal what it can't read.

Your login page stores nothing after a successful call. That isn't an
omission — it's the design.

### What each cookie flag does

| Flag | What it prevents |
|---|---|
| `httpOnly` | JavaScript reading the token |
| `secure` | the cookie travelling over plain HTTP |
| `sameSite: 'lax'` | another site making an authenticated request on your behalf (CSRF) |
| `maxAge` | a stolen cookie working forever |

All four are set in `jambo-api/src/auth/auth.controller.ts`.

---

## Rule 2 — The front end never validates a token. It reacts to a 401.

```js
// ❌ a component cannot know if a token is valid
if (isTokenValid(token)) showInvoices();

// ✅ ask the API, handle the refusal
try {
  const invoices = await apiGet('/invoices');
} catch (err) {
  if (err.status === 401) router.push('/login');
}
```

Only the API holds the secret that signed the token. **Anything the browser
concludes about auth is a UI convenience, never a security boundary.**

A hidden button is not protection. Assume every route is called directly by
someone who edited the URL — because eventually it will be.

---

## Rule 3 — Redirect before rendering, not inside a component

**Today, opening `/fr/factures/nouvelle` with no cookie:**

```
1. Browser asks for the page
2. Next starts rendering  factures/nouvelle/page.tsx
3. The page calls         apiGet('/members', cookie)   ← empty cookie
4. API answers            401
5. apiGet throws          ApiError
6. Nobody catches it   →  error screen
```

The page **started rendering** before discovering the user isn't allowed in.

**With the check in middleware:**

```
1. Browser asks for the page
2. middleware.ts runs     ← BEFORE any file in app/ is touched
3. Reads the cookie       absent
4. Returns a redirect
5. Browser goes to        /fr/login
```

Nothing rendered, nothing fetched.

> **Middleware is a door you pass through to reach the building.
> A check inside a component is a bouncer who stops you after you've walked
> into the room.**

```js
// src/middleware.ts
export default function middleware(req: NextRequest) {
  const isPublic = req.nextUrl.pathname.includes('/login');
  const hasToken = req.cookies.has('access_token');

  if (!isPublic && !hasToken) {
    return NextResponse.redirect(new URL('/fr/login', req.url));
  }

  return intlMiddleware(req);
}
```

It only checks the cookie **exists**, not that it's valid — Rule 2 still
holds. This just avoids rendering a page for someone obviously logged out.

---

## Rule 4 — One source of truth for the user

**A layout cannot pass props to its pages.** This is specific to the App
Router and it's why context exists here.

```
[locale]/layout.tsx          ← wants to share the user
  └── (app)/layout.tsx
        └── factures/nouvelle/page.tsx
              └── InvoiceForm
                    └── InvoiceLineRow    ← needs: is the user admin?
```

```js
// layout.tsx
const user = await apiGet('/auth/profile');
return <div>{children}</div>;     // ← no way to give `user` to children
```

`children` arrives already built. You render it; you cannot inject props into
it. So without context, **every page refetches**:

```js
// factures/page.tsx    apiGet('/auth/profile')   request #2
// membres/page.tsx     apiGet('/auth/profile')   request #3
// produits/page.tsx    apiGet('/auth/profile')   request #4
```

Context is a **side channel**. The layout puts a value in; anything below
reads it, skipping every level in between.

```js
// layout.tsx — fetch once
<UserProvider user={user}>{children}</UserProvider>

// InvoiceLineRow.tsx — four levels down
const user = useUser();
if (user.role === 'admin') { /* show the manufacturer field */ }
```

`InvoiceForm` in the middle never sees `user` and doesn't know it exists.

> **Props are a bucket brigade — each level hands to the next.
> Context is a pipe from the roof to any floor.**

---

## Rule 5 — Never say which half of the credentials is wrong

```js
// ❌ confirms the address exists
if (emailNotFound) setError('No account with that email');

// ✅
setError(t('errors.badCredentials'));   // "Email or password incorrect"
```

Distinguishing the two lets someone test a list of addresses against your
system and learn which ones are real.

On the **change-password** screen the opposite is fine: the person is already
authenticated, so "current password is wrong" reveals nothing new.

---

## Rule 6 — Errors travel as codes, sentences live in the front end

The API throws `CONCENTRATE_REQUIRES_DILUTION`, never a phrase. The front end
decides the wording. That's what makes it translatable, and what lets a test
assert on an error without depending on its phrasing.

```js
if (t.has(`errors.${err.code}`)) {
  setError(t(`errors.${err.code}`));
} else {
  setError(t('errors.unknown', { code: err.code }));
}
```

**`t.has()` first.** An untranslated code would otherwise throw at render — a
missing translation must degrade, not crash.

---

# Part 2 — React and Next.js

## Rule 7 — Never mutate state. Return a new object.

React decides whether to redraw by comparing **references**, not contents.

```js
// ❌ same array reference — the screen freezes, no error anywhere
lines[i].rawLabel = 'x';
setLines(lines);

// ✅ a new array
setLines((current) =>
  current.map((line, idx) => (idx === i ? { ...line, rawLabel: 'x' } : line))
);
```

| Operation | Mutates ❌ | Returns new ✅ |
|---|---|---|
| add | `arr.push(x)` | `[...arr, x]` |
| remove | `arr.splice(i, 1)` | `arr.filter((_, idx) => idx !== i)` |
| edit one | `arr[i].f = v` | `arr.map(...)` with spread |

**But `const` is fine for an array you `push` into**, as long as you never
reassign it:

```js
const rows = [];
rows.push(x);        // ✅ filling the box
rows = [1, 2, 3];    // ❌ swapping the box
```

---

## Rule 8 — Use the updater form of a setter

```js
// ❌ two updates in the same tick both read the same stale `lines`
setLines([...lines, newLine]);

// ✅ `current` is always the latest
setLines((current) => [...current, newLine]);
```

---

## Rule 9 — Server Component by default, Client Component only when needed

| Needs | Which |
|---|---|
| `useState`, `useEffect`, `onClick`, `onChange` | Client — `'use client'` |
| fetching data, reading cookies, secrets | Server — the default |

**A Server Component's code never reaches the browser.** That's why
`getServerCookie()` can read cookies and a client component can't.

`'use client'` marks a **boundary**, not a file: everything imported below it
becomes client code too. Push it as deep as possible — `app-nav.tsx` is a
client component so the layout around it doesn't have to be.

---

## Rule 10 — Server Components have no cookie jar

```js
// browser — the browser attaches the cookie itself
await apiPost('/auth/login', { email, password });

// Server Component — you forward it by hand
const cookie = await getServerCookie();
await apiGet('/members', cookie);
```

A Server Component runs on the Next.js server. `credentials: 'include'` does
nothing there. That's what the third parameter of `apiGet` is for, and why
it's always absent in client code.

---

## Rule 11 — `Promise.all` for calls that don't depend on each other

```js
// ❌ three round trips, one after the other
const members = await apiGet('/members', cookie);
const dists   = await apiGet('/distributors', cookie);

// ✅ in parallel
const [members, dists] = await Promise.all([
  apiGet('/members', cookie),
  apiGet('/distributors', cookie),
]);
```

Sequential `await` is only right when the second call **needs** the first
result.

---

## Rule 12 — `for..of` or an index loop, depending on what you need

```js
// one array — for..of
for (const site of sites) { total += grossForSite(site); }

// two parallel arrays — you need the index to pair them
for (let i = 0; i < sites.length; i++) {
  netForSite(grossPerSite[i], factor, sites[i].sector.floorPerSite);
}
```

And **never `.map()` with `await` inside a transaction** — it launches every
promise at once on the same connection.

---

## Rule 13 — With i18n, import navigation from `@/i18n/navigation`

```js
// ❌ → /factures → 404, because every real URL starts with /fr or /en
import Link from 'next/link';

// ✅ → /fr/factures
import { Link, useRouter, redirect, usePathname } from '@/i18n/navigation';
```

`usePathname` from there also **strips** the prefix, so `startsWith('/factures')`
works without knowing the current language.

Forgetting once gives a 404 that only shows in the other language — exactly
the bug a client finds before you do.

---

## Rule 14 — `finally` for anything that must un-stick the UI

```js
setSubmitting(true);
try {
  await save();
  router.push('/done');      // returns early
} catch (err) {
  setError(...);
} finally {
  setSubmitting(false);      // runs on success, error, AND early return
}
```

Put it in the success path and a failed attempt leaves the button disabled
forever.

---

## Rule 15 — A stub should fail loudly

```js
function updateLine() {
  throw new Error('updateLine: to be written');   // ✅ obvious
}

function updateLine() {}                          // ❌ silently does nothing
```

An empty function looks like working code that does the wrong thing. A throw
tells you exactly what's missing and where.

---

## Rule 16 — Money is formatted for display, never computed in the browser

Prices arrive as strings. `lib/format.ts` converts **for display only**.

The moment you need a sum, a total, or a percentage of money, ask the API —
it computes in SQL, where the arithmetic is exact.

The one safe exception: a ratio used to size something in pixels. Float error
is invisible there.

**Four decimals on cost per use unit, not two.** A cost per sheet is around
`0.012 $`. Rounded to the cent, `0.0120` and `0.0149` both show as `0.01 $` —
24 % of difference made invisible. That difference is the product.

---

## Rule 17 — Don't install a form library before you feel the pain

`react-hook-form` and `zod` are right for twenty fields with real validation.
They're overhead for two fields and "not empty".

Adopting an abstraction before you've felt the problem means learning the
abstraction instead of the mechanics underneath.

Revisit when the invoice form has twenty lines × six fields and hand-rolled
state actually hurts.

---

## Rule 18 — VS Code keeps deleted files open

Move or delete a file that's open in a tab and VS Code can re-save it to the
old path. You then edit a file nothing imports and wonder why nothing changes.

After moving files: close the tabs, reopen from the new path.

---

*Next rules to add, once they bite: data fetching and cache invalidation,
optimistic updates, error boundaries, loading states.*

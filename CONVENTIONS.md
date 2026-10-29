# Conventions — jambo-web

Règles d'écriture pour tout le code du frontend.

**Principe :** le code doit être lisible par quelqu'un qui apprend encore
TypeScript. Un fichier court mais illisible est un mauvais fichier. On préfère
trois lignes claires à une ligne astucieuse.

---

## 1. Fonctions

Déclaration classique quand c'est une fonction nommée du module :

```typescript
// OUI
export async function apiGet<T>(path: string): Promise<T> {
  return request<T>('GET', path);
}
```

Fonction fléchée acceptée quand c'est court et local — **mais toujours avec des
accolades et un `return` explicite** :

```typescript
// OUI
const doubler = (x: number) => {
  return x * 2;
};

// NON — return implicite, illisible dès que ça grandit
const doubler = (x: number) => x * 2;
```

Jamais d'objet rempli de fonctions fléchées. Quatre fonctions exportées valent
mieux qu'un objet à quatre propriétés.

---

## 2. Conditions

`if` plutôt que ternaire :

```typescript
// OUI
let jsonBody: string | undefined = undefined;

if (body !== undefined) {
  jsonBody = JSON.stringify(body);
}

// NON
const jsonBody = body === undefined ? undefined : JSON.stringify(body);
```

Comparaison explicite plutôt que négation :

```typescript
if (response.ok === false) { ... }   // OUI
if (!response.ok) { ... }            // NON
```

---

## 3. Variables intermédiaires

`.map()`, `.filter()` et `.find()` sont les bienvenus — ils disent clairement
leur intention. Ce qu'on évite, c'est la **chaîne** qui fait plusieurs choses
sur une seule ligne.

```typescript
// OUI — map lisible, résultat nommé, join sur sa propre ligne
const parts = store.getAll().map((item) => {
  return `${item.name}=${item.value}`;
});

return parts.join('; ');

// NON — trois opérations empilées, rien de nommé
return store.getAll().map((c) => `${c.name}=${c.value}`).join('; ');
```

La règle : **une opération par ligne, et chaque résultat intermédiaire porte un
nom**. Si une ligne fait trois choses, elle en fait deux de trop.

---

## 4. Déstructuration

Éviter la déstructuration avec valeurs par défaut dans les paramètres. Nommer
les paramètres directement :

```typescript
// OUI
async function request<T>(method: string, path: string, body?: unknown) { ... }

// NON
async function request<T>(path: string, options: RequestOptions = {}) {
  const { method = 'GET', body, cache = 'no-store' } = options;
}
```

---

## 5. Génériques

`<T>` est autorisé — c'est le seul concept abstrait qu'on garde, parce qu'il
évite de caster à chaque appel. Toujours utilisé de la même façon :

```typescript
const pools = await apiGet<PoolWithProduct[]>('/pools');
```

Pas d'autre acrobatie de types. Pas de types conditionnels, pas de `infer`, pas
de types mappés.

---

## 6. Commentaires

Chaque fichier commence par un en-tête : `FILE`, `ROLE`, et le raisonnement
derrière les décisions non évidentes.

Dans les fonctions longues, numéroter les étapes :

```typescript
// 1. Construire les en-têtes.
// 2. Convertir le corps en texte.
// 3. Appeler l'API.
```

Le commentaire dit **pourquoi**, jamais **quoi**. `// incrémente i` est inutile.
`// on verrouille le pool en premier pour éviter les interblocages` est utile.

---

## 7. L'argent

Les NUMERIC arrivent de l'API en **string** (`"140.00"`). Jamais d'addition
d'argent en JavaScript — `0.1 + 0.2` donne `0.30000000000000004`.

Les totaux sont calculés en SQL. `lib/format.ts` ne fait que de l'affichage.

Seule exception : le pourcentage de remplissage d'un groupage, qui dimensionne
une barre en pixels et n'est jamais affiché comme une devise.

---

## 8. Notions avancées — demander avant

Les notions complexes sont parfois le bon outil. Mais elles ne doivent **jamais
apparaître directement dans le code sans avertissement**.

Avant d'en introduire une, il faut :

1. **Demander** — proposer la notion, ne pas l'écrire d'office
2. **Expliquer ce qu'elle fait**, en une ou deux phrases
3. **Dire pourquoi elle convient ici**, et ce qu'on perdrait sans elle
4. **Laisser le temps de chercher** avant de l'écrire dans un fichier

Une notion qu'on ne comprend pas est une dette : on ne peut ni la corriger, ni
la modifier, ni expliquer le fichier à quelqu'un d'autre.

Notions qui arrivent bientôt dans ce projet, à traiter ainsi :

- Server Components et Client Components (`'use client'`)
- Les hooks React : `useState`, `useEffect`
- Le Context React, pour la session
- Les Server Actions et la soumission de formulaires
- La validation de schémas (Zod)

---

## 9. Structure des dossiers

```
src/app/          les routes — nom du dossier = segment d'URL
src/components/   composants React réutilisables
src/components/ui/ composants shadcn — générés, mais nous appartiennent
src/lib/          tout ce qui ne rend rien à l'écran
```

Règle pour `lib/` : **si ça n'affiche rien, ça va là**.

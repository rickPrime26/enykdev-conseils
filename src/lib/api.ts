// ===========================================================================
// FILE:  lib/api.ts
// ROLE:  The only place in the frontend that talks to jambo-api.
//
// WHY A WRAPPER AND NOT BARE fetch()
//   Auth is a JWT in an httpOnly cookie. The browser sends that cookie only
//   if you ask, and asking is `credentials: 'include'`. Forget it on one call
//   and that call gets a 401 that looks exactly like a broken login.
//
//   mora-web calls fetch() directly in ten files, and one of them forgot it.
//   Setting it once, here, makes forgetting impossible.
//
// HOW TO USE IT
//   Client Component ('use client') — the browser has the cookie:
//     const pools = await apiGet<PoolWithProduct[]>('/pools');
//
//   Server Component — the server has no cookie jar, so fetch it and pass it:
//     const cookie = await getServerCookie();
//     const pools  = await apiGet<PoolWithProduct[]>('/pools', cookie);
//
// ABOUT <T>
//   <T> means "a type the caller will name". It lets one function serve every
//   endpoint while still returning the right type:
//     apiGet<PoolWithProduct[]>('/pools')   -> PoolWithProduct[]
//     apiGet<BuyerOrder[]>('/orders/me')    -> BuyerOrder[]
// ===========================================================================

// DEUX ADRESSES POUR LA MÊME API.
//
//   Navigateur       -> http://localhost:3001   (hors du réseau Docker)
//   Server Component -> http://api:3001         (nom de service, dans le réseau)
//
// Un Server Component tourne DANS le conteneur web : « localhost » y désigne
// le conteneur lui-même, où rien n'écoute sur 3001. D'où « fetch failed ».
//
// typeof window === 'undefined' distingue les deux : window n'existe que dans
// le navigateur. Hors Docker, INTERNAL_API_URL est absent et les deux
// retombent sur localhost — rien ne change.
const BROWSER_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const SERVER_URL = process.env.INTERNAL_API_URL ?? BROWSER_URL;

const BASE_URL = typeof window === 'undefined' ? SERVER_URL : BROWSER_URL;

// ---------------------------------------------------------------------------
// ApiError — thrown whenever the API answers with a failure status.
//
// `code` is the backend's string, like POOL_IS_CLOSED. It is for your code to
// switch on, never for a user to read. lib/format.ts turns it into French.
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// ---------------------------------------------------------------------------
// request — the one function that actually calls fetch.
// Everything below delegates to it.
// ---------------------------------------------------------------------------
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  cookie?: string,
): Promise<T> {
  // 1. Build the headers, one at a time.
  const headers: Record<string, string> = {};

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (cookie !== undefined) {
    headers['Cookie'] = cookie;
  }

  // 2. Turn the body into text, but only if there is one.
  //    JSON.stringify(undefined) returns the STRING "undefined", which the
  //    server would try to parse and reject. So keep it truly undefined.
  let jsonBody: string | undefined = undefined;

  if (body !== undefined) {
    jsonBody = JSON.stringify(body);
  }

  // 3. Make the call.
  const url = `${BASE_URL}${path}`;

  const response = await fetch(url, {
    method: method,
    headers: headers,
    body: jsonBody,
    credentials: 'include', // sends the auth cookie
    cache: 'no-store', // pool volumes change constantly, never cache them
  });

  // 4. Failure: dig the backend's error code out of the body.
  if (response.ok === false) {
    let code = `HTTP_${response.status}`;

    try {
      const payload = await response.json();

      // Nest answers { message, error, statusCode } — `message` holds our code.
      if (payload && typeof payload.message === 'string') {
        code = payload.message;
      }
    } catch {
      // The body was not JSON. Keep the generic HTTP_xxx code.
    }

    throw new ApiError(response.status, code);
  }

  // 5. A 204 has no body at all, so response.json() would throw. Stop here.
  if (response.status === 204) {
    return undefined as T;
  }

  // 6. Success. `as T` is a promise you make to TypeScript, not a check —
  //    if the API returns something else, nothing will catch it.
  const data = await response.json();
  return data as T;
}

// ---------------------------------------------------------------------------
// One function per HTTP verb.
//
// `cookie` is optional and only used by Server Components — in the browser it
// stays undefined and the browser attaches the cookie by itself.
// ---------------------------------------------------------------------------

export async function apiGet<T>(path: string, cookie?: string): Promise<T> {
  return request<T>('GET', path, undefined, cookie);
}

export async function apiPost<T>(
  path: string,
  body?: unknown,
  cookie?: string,
): Promise<T> {
  return request<T>('POST', path, body, cookie);
}

export async function apiPatch<T>(
  path: string,
  body?: unknown,
  cookie?: string,
): Promise<T> {
  return request<T>('PATCH', path, body, cookie);
}

export async function apiDelete<T>(path: string, cookie?: string): Promise<T> {
  return request<T>('DELETE', path, undefined, cookie);
}

// ---------------------------------------------------------------------------
// getServerCookie — Server Components only.
//
// A Server Component runs on the Next.js server, where there is no browser and
// therefore no cookie jar. `credentials: 'include'` does nothing there. You
// have to read the cookies off the incoming request and forward them by hand.
//
// The import is INSIDE the function on purpose: 'next/headers' is server-only,
// and a top-level import would drag it into client bundles and break the build.
// ---------------------------------------------------------------------------
export async function getServerCookie(): Promise<string> {
  const { cookies } = await import('next/headers');
  const store = await cookies();

  // store.getAll() gives an array of cookie objects:
  //   [{ name: 'access_token', value: 'eyJhbGc...' }]
  //
  // .map() walks that array and replaces each item with whatever the function
  // returns — same number of items, different contents. Here each object
  // becomes the string "name=value".
  const parts = store.getAll().map((item) => {
    return `${item.name}=${item.value}`;
  });

  // parts is now ["access_token=eyJhbGc..."].
  // .join('; ') glues the array into one string, putting "; " between items,
  // which is the separator a Cookie header expects.
  return parts.join('; ');
}

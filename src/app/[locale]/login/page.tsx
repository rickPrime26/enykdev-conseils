// ===========================================================================
// FILE:  app/login/page.tsx
// ROLE:  Sign in. The only screen reachable without a cookie.
//
// WHY IT SITS OUTSIDE (app)
//   The (app) route group wraps every page in AppNav. A login screen showing
//   links to Invoices and Matching would be showing the door handles of a
//   locked building.
//
// WHY IT IS A CLIENT COMPONENT
//   It holds state — two fields, an error, a pending flag — and it reacts to
//   a submit. None of that exists on the server.
//
// HOW THE COOKIE GETS SET
//   The API answers with Set-Cookie: access_token=…; HttpOnly. HttpOnly means
//   JavaScript cannot read it, which is the point: a script injected into the
//   page cannot steal the token.
//
//   So there is nothing to store here. The browser keeps the cookie and
//   attaches it to every later request, as long as the call carries
//   credentials: 'include' — which lib/api.ts already does.
// ===========================================================================

'use client';


import { useState } from 'react';
import { useTranslations } from 'next-intl';
// useRouter from @/i18n/navigation, NOT next/navigation: it prepends the
// current locale, so router.push('/factures/nouvelle') lands on
// /fr/factures/nouvelle instead of a 404.
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { LoginResponse } from '@/lib/types';
import { apiPost, ApiError } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();

  // No argument: keys are read from the root, so both 'login.email' and
  // 'errors.badCredentials' are reachable from the same t.
  const t = useTranslations();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);


  async function handleSubmit(event: React.FormEvent) {
    // Without this the browser reloads the page and the request never fires.
    event.preventDefault();
    setError(null);

    if (email === '' || password === '') {
      setError(t('errors.fieldsRequired'));
      return;
    }

    setSubmitting(true);

    try {
      // No cookie argument — the browser has its own jar. The third
      // parameter of apiPost exists only for Server Components.
      const result = await apiPost<LoginResponse>('/auth/login', {
        email,
        password,
      });

      // A temporary password blocks every other route with a 403. Send them
      // to the only screen that still works.
      if (result.user.must_change_password === true) {
        router.push('/changer-mot-de-passe');
        return;
      }

      router.push('/factures/nouvelle');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          // Never say WHICH of the two is wrong — that confirms the address
          // exists.
          setError(t('errors.badCredentials'));
        } else if (t.has(`errors.${err.code}`)) {
          setError(t(`errors.${err.code}`));
        } else {
          // t.has() first: an untranslated code would throw at render.
          setError(t('errors.unknown', { code: err.code }));
        }
      } else {
        // Not an ApiError: network down, API not started.
        setError(t('errors.unreachable'));
      }
    } finally {
      // In a finally, so a failure re-enables the button too.
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('login.title')}
          </h1>
          <p className="text-sm text-muted-foreground">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t('login.email')}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">{t('login.password')}</Label>
            {/* type="password" masks it, and autoComplete tells the browser's
                password manager which field is which. */}
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error !== null ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? t('login.submitting') : t('login.submit')}
          </Button>
        </form>
      </div>
    </div>
  );
}

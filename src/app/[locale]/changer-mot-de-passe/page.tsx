// ===========================================================================
// FILE:  app/changer-mot-de-passe/page.tsx
// ROLE:  Replace a temporary password. The only screen reachable while
//        must_change_password is true.
//
// WHY THIS PAGE HAS TO EXIST
//   An admin provisioning an account does not choose the password — the
//   server generates a random one and returns it once. Until the holder
//   replaces it, PasswordChangeGuard on the API rejects every other route
//   with a 403.
//
//   Without this screen, that person logs in successfully and then finds
//   every page broken, with nothing saying why.
//
// WHY IT SITS OUTSIDE (app)
//   Same reason as login: AppNav would show links to screens that all 403.
//
// THE API SIDE ALREADY EXISTS
//   PATCH /users/password, body { currentPassword, newPassword }.
//   It carries @AllowPasswordChange, the decorator that tells
//   PasswordChangeGuard to let this one route through.
// ===========================================================================

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
// From @/i18n/navigation so router.push keeps the locale prefix.
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ChangePasswordPage() {
  const router = useRouter();
  const t = useTranslations();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =========================================================================
  // TO WRITE — handleSubmit
  // =========================================================================
  //
  // [C] CHECK — the three fields are filled.
  //
  // [C] CHECK — newPassword === confirmation.
  //
  //     The confirmation field exists ONLY for this comparison. It is never
  //     sent — the API has no use for it. Its whole purpose is catching a
  //     typo in a field the user cannot read back.
  //
  // [C] CHECK — newPassword !== currentPassword.
  //     Otherwise the flag clears without anything actually changing.
  //
  // [C] CHECK — minimum length. Pick a number and say it in the message.
  //     "Too short" without a threshold makes people guess.
  //
  // [A] ACT — apiPatch('/users/password', { currentPassword, newPassword })
  //
  //     apiPatch, not apiPost. The route is a PATCH: it modifies one field
  //     of an existing resource rather than creating one.
  //
  //     Note the field names: the DTO expects currentPassword and
  //     newPassword, camelCase, exactly as declared in
  //     jambo-api/src/users/dto/change-password.dto.ts.
  //
  // [C] CHECK — the error path.
  //     401 means the current password is wrong. Here, unlike on the login
  //     screen, saying so is fine: the person is already authenticated, so
  //     there is no account to confirm the existence of.
  //
  // [R] RESPOND — router.push('/factures/nouvelle')
  //
  //     ⚠ THE COOKIE IS NOT RE-ISSUED. The JWT was signed before the change
  //     and stays valid for its remaining lifetime — the API reads
  //     must_change_password from the DATABASE on each request, not from the
  //     token. So no re-login is needed, and forcing one would just be
  //     friction.
  //
  //     Worth testing rather than trusting: change the password, then load
  //     /factures/nouvelle without logging in again. If it 403s, the guard
  //     reads the flag from the token and this page needs to redirect to
  //     /login instead.
  //
  // setSubmitting(true) before, false in a finally.
  // =========================================================================
  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    throw new Error('handleSubmit: to be written');
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t('changePassword.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('changePassword.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current">{t('changePassword.current')}</Label>
            {/* autoComplete="current-password" tells the password manager
                this is the one already stored, so it offers to fill it. */}
            <Input
              id="current"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new">{t('changePassword.new')}</Label>
            {/* "new-password" on both fields below: it tells the manager to
                offer a generated password rather than autofill the old one. */}
            <Input
              id="new"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm">{t('changePassword.confirm')}</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
            />
          </div>

          {error !== null ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? t('changePassword.submitting')
              : t('changePassword.submit')}
          </Button>
        </form>
      </div>
    </div>
  );
}

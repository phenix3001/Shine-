import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'wouter';
import { PageBackLink } from '../components/PageBackLink';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { authErrorMessage } from '../lib/authErrors';
import { useLanguage } from '../lib/i18n';
import { getAccountCopy } from '../lib/accountCopy';

export function ResetPasswordPage() {
  const { user, isLoading } = useAuth();
  const { language } = useLanguage();
  const copy = getAccountCopy(language);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('');
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) { setMessage(copy.passwordMismatch); return; }
    setSaving(true); setMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setMessage(authErrorMessage(error, language));
      else { setSaved(true); setPassword(''); setConfirmation(''); }
    } catch (error) { setMessage(authErrorMessage(error, language)); }
    finally { setSaving(false); }
  }
  return <main className="seller-page">
    <PageBackLink />
    <section className="profile-hero"><div><h1>{copy.newPassword}</h1><span>{copy.recoveryTitle}</span></div></section>
    <section className="profile-settings">
      {isLoading ? <p>{copy.checkingLink}</p> : !user ? <p>{copy.expiredLink}</p>
        : saved ? <div role="status"><p>{copy.passwordSaved}</p><Link href="/profile">{copy.goToProfile}</Link></div>
        : <form className="account-form" onSubmit={save}>
          <label>{copy.newPassword}<input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={saving} /></label>
          <label>{copy.repeatPassword}<input type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required disabled={saving} /></label>
          {message && <p role="status">{message}</p>}
          <button className="seller-submit" disabled={saving}>{saving ? copy.savingPassword : copy.savePassword}</button>
        </form>}
    </section>
  </main>;
}

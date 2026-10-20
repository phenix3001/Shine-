import { FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '../lib/auth';
import { getGoogleAuthStatus, supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';

import { AuthForm } from './AuthForm';
import type { AuthMode } from './AuthForm';
import { authErrorMessage } from '../lib/authErrors';
import { getAccountCopy } from '../lib/accountCopy';
import { UserAvatar } from './UserAvatar';

type AccountMenuProps = { compact?: boolean };

export function AccountMenu({ compact = false }: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user, isLoading: isAuthLoading } = useAuth();
  const { language, t } = useLanguage();
  const copy = getAccountCopy(language);
  const dialogRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (user) { setIsOpen(false); setPassword(''); setMessage(''); }
  }, [user]);

  useEffect(() => {
    if (!isOpen || user) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLElement>('input, button')?.focus();
    function handleDialogKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
      if (event.key !== 'Tab') return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href]');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', handleDialogKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleDialogKey);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [isOpen, user]);

  async function handleEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage('');
    try {
      const result = mode === 'signup'
        ? await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) setMessage(authErrorMessage(result.error, language));
      else if (mode === 'signup' && !result.data.session) setMessage(copy.signUpConfirmation);
      else { setPassword(''); setIsOpen(false); }
    } catch (error) { setMessage(authErrorMessage(error, language)); }
    finally { setIsLoading(false); }
  }

  async function handleGoogleAuth() {
    setMessage(''); setIsLoading(true);
    try {
      const status = await getGoogleAuthStatus();
      if (status === 'disabled') { setMessage(copy.googleUnavailable); return; }
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
      if (error) setMessage(authErrorMessage(error, language));
    } catch (error) { setMessage(authErrorMessage(error, language)); }
    finally { setIsLoading(false); }
  }

  function openSignIn() {
    setMode('signin'); setMessage(''); setIsOpen(true);
  }

  async function handlePasswordReset() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setMessage(copy.enterRecoveryEmail); return; }
    setIsLoading(true); setMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
      if (error) setMessage(authErrorMessage(error, language));
      else setMessage(copy.recoveryEmailSent);
    } catch (error) { setMessage(authErrorMessage(error, language)); }
    finally { setIsLoading(false); }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage('');
  }

  return <div className={`account-menu${compact ? ' sidebar-account-menu' : ''}`} data-label={compact ? t(user ? 'profile' : 'signIn') : undefined}>
    {user ? <Link href="/profile" className="account-button account-avatar" aria-label={t('openProfile')}>
      <UserAvatar user={user} />
    </Link> : <button className={compact ? 'sidebar-login-button' : 'register-button'} disabled={isAuthLoading} aria-label={compact ? t('signIn') : undefined} aria-haspopup="dialog" onClick={openSignIn}>{compact ? <i className="sidebar-user-icon" aria-hidden="true" /> : t('signIn')}</button>}

    {isOpen && !user && <div className="account-modal-backdrop" onMouseDown={() => setIsOpen(false)}>
      <section ref={dialogRef} className="account-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="account-modal-close" type="button" aria-label={copy.close} onClick={() => setIsOpen(false)}>×</button>
        <AuthForm
          email={email} password={password} message={message} mode={mode} isLoading={isLoading}
          onEmailChange={setEmail} onPasswordChange={setPassword} onModeChange={changeMode}
          onSubmit={handleEmailAuth} onGoogleAuth={handleGoogleAuth} onPasswordReset={handlePasswordReset}
        />
      </section>
    </div>}
  </div>;
}

import type { FormEvent } from 'react';
import { isSupabaseConfigured } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';
import { getAccountCopy } from '../lib/accountCopy';

export type AuthMode = 'signin' | 'signup';
type AuthFormProps = {
  email: string; password: string; message: string; mode: AuthMode; isLoading: boolean;
  onEmailChange: (value: string) => void; onPasswordChange: (value: string) => void;
  onModeChange: (mode: AuthMode) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onGoogleAuth: () => void;
  onPasswordReset: () => void;
};

export function AuthForm(props: AuthFormProps) {
  const { language, t } = useLanguage();
  const copy = getAccountCopy(language);
  if (!isSupabaseConfigured) return <div><h2 id="auth-title">{copy.authUnavailable}</h2><p className="account-message">{copy.authUnavailableHint}</p></div>;
  const isSignIn = props.mode === 'signin';
  const action = isSignIn ? t('signIn') : copy.signUpAction;
  return <form className="account-form" onSubmit={props.onSubmit}>
    <h2 id="auth-title">{action}</h2>
    <p className="auth-intro">{isSignIn ? copy.signInIntro : copy.signUpIntro}</p>
    <button type="button" className="google-button" disabled={props.isLoading} onClick={props.onGoogleAuth}><span className="google-icon" aria-hidden="true">G</span>{isSignIn ? copy.googleSignIn : copy.googleSignUp}</button>
    <div className="form-divider"><span>{copy.or}</span></div>
    <label>{copy.email}<input type="email" autoComplete="email" value={props.email} disabled={props.isLoading} onChange={(event) => props.onEmailChange(event.target.value)} required /></label>
    <label>{copy.password}<input type="password" autoComplete={isSignIn ? 'current-password' : 'new-password'} value={props.password} disabled={props.isLoading} onChange={(event) => props.onPasswordChange(event.target.value)} minLength={isSignIn ? undefined : 8} required /></label>
    {isSignIn && <button type="button" className="auth-switch" disabled={props.isLoading} onClick={props.onPasswordReset}>{copy.forgotPassword}</button>}
    {props.message && <p className="account-message" role="status">{props.message}</p>}
    <button className="account-sign-in" disabled={props.isLoading}>{props.isLoading ? copy.pleaseWait : action}</button>
    <p className="auth-switch-text">{isSignIn ? copy.noAccount : copy.hasAccount} <button type="button" className="auth-switch" disabled={props.isLoading} onClick={() => props.onModeChange(isSignIn ? 'signup' : 'signin')}>{t(isSignIn ? 'register' : 'signIn')}</button></p>
  </form>;
}

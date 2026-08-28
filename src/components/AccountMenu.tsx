import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'wouter';
import { getUserAvatarUrl, useAuth } from '../lib/auth';
import { getGoogleAuthStatus, isSupabaseConfigured, supabase } from '../lib/supabase';
import { useLanguage } from '../lib/i18n';

type AuthMode = 'signin' | 'signup';

type AccountMenuProps = { compact?: boolean };

export function AccountMenu({ compact = false }: AccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { t } = useLanguage();

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  useEffect(() => {
    if (!isOpen || user) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, user]);

  async function handleEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage('');
    const result = mode === 'signup'
      ? await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
      : await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    if (result.error) setMessage(result.error.message);
    else if (mode === 'signup') setMessage('Аккаунт создан. Проверьте почту для подтверждения.');
    else setIsOpen(false);
  }

  async function handleGoogleAuth() {
    setMessage('');
    setIsLoading(true);
    const googleStatus = await getGoogleAuthStatus();
    if (googleStatus === 'disabled') {
      setMessage('Вход через Google пока не включён в настройках сайта. Используйте почту и пароль.');
      setIsLoading(false);
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      const isProviderDisabled = error.message.toLowerCase().includes('provider');
      setMessage(isProviderDisabled ? 'Вход через Google пока не включён в настройках сайта.' : error.message);
    }
    setIsLoading(false);
  }

  function openRegistration() {
    setMode('signup');
    setMessage('');
    setIsOpen(true);
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage('');
  }

  const avatarUrl = getUserAvatarUrl(user);

  return <div className={`account-menu${compact ? ' sidebar-account-menu' : ''}`} data-label={compact ? t(user ? 'profile' : 'register') : undefined}>
    {user ? <Link href="/profile" className="account-button account-avatar" aria-label={t('openProfile')}>
      {avatarUrl ? <img src={avatarUrl} alt="" referrerPolicy="no-referrer" /> : user.email?.charAt(0).toUpperCase() ?? 'Я'}
    </Link> : <button className={compact ? 'sidebar-login-button' : 'register-button'} aria-label={compact ? t('register') : undefined} aria-haspopup="dialog" onClick={openRegistration}>{compact ? <i className="sidebar-user-icon" aria-hidden="true" /> : t('register')}</button>}

    {isOpen && !user && <div className="account-modal-backdrop" onMouseDown={() => setIsOpen(false)}>
      <section className="account-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onMouseDown={(event) => event.stopPropagation()}>
        <button className="account-modal-close" type="button" aria-label="Закрыть" onClick={() => setIsOpen(false)}>×</button>
        <AuthForm
          email={email} password={password} message={message} mode={mode} isLoading={isLoading}
          onEmailChange={setEmail} onPasswordChange={setPassword} onModeChange={changeMode}
          onSubmit={handleEmailAuth} onGoogleAuth={handleGoogleAuth}
        />
      </section>
    </div>}
  </div>;
}

type AuthFormProps = {
  email: string; password: string; message: string; mode: AuthMode; isLoading: boolean;
  onEmailChange: (value: string) => void; onPasswordChange: (value: string) => void;
  onModeChange: (mode: AuthMode) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onGoogleAuth: () => void;
};

function AuthForm(props: AuthFormProps) {
  if (!isSupabaseConfigured) return <p className="account-message">Добавьте настройки Supabase в .env, чтобы включить аккаунты.</p>;
  const isSignIn = props.mode === 'signin';
  const action = isSignIn ? 'Войти' : 'Зарегистрироваться';

  return <form className="account-form" onSubmit={props.onSubmit}>
    <h2 id="auth-title">{action}</h2>
    <p className="auth-intro">{isSignIn ? 'Рады видеть вас снова!' : 'Создайте аккаунт Shine за минуту.'}</p>
    <button type="button" className="google-button" disabled={props.isLoading} onClick={props.onGoogleAuth}><span className="google-icon" aria-hidden="true">G</span>{isSignIn ? 'Войти' : 'Регистрация'} через Google</button>
    <div className="form-divider"><span>или</span></div>
    <label>Почта<input type="email" value={props.email} onChange={(event) => props.onEmailChange(event.target.value)} required /></label>
    <label>Пароль<input type="password" value={props.password} onChange={(event) => props.onPasswordChange(event.target.value)} minLength={6} required /></label>
    {props.message && <p className="account-message">{props.message}</p>}
    <button className="account-sign-in" disabled={props.isLoading}>{props.isLoading ? 'Подождите...' : action}</button>
    <p className="auth-switch-text">{isSignIn ? 'Нет аккаунта?' : 'Уже есть аккаунт?'} <button type="button" className="auth-switch" onClick={() => props.onModeChange(isSignIn ? 'signup' : 'signin')}>{isSignIn ? 'Регистрация' : 'Войти'}</button></p>
  </form>;
}

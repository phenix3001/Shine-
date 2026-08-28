import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';

export function AccountActions() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [message, setMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  if (!user) return null;

  async function signOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  async function sendPasswordReset() {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/profile` });
    setMessage(error ? error.message : 'Ссылка для смены пароля отправлена на почту.');
  }

  async function deleteAccount() {
    const { error } = await supabase.rpc('delete_own_account');
    if (error) { setMessage('Не удалось удалить аккаунт.'); return; }
    await supabase.auth.signOut();
    navigate('/');
  }

  return <section className="account-actions">
    <h3>Управление аккаунтом</h3>
    <p>{user.email}</p>
    <div><button onClick={() => void sendPasswordReset()}>Сменить пароль</button><button onClick={() => void signOut()}>Выйти</button></div>
    {!isDeleting ? <button className="danger-button" onClick={() => setIsDeleting(true)}>Удалить аккаунт</button> : <div className="delete-confirmation"><p>Товары, избранное и заказы будут удалены навсегда.</p><button onClick={() => setIsDeleting(false)}>Отмена</button><button className="danger-button" onClick={() => void deleteAccount()}>Удалить навсегда</button></div>}
    {message && <p className="seller-message" role="status">{message}</p>}
  </section>;
}

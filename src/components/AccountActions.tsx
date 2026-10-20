import { useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { authErrorMessage } from '../lib/authErrors';
import { useLanguage } from '../lib/i18n';
import { getAccountCopy } from '../lib/accountCopy';

export function AccountActions() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const copy = getAccountCopy(language);
  const [, navigate] = useLocation();
  const [message, setMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const actionPending = useRef(false);

  if (!user) return null;

  async function runAction(action: 'signout' | 'password' | 'delete') {
    if (actionPending.current) return;
    actionPending.current = true;
    setIsBusy(true);
    setMessage('');
    try {
      if (action === 'password') {
        if (!user?.email) { setMessage(copy.noRecoveryEmail); return; }
        const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw error;
        setMessage(copy.passwordEmailSent);
        return;
      }
      if (action === 'delete') {
        const { error } = await supabase.rpc('delete_own_account');
        if (error) { setMessage(copy.deleteFailed); return; }
      }
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      navigate('/');
    } catch (error) { setMessage(authErrorMessage(error, language)); }
    finally { actionPending.current = false; setIsBusy(false); }
  }

  return <section className="account-actions">
    <h3>{copy.manageAccount}</h3>
    <p>{user.email}</p>
    <div><button type="button" disabled={isBusy} onClick={() => void runAction('password')}>{copy.changePassword}</button><button type="button" disabled={isBusy} onClick={() => void runAction('signout')}>{copy.signOut}</button></div>
    {!isDeleting ? <button type="button" className="danger-button" disabled={isBusy} onClick={() => setIsDeleting(true)}>{copy.deleteAccount}</button> : <div className="delete-confirmation"><p>{copy.deleteWarning}</p><button type="button" disabled={isBusy} onClick={() => setIsDeleting(false)}>{copy.cancel}</button><button type="button" className="danger-button" disabled={isBusy} onClick={() => void runAction('delete')}>{isBusy ? copy.deleting : copy.deletePermanently}</button></div>}
    {message && <p className="seller-message" role="status">{message}</p>}
  </section>;
}

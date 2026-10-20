import type { Language } from './i18n';
import { getAccountCopy } from './accountCopy';

export function authErrorMessage(error: unknown, language: Language = 'ru'): string {
  const copy = getAccountCopy(language);
  const item = error && typeof error === 'object' ? error as { code?: string; message?: string } : {};
  if (item.code === 'invalid_credentials' || item.message === 'Invalid login credentials') {
    return copy.authInvalidCredentials;
  }
  if (item.code === 'email_not_confirmed') return copy.authEmailUnconfirmed;
  if (item.code === 'same_password') return copy.authSamePassword;
  if (item.code === 'weak_password') return copy.authWeakPassword;
  if (item.code === 'otp_expired' || item.code === 'flow_state_expired') return copy.authExpiredLink;
  if (item.code === 'user_already_exists' || item.message === 'User already registered') return copy.authUserExists;
  if (item.code === 'over_request_rate_limit' || item.code === 'over_email_send_rate_limit') return copy.authRateLimit;
  if (error instanceof TypeError || /fetch|network|timeout/i.test(item.message ?? '')) return copy.authNetworkError;
  return copy.authUnknown;
}

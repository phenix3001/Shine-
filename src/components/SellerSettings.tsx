import { FormEvent, useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { useLanguage } from '../lib/i18n';
import { loadSellerSettings, saveSellerSettings } from '../lib/sellerSettings';

export function SellerSettings() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [shopName, setShopName] = useState('Shine');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [reload, setReload] = useState(0);
  const owner = useRef(user?.id);
  owner.current = user?.id;

  useEffect(() => {
    let active = true;
    setShopName('Shine'); setDescription(''); setContactEmail(''); setMessage(''); setIsSaving(false);
    setLoadState('loading');
    if (!user) return;
    void loadSellerSettings(user.id).then((settings) => {
      if (!active) return;
      setShopName(settings.shop_name);
      setDescription(settings.description);
      setContactEmail(settings.contact_email || user.email || '');
      setLoadState('ready');
    }).catch(() => { if (active) setLoadState('error'); });
    return () => { active = false; };
  }, [user?.id, reload]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || isSaving || loadState !== 'ready') return;
    if (shopName.trim().length < 2) { setMessage(t('shopNameRequired')); return; }
    const userId = user.id;
    setIsSaving(true);
    setMessage('');
    try {
      await saveSellerSettings(user.id, { shop_name: shopName.trim(), description: description.trim(), contact_email: contactEmail.trim() });
      if (owner.current === userId) setMessage(t('settingsSaved'));
    } catch {
      if (owner.current === userId) setMessage(t('settingsError'));
    } finally {
      if (owner.current === userId) setIsSaving(false);
    }
  }

  if (!user) return <p className="seller-state">{t('signInHint')}</p>;
  return <section className="seller-store-settings">
    <h2>{t('sellerSettings')}</h2><p>{t('sellerSettingsIntro')}</p>
    {loadState === 'loading' && <p role="status">{t('loading')}</p>}
    {loadState === 'error' && <div role="alert"><p>{t('settingsError')}</p><button className="seller-back" onClick={() => setReload((current) => current + 1)}>{t('retry')}</button></div>}
    <form className="seller-form" onSubmit={handleSubmit}>
      <fieldset className="seller-form-body" disabled={isSaving || loadState !== 'ready'}>
      <label>{t('shopName')}<input value={shopName} onChange={(event) => setShopName(event.target.value)} minLength={2} maxLength={80} required /></label>
      <label>{t('shopDescription')}<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} /></label>
      <label>{t('contactEmail')}<input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} maxLength={254} /></label>
      <button className="seller-submit" disabled={isSaving}>{isSaving ? t('loading') : t('save')}</button>
      </fieldset>
    </form>
    {message && <p className="seller-message" role="status">{message}</p>}
  </section>;
}

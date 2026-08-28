import { FormEvent, useEffect, useState } from 'react';
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

  useEffect(() => {
    if (!user) return;
    void loadSellerSettings(user.id).then((settings) => {
      setShopName(settings.shop_name);
      setDescription(settings.description);
      setContactEmail(settings.contact_email || user.email || '');
    }).catch(() => setMessage(t('loadError')));
  }, [t, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setIsSaving(true);
    setMessage('');
    try {
      await saveSellerSettings(user.id, { shop_name: shopName.trim(), description: description.trim(), contact_email: contactEmail.trim() });
      setMessage(t('settingsSaved'));
    } catch {
      setMessage(t('loadError'));
    } finally {
      setIsSaving(false);
    }
  }

  if (!user) return <p className="seller-state">{t('signInHint')}</p>;
  return <section className="seller-store-settings">
    <h2>{t('sellerSettings')}</h2><p>{t('sellerSettingsIntro')}</p>
    <form className="seller-form" onSubmit={handleSubmit}>
      <label>{t('shopName')}<input value={shopName} onChange={(event) => setShopName(event.target.value)} minLength={2} maxLength={80} required /></label>
      <label>{t('shopDescription')}<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} /></label>
      <label>{t('contactEmail')}<input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} maxLength={254} /></label>
      <button className="seller-submit" disabled={isSaving}>{isSaving ? t('loading') : t('save')}</button>
    </form>
    {message && <p className="seller-message" role="status">{message}</p>}
  </section>;
}

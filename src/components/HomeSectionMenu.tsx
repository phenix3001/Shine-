import { Link, useLocation } from 'wouter';
import { useLocationProperty } from 'wouter/use-browser-location';
import { useLanguage } from '../lib/i18n';
import { AccountMenu } from './AccountMenu';
import { useCart } from '../lib/cart';

export function HomeSectionMenu() {
  const { t } = useLanguage();
  const { itemCount } = useCart();
  const [location] = useLocation();
  const hash = useLocationProperty(() => window.location.hash);
  const isShop = location === '/' || location === '/market';
  if (location === '/seller' || location.startsWith('/seller/')) return null;

  return (
    <nav className="home-section-menu" aria-label={t('catalog')}>
      <Link href="/#catalog" aria-current={isShop && hash !== '#new' ? 'page' : undefined}><i className="menu-grid-icon" aria-hidden="true"><b /><b /><b /><b /></i><span>{t('catalog')}</span></Link>
      <Link href="/#new" aria-current={isShop && hash === '#new' ? 'page' : undefined}><i className="sidebar-line-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Z" /><path d="m18.5 16 .7 2.3 2.3.7-2.3.7-.7 2.3-.7-2.3-2.3-.7 2.3-.7.7-2.3Z" /></svg></i><span>{t('newItems')}</span></Link>
      <Link href="/about" aria-current={location === '/about' ? 'page' : undefined}><i className="sidebar-line-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><path d="M12 11v5m0-8h.01" /></svg></i><span>{t('about')}</span></Link>
      <Link href="/profile" aria-current={location === '/profile' ? 'page' : undefined}><i className="sidebar-line-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 9c0 5-8 10-8 10S4 14 4 9a4 4 0 0 1 7-2.6A4 4 0 0 1 20 9Z" /></svg></i><span>{t('favorites')}</span></Link>
      <Link href="/cart" className="sidebar-cart-link" aria-current={location === '/cart' ? 'page' : undefined}>
        <i className="sidebar-line-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 4h2l2.5 11h11L21 7H6" /><circle cx="9" cy="19" r="1" /><circle cx="18" cy="19" r="1" /></svg></i>
        {itemCount > 0 && <b className="sidebar-cart-count">{itemCount}</b>}
        <span>{t('cart')}</span>
      </Link>
      <div className="sidebar-account"><AccountMenu compact /></div>
    </nav>
  );
}

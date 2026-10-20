import { useEffect } from 'react';
import { useLocationProperty } from 'wouter/use-browser-location';
import { useLanguage } from '../lib/i18n';

function scrollToCurrentSection() {
  const hash = window.location.hash.slice(1);
  let target = hash;
  try { target = decodeURIComponent(hash); } catch { /* Ignore malformed anchor names. */ }
  if (target) document.getElementById(target)?.scrollIntoView({ block: 'start' });
  else window.scrollTo({ top: 0, behavior: 'instant' });
}

export function RouteEffects() {
  const route = useLocationProperty(() => window.location.pathname + window.location.hash);
  const { t } = useLanguage();

  useEffect(() => {
    const frame = requestAnimationFrame(scrollToCurrentSection);
    return () => cancelAnimationFrame(frame);
  }, [route]);

  useEffect(() => {
    let frame = 0;
    function handleAnchor(event: MouseEvent) {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
      if (link?.hash && link.origin === window.location.origin && link.pathname === window.location.pathname) {
        frame = requestAnimationFrame(scrollToCurrentSection);
      }
    }
    document.addEventListener('click', handleAnchor);
    return () => { document.removeEventListener('click', handleAnchor); cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    const main = document.querySelector<HTMLElement>('main');
    main?.setAttribute('tabindex', '-1');
    const path = route.split('#')[0];
    const title = path === '/cart' ? t('cart') : path === '/profile' ? t('profile')
      : path === '/about' ? t('about') : path.startsWith('/product/') ? t('productDetails')
      : path.startsWith('/seller') ? t('sellerCabinet') : t('catalog');
    document.title = `Shine — ${title}`;
  }, [route, t]);

  return null;
}

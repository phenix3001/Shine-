import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useLanguage } from '../lib/i18n';

export function NotificationsMenu() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const titleId = useId();
  const emptyId = useId();
  const close = useCallback(() => {
    setIsOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    closeButton.current?.focus({ preventScroll: true });
    function dismissOutside(event: Event) {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setIsOpen(false);
    }
    function dismissWithEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); close(); }
    }
    document.addEventListener('pointerdown', dismissOutside);
    document.addEventListener('focusin', dismissOutside);
    document.addEventListener('keydown', dismissWithEscape);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside);
      document.removeEventListener('focusin', dismissOutside);
      document.removeEventListener('keydown', dismissWithEscape);
    };
  }, [isOpen, close]);

  return <div className="notifications-menu" ref={root}>
    <button className="notifications-trigger" type="button" ref={trigger}
      aria-label={t('notifications')} title={t('notifications')} aria-haspopup="dialog"
      aria-expanded={isOpen} aria-controls={isOpen ? panelId : undefined}
      onClick={() => setIsOpen((current) => !current)}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M12 2.5a9.5 9.5 0 0 0-8.55 13.65L2.5 21.5l5.35-.95A9.5 9.5 0 1 0 12 2.5Z" />
        <path className="notifications-icon-lines" d="M8 9h8M8 13h5" />
      </svg>
    </button>
    {isOpen && <section className="notifications-panel" id={panelId} role="dialog" aria-labelledby={titleId} aria-describedby={emptyId}>
      <div className="notifications-heading"><h2 id={titleId}>{t('notifications')}</h2>
        <button type="button" ref={closeButton} onClick={close} aria-label={t('closeNotifications')}>×</button>
      </div>
      <p className="notifications-empty" id={emptyId}>{t('noNotifications')}</p>
    </section>}
  </div>;
}

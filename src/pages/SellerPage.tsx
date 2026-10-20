import { Link, useLocation } from 'wouter';
import { BrandLogo } from '../components/BrandLogo';
import { AccountMenu } from '../components/AccountMenu';
import { SellerSettings } from '../components/SellerSettings';
import { SellerWorkspace } from '../components/SellerWorkspace';

const sections = [
  { path: '/seller', label: 'Управление товарами', icon: '▦', mode: 'products' },
  { path: '/seller/new', label: 'Добавить товар', icon: '+', mode: 'new' },
  { path: '/seller/upload', label: 'Загрузить прайс-лист', icon: '↑', mode: 'upload' },
  { path: '/seller/settings', label: 'Настройки магазина', icon: '⚙', mode: 'settings' },
] as const;

export function SellerPage() {
  const [location] = useLocation();
  const section = sections.find((item) => item.path === location);
  return <main className="merchant-dashboard">
    <aside className="merchant-sidebar">
      <BrandLogo /><p className="merchant-caption">КАБИНЕТ ПРОДАВЦА</p>
      <nav aria-label="Кабинет продавца"><p>ТОВАРЫ И МАГАЗИН</p>
        {sections.map((item) => <Link key={item.path} href={item.path}
          className={location === item.path ? 'selected' : ''} aria-current={location === item.path ? 'page' : undefined}>
          <i aria-hidden="true">{item.icon}</i>{item.label}
        </Link>)}
        {import.meta.env.DEV && <Link href="/import"><i aria-hidden="true">⇣</i>Перенос из Kaspi</Link>}
      </nav>
      <div className="merchant-sidebar-footer"><Link href="/">← Открыть витрину</Link><Link href="/profile">Мой профиль</Link></div>
    </aside>
    <div className="merchant-main">
      <header className="merchant-topbar"><span>Shine <b>/</b> Магазин</span><AccountMenu /></header>
      <div className="merchant-notice">На витрине видны товары со статусом «Опубликован». Черновики доступны только владельцу магазина.</div>
      <div className="merchant-heading"><div><p>УПРАВЛЕНИЕ МАГАЗИНОМ</p><h1>{section?.label ?? 'Раздел не найден'}</h1></div>
        {section?.mode === 'products' && <Link href="/seller/new" className="merchant-primary">+ Добавить товар</Link>}
      </div>
      {!section ? <Link href="/seller">Вернуться к товарам</Link> : section.mode === 'settings'
        ? <SellerSettings /> : <SellerWorkspace key={section.mode} mode={section.mode} />}
    </div>
  </main>;
}

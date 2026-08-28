import { Link } from 'wouter';
import { BrandLogo } from '../components/BrandLogo';
import { ThemeToggle } from '../components/ThemeToggle';

export function NotFoundPage() {
  return <main className="not-found-page">
    <header className="seller-header"><BrandLogo /><ThemeToggle /></header>
    <section><span>404</span><h1>Такой страницы нет</h1><p>Возможно, адрес изменился или был указан неправильно.</p><Link href="/">Вернуться на главную</Link></section>
  </main>;
}

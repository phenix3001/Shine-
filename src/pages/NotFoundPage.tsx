import { Link } from 'wouter';

export function NotFoundPage() {
  return <main className="not-found-page">
    <section><span>404</span><h1>Такой страницы нет</h1><p>Возможно, адрес изменился или был указан неправильно.</p><Link href="/">Вернуться на главную</Link></section>
  </main>;
}

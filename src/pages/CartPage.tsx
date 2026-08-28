import { FormEvent, useState } from 'react';
import { Link } from 'wouter';
import { BrandLogo } from '../components/BrandLogo';
import { CartItemRow } from '../components/CartItemRow';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../lib/auth';
import { useCart } from '../lib/cart';
import { useLanguage } from '../lib/i18n';
import { createOrder } from '../lib/orders';

export function CartPage() {
  const { items, total, setQuantity, removeItem, clearCart } = useCart();
  const { user } = useAuth();
  const { locale } = useLanguage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function handleCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) { setMessage('Войдите в аккаунт через иконку слева, чтобы оформить заказ.'); return; }
    setIsSaving(true);
    setMessage('');
    try {
      const orderId = await createOrder(items, name, phone, address);
      clearCart();
      setMessage(`Заказ ${orderId.slice(0, 8)} создан. Мы свяжемся с вами.`);
    } catch { setMessage('Не удалось оформить заказ. Проверьте данные и попробуйте снова.'); }
    finally { setIsSaving(false); }
  }

  return <main className="cart-page">
    <header className="seller-header"><BrandLogo /><div className="product-page-actions"><ThemeToggle /><Link href="/#catalog">← В каталог</Link></div></header>
    <section className="cart-heading"><p>Ваш выбор</p><h1>Корзина</h1></section>
    {items.length === 0 ? <section className="cart-empty"><p>{message || 'Корзина пока пуста.'}</p><Link href="/#catalog">Перейти в каталог</Link></section> : <div className="cart-layout">
      <section className="cart-list">{items.map((item) => <CartItemRow key={item.id} item={item} locale={locale} onQuantityChange={(quantity) => setQuantity(item.id, quantity)} onRemove={() => removeItem(item.id)} />)}</section>
      <form className="checkout-form" onSubmit={handleCheckout}>
        <h2>Оформление заказа</h2>
        <strong className="cart-total">Итого: {total.toLocaleString(locale)} ₸</strong>
        <label>Имя<input value={name} onChange={(event) => setName(event.target.value)} minLength={2} required /></label>
        <label>Телефон<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} minLength={5} required /></label>
        <label>Адрес доставки<textarea value={address} onChange={(event) => setAddress(event.target.value)} minLength={5} required /></label>
        <button className="seller-submit" disabled={isSaving}>{isSaving ? 'Оформляем...' : 'Оформить заказ'}</button>
        {message && <p className="seller-message" role="status">{message}</p>}
      </form>
    </div>}
  </main>;
}

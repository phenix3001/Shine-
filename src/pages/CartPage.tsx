import { FormEvent, useRef, useState } from 'react';
import { Link } from 'wouter';
import { BrandLogo } from '../components/BrandLogo';
import { CartItemRow } from '../components/CartItemRow';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAuth } from '../lib/auth';
import { useCart } from '../lib/cart';
import { useLanguage } from '../lib/i18n';
import { createOrder, OrderValidationError } from '../lib/orders';
import { getAccountCopy } from '../lib/accountCopy';

export function CartPage() {
  const { items, total, setQuantity, removeItem, clearCart } = useCart();
  const { user } = useAuth();
  const { language, locale, t } = useLanguage();
  const copy = getAccountCopy(language);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const isSubmitting = useRef(false);

  async function handleCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting.current) return;
    if (!user) { setMessage(copy.checkoutLogin); return; }
    isSubmitting.current = true;
    setIsSaving(true);
    setMessage('');
    try {
      const orderId = await createOrder(items, name, phone, address, language);
      clearCart(items);
      setMessage(copy.orderCreated.replace('{order}', orderId.slice(0, 8)));
    } catch (error) { setMessage(error instanceof OrderValidationError ? error.message : copy.checkoutFailed); }
    finally { isSubmitting.current = false; setIsSaving(false); }
  }

  return <main className="cart-page">
    <header className="seller-header"><BrandLogo /><div className="product-page-actions"><ThemeToggle /><Link href="/#catalog">{t('backToCatalog')}</Link></div></header>
    <section className="cart-heading"><p>{copy.yourChoice}</p><h1>{t('cart')}</h1></section>
    {items.length === 0 ? <section className="cart-empty"><p role="status">{message || copy.cartEmpty}</p><Link href="/#catalog">{copy.browseCatalog}</Link></section> : <div className="cart-layout">
      <section className="cart-list" aria-label={copy.cartItems}>{items.map((item) => <CartItemRow key={item.id} item={item} locale={locale} disabled={isSaving} onQuantityChange={(quantity) => setQuantity(item.id, quantity)} onRemove={() => removeItem(item.id)} />)}</section>
      <form className="checkout-form" onSubmit={handleCheckout}>
        <h2>{copy.checkout}</h2>
        <strong className="cart-total">{copy.total}: {total.toLocaleString(locale)} ₸</strong>
        {!user && <p className="seller-message">{copy.checkoutLogin}</p>}
        <label>{copy.name}<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={100} required disabled={isSaving} /></label>
        <label>{copy.phone}<input type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} minLength={5} maxLength={30} required disabled={isSaving} /></label>
        <label>{copy.address}<textarea autoComplete="street-address" value={address} onChange={(event) => setAddress(event.target.value)} minLength={5} maxLength={300} required disabled={isSaving} /></label>
        <button className="seller-submit" disabled={isSaving}>{isSaving ? copy.placingOrder : copy.placeOrder}</button>
        {message && <p className="seller-message" role="status">{message}</p>}
      </form>
    </div>}
  </main>;
}

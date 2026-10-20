import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { cartStorageKey, loadCart, normalizeQuantity, saveCart } from './cartStorage';

export type CartItem = { id: string; name: string; price: number; image: string | null; quantity: number };
type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  setQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: (purchasedItems?: CartItem[]) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  useEffect(() => saveCart(items), [items]);
  useEffect(() => {
    function syncCart(event: StorageEvent) {
      if (event.key === cartStorageKey || event.key === null) setItems(loadCart());
    }
    window.addEventListener('storage', syncCart);
    return () => window.removeEventListener('storage', syncCart);
  }, []);

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    addItem: (next) => setItems((current) => current.some((item) => item.id === next.id)
      ? current.map((item) => item.id === next.id ? { ...next, quantity: Math.min(99, item.quantity + 1) } : item)
      : [...current, { ...next, quantity: 1 }]),
    setQuantity: (id, quantity) => {
      if (Number.isFinite(quantity)) setItems((current) => current.map((item) => item.id === id ? { ...item, quantity: normalizeQuantity(quantity) } : item));
    },
    removeItem: (id) => setItems((current) => current.filter((item) => item.id !== id)),
    clearCart: (purchasedItems) => setItems((current) => purchasedItems ? current.flatMap((item) => {
      const quantity = item.quantity - (purchasedItems.find((purchased) => purchased.id === item.id)?.quantity ?? 0);
      return quantity > 0 ? [{ ...item, quantity }] : [];
    }) : []),
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}

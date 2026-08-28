import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

export type CartItem = { id: string; name: string; price: number; image: string | null; quantity: number };
type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  total: number;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  setQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

function loadCart(): CartItem[] {
  try {
    const saved = JSON.parse(localStorage.getItem('shine-cart') ?? '[]') as unknown;
    return Array.isArray(saved) ? saved.filter((item): item is CartItem => typeof item === 'object' && item !== null && 'id' in item && typeof item.id === 'string') : [];
  } catch { return []; }
}

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  useEffect(() => localStorage.setItem('shine-cart', JSON.stringify(items)), [items]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    addItem: (next) => setItems((current) => current.some((item) => item.id === next.id)
      ? current.map((item) => item.id === next.id ? { ...item, quantity: Math.min(99, item.quantity + 1) } : item)
      : [...current, { ...next, quantity: 1 }]),
    setQuantity: (id, quantity) => setItems((current) => current.map((item) => item.id === id ? { ...item, quantity: Math.min(99, Math.max(1, quantity)) } : item)),
    removeItem: (id) => setItems((current) => current.filter((item) => item.id !== id)),
    clearCart: () => setItems([]),
  }), [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}

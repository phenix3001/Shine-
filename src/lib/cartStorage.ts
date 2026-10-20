import type { CartItem } from './cart';

export const cartStorageKey = 'shine-cart';

export function normalizeQuantity(quantity: number) {
  return Math.min(99, Math.max(1, Math.floor(quantity)));
}

function isCartItem(item: unknown): item is CartItem {
  return typeof item === 'object' && item !== null
    && 'id' in item && typeof item.id === 'string' && item.id.trim().length > 0
    && 'name' in item && typeof item.name === 'string' && item.name.trim().length > 0
    && 'price' in item && typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0
    && 'image' in item && (item.image === null || typeof item.image === 'string')
    && 'quantity' in item && typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity > 0;
}

export function parseCart(value: string | null): CartItem[] {
  try {
    const saved: unknown = JSON.parse(value ?? '[]');
    if (!Array.isArray(saved)) return [];
    const items = new Map<string, CartItem>();
    saved.filter(isCartItem).forEach((item) => {
      const previous = items.get(item.id);
      items.set(item.id, { ...item, quantity: normalizeQuantity((previous?.quantity ?? 0) + item.quantity) });
    });
    return [...items.values()];
  } catch { return []; }
}

export function loadCart(): CartItem[] {
  try { return parseCart(localStorage.getItem(cartStorageKey)); }
  catch { return []; }
}

export function saveCart(items: CartItem[]) {
  try { localStorage.setItem(cartStorageKey, JSON.stringify(items)); }
  catch { /* The current cart still works when the browser blocks storage. */ }
}

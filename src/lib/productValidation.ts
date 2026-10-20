const maxDatabasePrice = 2_147_483_647;

export function parseProductPrice(value: string): number | null {
  if (!value.trim()) return null;
  const price = Number(value);
  return Number.isInteger(price) && price >= 0 && price <= maxDatabasePrice ? price : null;
}

export function isProductImageUrl(value: string) {
  try {
    return ['https:', 'http:'].includes(new URL(value).protocol);
  } catch { return false; }
}

export type PreparedProduct = {
  id: string;
  sourceUrl: string;
  name: string;
  brand: string;
  description: string;
  specifications: { group: string; name: string; values: string[] }[];
  imageUrls: string[];
  // A card price is not verified as the selected merchant's offer.
  referencePrice: number | null;
};

export type PreparationState = {
  version: 1;
  stage: 'preparing' | 'finished' | 'stopped';
  startedAt: string;
  updatedAt: string;
  total: number;
  products: Record<string, { name: string; images: number }>;
  errors: Record<string, string>;
};

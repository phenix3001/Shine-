import type { Product } from '../components/ProductCard';

export type CatalogPage = { products: Product[]; total: number };
type StoredPage = CatalogPage & { cachedAt: number };
type PageLoader = (page: number, signal: AbortSignal) => Promise<CatalogPage>;

export function adjacentCatalogPages(page: number, total: number, pageSize: number) {
  const pageCount = Math.ceil(total / pageSize);
  return [page - 1, page + 1].filter((index) => index >= 0 && index < pageCount);
}

export class CatalogPageCache {
  private pages = new Map<number, StoredPage>();
  private pending = new Map<number, { controller: AbortController; promise: Promise<StoredPage> }>();
  private loader: PageLoader;
  private maxPages: number;
  private maxAgeMs: number;

  constructor(loader: PageLoader, maxPages = 10, maxAgeMs = 60_000) {
    this.loader = loader;
    this.maxPages = maxPages;
    this.maxAgeMs = maxAgeMs;
  }

  get(page: number) { return this.pages.get(page); }

  isFresh(page: number) {
    const stored = this.get(page);
    return Boolean(stored && Date.now() - stored.cachedAt < this.maxAgeMs);
  }

  invalidate(page: number) {
    const stored = this.get(page);
    if (stored) this.pages.set(page, { ...stored, cachedAt: Number.NEGATIVE_INFINITY });
  }

  load(page: number): Promise<StoredPage> {
    const existing = this.pending.get(page);
    if (existing) return existing.promise;
    const stored = this.get(page);
    if (stored && this.isFresh(page)) return Promise.resolve(stored);

    const controller = new AbortController();
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]);
    const promise = this.loader(page, signal).then((result) => {
      signal.throwIfAborted();
      const snapshot = { ...result, cachedAt: Date.now() };
      this.pages.delete(page);
      this.pages.set(page, snapshot);
      if (this.pages.size > this.maxPages) this.pages.delete(this.pages.keys().next().value!);
      return snapshot;
    }).finally(() => {
      if (this.pending.get(page)?.controller === controller) this.pending.delete(page);
    });
    this.pending.set(page, { controller, promise });
    return promise;
  }

  abort() {
    for (const request of this.pending.values()) request.controller.abort();
    this.pending.clear();
  }
}

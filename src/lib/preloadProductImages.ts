const warmedImages = new Map<string, HTMLImageElement>();

export function preloadProductImages(products: { image: string | null }[]) {
  for (const { image: source } of products) {
    if (!source || warmedImages.has(source)) continue;
    const image = new Image();
    image.loading = 'eager';
    image.decoding = 'async';
    image.fetchPriority = 'low';
    image.onload = () => { void image.decode().catch(() => undefined); };
    image.onerror = () => {
      if (warmedImages.get(source) === image) warmedImages.delete(source);
    };
    warmedImages.set(source, image);
    if (warmedImages.size > 72) warmedImages.delete(warmedImages.keys().next().value!);
    image.src = source;
  }
}

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { parseKaspiPriceList } from '../lib/kaspiPriceList';
import type { NewSellerProduct } from '../lib/sellerProducts';
import { importSellerProducts } from '../lib/importProducts';

type KaspiImportProps = {
  userId: string;
  onImported: () => Promise<void>;
};

function getImportErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message;
  return 'Не удалось импортировать товары. Обновите страницу и попробуйте ещё раз.';
}

export function KaspiImport({ userId, onImported }: KaspiImportProps) {
  const [products, setProducts] = useState<NewSellerProduct[]>([]);
  const [fileName, setFileName] = useState('');
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const requestId = useRef(0);
  const importBusy = useRef(false);
  useEffect(() => () => { ++requestId.current; }, []);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    event.target.value = '';
    const request = ++requestId.current;
    setIsReading(true);
    setMessage('Читаем прайс-лист...');
    setFileName('');
    setProducts([]);
    try {
      const result = await parseKaspiPriceList(file);
      if (requestId.current !== request) return;
      setFileName(file.name);
      setProducts(result.products);
      setMessage(`Найдено товаров: ${result.products.length}.${result.skipped ? ` Пропущено: ${result.skipped}.` : ''}`);
    } catch (error) {
      if (requestId.current === request) setMessage(error instanceof Error ? error.message : 'Не удалось прочитать файл.');
    } finally { if (requestId.current === request) setIsReading(false); }
  }

  async function handleImport() {
    if (importBusy.current || isReading || !products.length) return;
    importBusy.current = true;
    setIsImporting(true);
    setProgress(0);
    setMessage('Импортируем товары...');
    try {
      await importSellerProducts(userId, products, setProgress);
      setMessage(`Готово: ${products.length} товаров загружено из ${fileName}.`);
      setProducts([]);
      try { await onImported(); } catch {
        setMessage('Товары сохранены, но обновить список не удалось. Попробуйте обновить страницу позже.');
      }
    } catch (error) {
      setMessage(`Не удалось импортировать: ${getImportErrorMessage(error)}`);
    } finally {
      importBusy.current = false;
      setIsImporting(false);
    }
  }

  return <section className="kaspi-import">
    <h3>Импорт из Kaspi</h3>
    <p>Повторный импорт обновит названия и цены по артикулу. Фотографии, описания, категории и статусы существующих товаров сохранятся.</p>
    <label className="kaspi-file">Выбрать XML<input disabled={isImporting || isReading} type="file" accept=".xml,text/xml,application/xml" onChange={(event) => void handleFile(event)} /></label>
    {message && <p className="kaspi-message" role="status">{message}</p>}
    {isImporting && <progress max={products.length} value={progress}>{progress}</progress>}
    {products.length > 0 && <button className="seller-submit" disabled={isImporting || isReading} onClick={() => void handleImport()}>
      Импортировать {products.length} товаров
    </button>}
  </section>;
}

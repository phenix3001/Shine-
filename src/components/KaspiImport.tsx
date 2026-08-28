import { ChangeEvent, useState } from 'react';
import { parseKaspiPriceList } from '../lib/kaspiPriceList';
import { importSellerProducts, NewSellerProduct } from '../lib/sellerProducts';

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

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage('Читаем прайс-лист...');
    setProducts([]);
    try {
      const result = await parseKaspiPriceList(file);
      setFileName(file.name);
      setProducts(result.products);
      setMessage(`Найдено товаров: ${result.products.length}.${result.skipped ? ` Пропущено: ${result.skipped}.` : ''}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Не удалось прочитать файл.');
    }
  }

  async function handleImport() {
    setIsImporting(true);
    setMessage('Импортируем товары...');
    try {
      await importSellerProducts(userId, products, setProgress);
      await onImported();
      setMessage(`Готово: ${products.length} товаров загружено из ${fileName}.`);
      setProducts([]);
    } catch (error) {
      setMessage(`Не удалось импортировать: ${getImportErrorMessage(error)}`);
    } finally {
      setIsImporting(false);
    }
  }

  return <section className="kaspi-import">
    <h3>Импорт из Kaspi</h3>
    <p>Выберите XML-прайс-лист с украшениями. Повторный импорт обновит их по артикулу.</p>
    <label className="kaspi-file">Выбрать XML<input type="file" accept=".xml,text/xml,application/xml" onChange={(event) => void handleFile(event)} /></label>
    {message && <p className="kaspi-message" role="status">{message}</p>}
    {isImporting && <progress max={products.length} value={progress}>{progress}</progress>}
    {products.length > 0 && <button className="seller-submit" disabled={isImporting} onClick={() => void handleImport()}>
      Импортировать {products.length} товаров
    </button>}
  </section>;
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { PageBackLink } from '../components/PageBackLink';
import { useAuth } from '../lib/auth';
import { readLocal, replaceKaspiCatalog } from '../lib/kaspiReplacement';
import type { ImportStatus, UploadProgress } from '../lib/kaspiReplacement';

export function ImportPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<ImportStatus | null>(null);
  const [upload, setUpload] = useState<UploadProgress | null>(null);
  const [error, setError] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [running, setRunning] = useState(false);
  const [automatic, setAutomatic] = useState(false);
  const busy = useRef(false);
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    let active = true;
    let timer: number;
    const refresh = async () => {
      try {
        const next = await readLocal<ImportStatus>('status');
        if (active) { setStatus(next); setConnectionError(''); }
      } catch (error) { if (active) setConnectionError(error instanceof Error ? error.message : 'Не удалось прочитать прогресс'); }
      if (active) timer = window.setTimeout(() => void refresh(), 3000);
    };
    void refresh();
    return () => { active = false; window.clearTimeout(timer); };
  }, []);
  useEffect(() => {
    if (!running) return;
    const preventClose = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', preventClose);
    return () => window.removeEventListener('beforeunload', preventClose);
  }, [running]);
  const start = useCallback(async () => {
    if (!user || busy.current) return;
    busy.current = true; setRunning(true); setError('');
    try { await replaceKaspiCatalog(user.id, setUpload); }
    catch (failure) {
      const message = typeof failure === 'object' && failure !== null && 'message' in failure ? String(failure.message) : 'Ошибка переноса';
      setError(`${message} Старый каталог не удалён, если замена ещё не завершена. Повторный запуск продолжит загрузку.`);
    } finally { busy.current = false; setRunning(false); }
  }, [user]);
  useEffect(() => {
    if (import.meta.env.DEV && automatic && status?.ready && user && !running
      && !upload?.done && !error && !connectionError) void start();
  }, [automatic, status?.ready, user, running, upload?.done, error, connectionError, start]);
  return <main className="seller-page">
    <PageBackLink />
    <section className="profile-hero"><div><h1>Перенос из Kaspi</h1><span>Shinе · IPKOJEVYATOVA</span></div></section>
    {!import.meta.env.DEV ? <p>Страница переноса работает локально: откройте сайт через npm run dev.</p> : <section className="profile-settings import-status">
      <h2>{upload?.done ? 'Перенос завершён' : running ? 'Загрузка на сайт' : status && status.prepared === status.found && !status.complete ? 'Файлы готовы — сверяем ассортимент' : 'Подготовка каталога'}</h2>
      {status && <>
        <p>{status.complete ? 'Список товаров собран.' : status.prepared === status.found
          ? 'Карточки и фотографии скачаны. Проверяем изменения ассортимента Kaspi перед загрузкой в Supabase.'
          : `Читаем каталог: страниц ${status.pages}. Общее количество пока уточняется.`}</p>
        {!status.complete && status.verificationDetail && <p role="status">{status.verificationDetail
          .replace(/^Recover /, 'Сверка: ').replace(/^Refresh /, 'Обновление: ').replace(/page /g, 'страница ')}</p>}
        <dl>
          <div><dt>Найдено товаров</dt><dd>{status.found}</dd></div>
          {status.expected !== undefined && <div><dt>{status.complete ? 'Список подтверждён' : 'Проверено в исходном списке'}</dt><dd>{status.verified ?? 0} / {status.expected}</dd></div>}
          <div><dt>Карточки и фото подготовлены</dt><dd>{status.prepared} / {status.found}</dd></div>
          <div><dt>Фото сохранено локально</dt><dd>{status.photos}</dd></div>
          <div><dt>Ошибки подготовки</dt><dd>{status.errors}</dd></div>
        </dl>
        <progress value={status.prepared} max={Math.max(1, status.found)} aria-label="Подготовка товаров" />
        {status.error && <p role="alert">Сбор остановлен: {status.error}</p>}
      </>}
      {upload && <div role="status"><p>На сайт: {upload.products} / {upload.total} · фото: {upload.photos}</p><progress value={upload.products} max={upload.total} aria-label="Загрузка на сайт" /><p>{upload.message}</p></div>}
      {connectionError && <p role="status">{connectionError}</p>}
      {!upload?.done && <label><input type="checkbox" checked={automatic} disabled={running}
        onChange={(event) => setAutomatic(event.target.checked)} /> Автоматически загрузить в Supabase и опубликовать после подготовки</label>}
      {automatic && !running && !upload?.done && !error && <p role="status">
        {user ? status && status.prepared === status.found && !status.complete
          ? 'Ожидаем завершения сверки списка магазина. Повторно входить в аккаунт не нужно.'
          : 'После подготовки и проверки загрузка начнётся автоматически.'
          : 'Войдите в аккаунт владельца и оставьте эту страницу открытой — после подготовки загрузка начнётся автоматически.'}
      </p>}
      {error && <p role="alert">{error}</p>}
      {!user && <p>Для загрузки войдите через значок аккаунта в тот аккаунт, которому принадлежат текущие товары.</p>}
      {!upload?.done && <button className="seller-submit" disabled={!user || !status?.ready || running || Boolean(connectionError)} onClick={() => void start()}>
        {running ? 'Переносим…' : 'Перенести и заменить старый каталог'}
      </button>}
      <p>Во время загрузки на сайт оставьте вкладку открытой. Старые товары будут удалены после проверки всей новой партии. Копия старого каталога сохранена.</p>
    </section>}
  </main>;
}

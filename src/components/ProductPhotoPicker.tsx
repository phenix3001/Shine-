import { useEffect, useState } from 'react';

export function ProductPhotoPicker({ files, onChange }: { files: File[]; onChange: (files: File[]) => void }) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);
  return <div className="product-photo-picker">
    <label>Фотографии товара<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/avif"
      onChange={(event) => {
        const next = [...files, ...Array.from(event.target.files ?? [])];
        event.target.value = '';
        if (next.length > 12) { setError('Можно добавить до 12 фотографий.'); return; }
        if (next.some((file) => !['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type) || !file.size || file.size > 15 * 1024 * 1024)) {
          setError('Выберите JPG, PNG, WebP или AVIF до 15 МБ на фотографию.'); return;
        }
        setError(''); onChange(next);
      }} /></label>
    <p>До 12 фото. Первое фото станет обложкой карточки.</p>
    {error && <p role="alert">{error}</p>}
    <div className="product-photo-previews">{previews.map((url, index) => <div key={url}>
      <img src={url} alt={`Фото товара ${index + 1}`} />
      <button type="button" onClick={() => onChange(files.filter((_, position) => position !== index))} aria-label={`Удалить фото ${index + 1}`}>×</button>
    </div>)}</div>
  </div>;
}

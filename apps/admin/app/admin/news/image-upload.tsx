'use client';
import { useEffect, useState } from 'react';
import { uploadNewsImage } from './actions';
export function ImageUpload({ onChange }: { onChange: (id: string, busy: boolean) => void }) {
  const [preview, setPreview] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  async function choose(file: File | undefined) {
    setError('');
    if (!file) { setPreview(''); onChange('', false); return; }
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Elegí un PNG o JPEG de hasta 5 MB.'); setPreview(''); onChange('', false); return; }
    setPreview(URL.createObjectURL(file)); setBusy(true); onChange('', true);
    const data = new FormData(); data.set('image', file);
    try { const result = await uploadNewsImage(data); setError(result.error); onChange(result.id, false); }
    catch { setError('No pudimos subir la imagen. Volvé a seleccionarla.'); onChange('', false); }
    finally { setBusy(false); }
  }
  return <div className="image-upload">
    <label htmlFor="news-image-file">Subir imagen desde tu dispositivo (opcional)</label>
    <input id="news-image-file" type="file" accept="image/png,image/jpeg" disabled={busy} onChange={event => { void choose(event.target.files?.[0]); }} aria-describedby="image-help" />
    <span id="image-help" className="field-help">PNG o JPEG, hasta 5 MB y 4096 px / 12 megapíxeles. Se conserva al reiniciar Docker.</span>
    {preview && <img className="image-preview" src={preview} alt="Vista previa de la imagen de la noticia" />}
    {busy && <p role="status">Subiendo imagen…</p>}{error && <p role="alert" className="form-error">{error}</p>}
  </div>;
}

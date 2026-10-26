// Чистые функции: используются сайтом, импортёром и тестами.
export const normalizeText = x => String(x ?? '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
export const normalizeTarget = x => normalizeText(x).replace(/[–—−]/g, '-').replace(/\s+/g, '');
export function safeURL(raw) {
  try { const u = new URL(raw); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; }
}
export function validateRecord(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Запись должна быть объектом.');
  const r = JSON.parse(JSON.stringify(input));
  for (const field of ['id', 'identity_key', 'name', 'organism', 'target', 'category', 'mechanism']) {
    if (typeof r[field] !== 'string' || !r[field].trim()) throw new Error(`Не заполнено поле ${field}`);
    r[field] = r[field].trim();
  }
  if (r.identity_key.length > 400) throw new Error('identity_key слишком длинный.');
  r.status ??= 'candidate';
  if (!['candidate', 'under_review', 'confirmed', 'rejected'].includes(r.status)) throw new Error('Недопустимый status');
  r.aliases ??= [];
  if (!Array.isArray(r.aliases) || r.aliases.some(x => typeof x !== 'string')) throw new Error('aliases должен быть массивом строк');
  r.references ??= [];
  if (!Array.isArray(r.references) || r.references.some(f => !f.title || !safeURL(f.url))) {
    throw new Error('У каждой статьи должны быть title и действующая по формату HTTPS-ссылка url.');
  }
  if (r.status === 'confirmed' && (r.transcription_attenuation_confirmed !== true ||
      !r.experimental_evidence || !r.evidence_level || !r.references.length ||
      !r.references.some(f => f.own_transcription_experiments === true))) {
    throw new Error('Для confirmed нужны экспериментальные доказательства и статья с own_transcription_experiments: true.');
  }
  if (new TextEncoder().encode(JSON.stringify(r)).length > 700000) throw new Error('Слишком большая запись.');
  // Служебные поля нельзя импортировать из чужого экспорта.
  for (const f of ['identity_hash', 'created_at', 'updated_at', '_docId']) delete r[f];
  return r;
}
export function parseRecords(text) {
  const d = JSON.parse(text);
  const rows = Array.isArray(d) ? d : Array.isArray(d.records) ? d.records : [d];
  if (!rows.length) throw new Error('JSON не содержит записей.');
  return rows.map(validateRecord);
}
function targets(r) {
  return new Set([r.target, ...(r.aliases || [])].map(normalizeTarget).filter(Boolean));
}
export function classify(record, existing) {
  const key = normalizeText(record.identity_key);
  const exact = existing.find(r => normalizeText(r.identity_key) === key);
  if (exact) return { status: 'exists', matches: [exact], reason: 'Совпадает постоянный identity_key; запись будет пропущена.' };
  const tokens = targets(record);
  const matches = existing.filter(r => r.id === record.id ||
    (normalizeText(r.organism) === normalizeText(record.organism) && [...targets(r)].some(x => tokens.has(x))));
  if (matches.length) return { status: 'possible', matches, reason: 'Совпадает ID либо организм и мишень/синоним. Требуется ручная проверка.' };
  return { status: 'new', matches: [], reason: 'Совпадений по ключу, ID и указанным мишеням/синонимам не найдено.' };
}
export function preview(records, existing) {
  const seen = [...existing];
  return records.map(record => {
    const result = { record, ...classify(record, seen) };
    if (result.status === 'new') seen.push(record);
    return result;
  });
}
export async function identityHash(key) {
  const bytes = new TextEncoder().encode(normalizeText(key));
  const result = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(result)].map(v => v.toString(16).padStart(2, '0')).join('');
}
export function exportJSON(records) {
  return JSON.stringify({ schema_version: '2.0', exported_at: new Date().toISOString(), records }, null, 2);
}

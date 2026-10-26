import { connect } from './firebase-client.js';
import { loadPublished } from './catalog-store.js';
import { safeURL, exportJSON } from './catalog-core.js';
const $ = id => document.getElementById(id);
let records = [], loaded = false, db;
function node(tag, text, cls) { const n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; }
function render() {
  const body = document.querySelector('#catalog tbody'); body.replaceChildren();
  const q = $('search').value.trim().toLowerCase();
  const visible = records.filter(r => (!q || JSON.stringify(r).toLowerCase().includes(q)) &&
    (!$('category').value || r.category === $('category').value) &&
    (!$('level').value || String(r.evidence_level).includes($('level').value)));
  visible.forEach((r, i) => {
    const tr = node('tr');
    const num = node('td', String(i+1).padStart(2,'0'), 'number'); num.append(node('span', r.id));
    const name = node('th'); name.scope = 'row'; name.append(node('span', r.name, 'gene'), node('div', `Мишень: ${r.target}`, 'target'));
    if (r.aliases?.length) name.append(node('div', `Синонимы: ${r.aliases.join(', ')}`, 'meta'));
    const org = node('td'); org.append(node('i', r.organism));
    const category = node('td'); category.append(node('span', r.category, 'tag'), node('p', r.signal || '', 'signal'));
    const evidence = node('td'); evidence.append(node('span', 'Да', 'yes'), node('span', r.evidence_level, 'level'), node('p', r.experimental_evidence));
    const details = node('details'); details.append(node('summary', `Статьи и границы доказательств (${r.references.length})`));
    for (const f of r.references) {
      const box = node('div', null, 'reference'), url = safeURL(f.url);
      if (url) { const a = node('a', f.title); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; box.append(a); }
      else box.append(node('span', f.title));
      box.append(node('div', [f.authors, f.year, f.journal].filter(Boolean).join(' · '), 'meta'));
      if (f.doi) box.append(node('div', `DOI: ${f.doi}`, 'doi'));
      box.append(node('p', `Собственные эксперименты: ${f.own_transcription_experiments === true ? 'да' : 'не отмечены'}. ${f.experimental_evidence || ''}`));
      details.append(box);
    }
    details.append(node('p', `Границы доказательств: ${r.limitations || 'Не указаны.'}`)); evidence.append(details);
    tr.append(num, name, org, category, node('td', r.mechanism), evidence); body.append(tr);
  });
  $('total').textContent = records.length;
  $('counter').textContent = `Показано ${visible.length} из ${records.length} систем`;
  $('empty').style.display = visible.length ? 'none' : 'block';
}
async function reload() {
  $('refresh').disabled = true;
  $('counter').textContent = 'Загрузка из Firestore…';
  try {
    db ||= connect().db;
    const next = await loadPublished(db); records = next; loaded = true;
    const selected = $('category').value;
    $('category').replaceChildren(new Option('Все механизмы', ''));
    [...new Set(records.map(r=>r.category))].sort().forEach(c => $('category').add(new Option(c,c)));
    $('category').value = selected;
    render(); $('load-error').textContent = '';
    $('download').disabled = false;
    $('updated').textContent = `Данные загружены: ${new Date().toLocaleString('ru-RU')}`;
  } catch (e) {
    $('load-error').textContent = `Не удалось загрузить данные: ${e.message}. Проверьте конфигурацию, интернет и правила Firestore.`;
    if (loaded) render(); else $('counter').textContent = 'Данные не загружены';
  } finally { $('refresh').disabled = false; }
}
$('search').addEventListener('input', render);
$('category').addEventListener('change', render); $('level').addEventListener('change', render);
$('reset').addEventListener('click',()=>{ $('search').value=''; $('category').value=''; $('level').value=''; render(); });
$('refresh').addEventListener('click', reload);
$('download').addEventListener('click',()=>{
  if (!loaded) return;
  const url=URL.createObjectURL(new Blob([exportJSON(records)],{type:'application/json;charset=utf-8'}));
  const a=node('a');a.href=url;a.download='transcription_attenuators.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$('print').addEventListener('click',()=>window.print());
reload();

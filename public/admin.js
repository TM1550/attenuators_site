import { signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserSessionPersistence } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { connect } from './firebase-client.js';
import { ADMIN_UID } from './firebase-config.js';
import { parseRecords, preview, classify, exportJSON } from './catalog-core.js';
import { loadAll, createIfAbsent } from './catalog-store.js';
const $=id=>document.getElementById(id);
let auth, db, plan=null, source=null, busy=false;
const message=x=>{$('message').textContent=x;};
function invalidate(){plan=null;source=null;$('import').disabled=true;}
function controls(lock){busy=lock;for(const id of ['check','file','json','backup','logout'])$(id).disabled=lock;$('import').disabled=lock||!plan?.some(x=>x.status==='new');}
function showPlan(items){
  $('preview').replaceChildren();const labels={new:'Новая',exists:'Уже есть — пропуск',possible:'Возможный дубликат — заблокирован'};
  for(const x of items){const tr=document.createElement('tr');tr.className=x.status;
    for(const text of [x.record.id,x.record.name,labels[x.status],[...x.matches.map(r=>`${r.id}: ${r.name}`),x.reason].join(' / ')]){
      const td=document.createElement('td');td.textContent=text;tr.append(td);
    }$('preview').append(tr);
  }
  const n=s=>items.filter(x=>x.status===s).length;
  $('summary').textContent=`Новых: ${n('new')}; уже есть: ${n('exists')}; требуют проверки: ${n('possible')}.`;
}
try {
  ({auth,db}=connect());await setPersistence(auth,browserSessionPersistence);
  onAuthStateChanged(auth,user=>{
    invalidate();const admin=user?.uid===ADMIN_UID;
    $('account').textContent=user?`Пользователь: ${user.email}. UID: ${user.uid}${admin?' — администратор':' — нет прав администратора'}`:'Вход не выполнен.';
    $('logout').hidden=!user;$('editor').hidden=!admin;
  });
}catch(e){message(e.message);}
$('login').addEventListener('submit',async e=>{e.preventDefault();if(!auth)return;try{await signInWithEmailAndPassword(auth,$('email').value.trim(),$('password').value);$('password').value='';message('Вход выполнен.');}catch(e){message(`Вход не выполнен: ${e.code || e.message}`);}});
$('logout').addEventListener('click',async()=>{try{await signOut(auth);}catch(e){message(e.message);}});
$('json').addEventListener('input',invalidate);
$('file').addEventListener('change',async()=>{invalidate();try{const f=$('file').files[0];if(f){if(f.size>10000000)throw Error('Файл больше 10 МБ.');$('json').value=await f.text();}}catch(e){message(e.message);}});
$('check').addEventListener('click',async()=>{
  if(busy)return;invalidate();controls(true);
  try{if(auth.currentUser?.uid!==ADMIN_UID)throw Error('Требуется администратор.');
    source=parseRecords($('json').value);const existing=await loadAll(db);plan=preview(source,existing);showPlan(plan);message('Проверка завершена. Импортируются только строки «Новая».');
  }catch(e){invalidate();message(`Ошибка проверки: ${e.message}`);}finally{controls(false);}
});
$('import').addEventListener('click',async()=>{
  if(busy||!plan||!source)return;controls(true);let created=0,skipped=0,blocked=0;
  try{
    if(auth.currentUser?.uid!==ADMIN_UID)throw Error('Требуется администратор.');
    // Повторная проверка актуальной базы непосредственно перед записью.
    const existing=await loadAll(db);
    for(const record of source){
      const verdict=classify(record,existing);
      if(verdict.status==='exists'){skipped++;continue;}
      if(verdict.status==='possible'){blocked++;continue;}
      const result=await createIfAbsent(db,record);
      if(result==='created'){created++;existing.push(record);}else{skipped++;existing.splice(0,existing.length,...await loadAll(db));}
      message(`Добавлено ${created}; пропущено ${skipped}; заблокировано ${blocked}…`);
    }
    message(`Готово. Добавлено: ${created}; уже есть: ${skipped}; требуют ручной проверки: ${blocked}. Откройте каталог и нажмите «Обновить».`);
    showPlan(preview(source,await loadAll(db)));invalidate();
  }catch(e){message(`Импорт остановлен: ${e.code || ''} ${e.message}. Успешно добавлено: ${created}. Повторный запуск пропустит сохранённые записи.`);invalidate();}
  finally{controls(false);}
});
$('backup').addEventListener('click',async()=>{
  if(busy)return;controls(true);try{const data=await loadAll(db);const url=URL.createObjectURL(new Blob([exportJSON(data)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='attenuators_backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){message(e.message);}finally{controls(false);}
});

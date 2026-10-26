import { collection, doc, getDocs, query, where, runTransaction, serverTimestamp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import { validateRecord, identityHash } from './catalog-core.js';
export async function loadPublished(db) {
  const snap = await getDocs(query(collection(db, 'attenuators'), where('status', '==', 'confirmed')));
  return snap.docs.map(d => d.data()).sort((a,b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}
export async function loadAll(db) {
  const snap = await getDocs(collection(db, 'attenuators'));
  return snap.docs.map(d => d.data());
}
// Проверка и создание выполняются атомарно. Повторный импорт ничего не перезаписывает.
export async function createIfAbsent(db, input) {
  const record = validateRecord(input);
  const hash = await identityHash(record.identity_key);
  const ref = doc(db, 'attenuators', hash);
  return runTransaction(db, async tx => {
    const snap = await tx.get(ref);
    if (snap.exists()) {
      if (snap.data().identity_key.toLowerCase() !== record.identity_key.toLowerCase()) {
        throw new Error('Конфликт identity_key: остановка импорта.');
      }
      return 'exists';
    }
    tx.set(ref, { ...record, identity_hash: hash, created_at: serverTimestamp(), updated_at: serverTimestamp() });
    return 'created';
  });
}

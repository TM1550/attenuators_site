import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js';
import { firebaseConfig } from './firebase-config.js';
export function connect() {
  if (Object.values(firebaseConfig).some(v => String(v).includes('PASTE_'))) {
    throw new Error('Заполните public/firebase-config.js конфигурацией вашего Firebase-проекта.');
  }
  const app = initializeApp(firebaseConfig);
  return { db: getFirestore(app), auth: getAuth(app) };
}

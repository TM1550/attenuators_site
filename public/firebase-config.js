// Firebase Console → Project settings → Your apps → Web app → SDK setup/config.
// Это публичная конфигурация веб-приложения, не service-account JSON.

export const firebaseConfig = {
  apiKey: "AIzaSyA1b3b1ZiYZKDsQ0xto-U-P22nDHOYLFfQ",
  authDomain: "attenuators.firebaseapp.com",
  databaseURL: "https://attenuators-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "attenuators",
  storageBucket: "attenuators.firebasestorage.app",
  messagingSenderId: "1070763234852",
  appId: "1:1070763234852:web:c99a59d9676dd8993feab1"
};

// Authentication → Users → UID единственного администратора.
// Тот же UID обязательно впишите в firestore.rules.
export const ADMIN_UID = 'mZfT9dN19RPo9Jo5P8u8SYgIKMt1';

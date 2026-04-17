import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyAvusDVNPbek2aikLxPn-jQY_oijWphD-I',
  authDomain: 'fcrthe1.firebaseapp.com',
  databaseURL: 'https://fcrthe1-default-rtdb.firebaseio.com',
  projectId: 'fcrthe1',
  storageBucket: 'fcrthe1.firebasestorage.app',
  messagingSenderId: '658973162849',
  appId: '1:658973162849:web:98d31445e9d50cd70ad920',
  measurementId: 'G-SEM24Z1X77',
};

// สั่งเปิดใช้งาน Firebase
const app = initializeApp(firebaseConfig);
// ส่งออกตัวแปร db ไปให้ App.jsx ใช้งาน
export const db = getDatabase(app);

// Loaded lazily (dynamic import) so public pages stay light and fast.
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { FIREBASE } from './config';

export const app = initializeApp(FIREBASE);
export const auth = getAuth(app);
export const db = getFirestore(app);

export { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from 'firebase/auth';
export { doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';

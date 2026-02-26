import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Lazy-initialized singletons (빌드 타임 에러 방지)
let _app: FirebaseApp | null = null;
let _db: Firestore | null = null;
let _auth: Auth | null = null;
let _googleProvider: GoogleAuthProvider | null = null;

function getApp(): FirebaseApp {
  if (!_app) {
    _app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return _app;
}

// Proxy objects that lazily initialize on first property access
// This prevents Firebase from being initialized during build/SSR
export const app = new Proxy({} as FirebaseApp, {
  get(_, prop) {
    return Reflect.get(getApp(), prop);
  },
});

export const db = new Proxy({} as Firestore, {
  get(_, prop) {
    if (!_db) _db = getFirestore(getApp());
    return Reflect.get(_db, prop);
  },
});

export const auth = new Proxy({} as Auth, {
  get(_, prop) {
    if (!_auth) _auth = getAuth(getApp());
    return Reflect.get(_auth, prop);
  },
});

export const googleProvider = new Proxy({} as GoogleAuthProvider, {
  get(_, prop) {
    if (!_googleProvider) {
      _googleProvider = new GoogleAuthProvider();
      _googleProvider.setCustomParameters({ prompt: 'select_account' });
    }
    return Reflect.get(_googleProvider, prop);
  },
});

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

// 빌드 타임에는 환경변수가 없을 수 있으므로 안전하게 초기화
let app: FirebaseApp | null = null;
let db: Firestore;
let auth: Auth;
let googleProvider: GoogleAuthProvider;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
  db = getFirestore(app);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });
} catch (error) {
  // 빌드 타임에 Firebase 초기화 실패 시 더미 객체 생성
  // 실제 런타임에서는 환경변수가 설정되어 있으므로 정상 동작합니다.
  console.warn('Firebase 초기화 실패 (빌드 타임일 수 있음):', error);
  db = {} as Firestore;
  auth = {} as Auth;
  googleProvider = {} as GoogleAuthProvider;
}

export { app, db, auth, googleProvider };
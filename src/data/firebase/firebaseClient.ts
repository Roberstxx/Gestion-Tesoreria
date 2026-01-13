import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import { getAuth } from 'firebase/auth';

type FirebaseEnvKey =
  | 'VITE_FIREBASE_API_KEY'
  | 'VITE_FIREBASE_AUTH_DOMAIN'
  | 'VITE_FIREBASE_PROJECT_ID'
  | 'VITE_FIREBASE_STORAGE_BUCKET'
  | 'VITE_FIREBASE_MESSAGING_SENDER_ID'
  | 'VITE_FIREBASE_APP_ID'
  | 'VITE_FIREBASE_MEASUREMENT_ID';

const trimEnv = (key: FirebaseEnvKey): string | undefined => {
  const value = import.meta.env[key];
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const firebaseConfig = {
  apiKey: trimEnv('VITE_FIREBASE_API_KEY'),
  authDomain: trimEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: trimEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: trimEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: trimEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: trimEnv('VITE_FIREBASE_APP_ID'),
  measurementId: trimEnv('VITE_FIREBASE_MEASUREMENT_ID'),
};

const requiredFirebaseKeys: Array<keyof typeof firebaseConfig> = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

const missingFirebaseKeys = requiredFirebaseKeys.filter((key) => !firebaseConfig[key]);
if (missingFirebaseKeys.length > 0) {
  console.warn(
    `[firebase] Missing config values: ${missingFirebaseKeys.join(
      ', '
    )}. Revisa las variables VITE_FIREBASE_* en tu entorno.`
  );
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const firestore = getFirestore(app);
export const auth = getAuth(app);
export let analytics: ReturnType<typeof getAnalytics> | null = null;

if (firebaseConfig.measurementId) {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

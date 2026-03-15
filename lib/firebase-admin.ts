import "server-only";
import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

let app: App;
let db: Firestore;
let adminAuth: Auth;

const getAdminApp = (): App => {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
};

export const getAdminFirestore = (): Firestore => {
  if (!db) {
    app = getAdminApp();
    db = getFirestore(app);
  }
  return db;
};

export const getAdminAuth = (): Auth => {
  if (!adminAuth) {
    app = getAdminApp();
    adminAuth = getAuth(app);
  }
  return adminAuth;
};

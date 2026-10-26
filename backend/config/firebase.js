const admin = require('firebase-admin');

let initialized = false;

function initFirebase() {
  if (initialized) return admin;
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    console.warn('[firebase] Firebase Admin credentials are not fully set — Google sign-in verification will fail until FIREBASE_* env vars are provided.');
    return admin;
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      // .env stores literal \n — convert back to real newlines
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
  initialized = true;
  return admin;
}

module.exports = initFirebase;

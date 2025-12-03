// Values are injected at container start via envsubst (Docker entrypoint).
window.LEGOLOCKER_CONFIG = {
  firebaseApiKey: "${FIREBASE_API_KEY:-}",
  firebaseAuthDomain: "${FIREBASE_AUTH_DOMAIN:-}",
  firebaseProjectId: "${FIREBASE_PROJECT_ID:-}",
  firebaseStorageBucket: "${FIREBASE_STORAGE_BUCKET:-}",
  firebaseMessagingSenderId: "${FIREBASE_MESSAGING_SENDER_ID:-}",
  firebaseAppId: "${FIREBASE_APP_ID:-}",
  rebrickableApiKey: "${REBRICKABLE_API_KEY:-}",
};

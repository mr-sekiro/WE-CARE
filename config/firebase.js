const admin = require("firebase-admin");

const serviceAccountKeyBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKeyBase64) {
  throw new Error(
    "The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set."
  );
}

const serviceAccountKeyJson = Buffer.from(
  serviceAccountKeyBase64,
  "base64"
).toString("utf8");
const serviceAccount = JSON.parse(serviceAccountKeyJson);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const messaging = admin.messaging();

module.exports = messaging;

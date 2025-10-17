const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.join(__dirname, "../../permission.json");
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("🟢 Firebase Admin initialized with serviceAccount");
    } else {
      admin.initializeApp();
      console.log("⚠️ Firebase Admin initialized with default credentials");
    }
  } catch (error) {
    console.error("❌ Firebase Admin initialization failed:", error);
    admin.initializeApp();
  }
}

const db = admin.firestore();
module.exports = { admin, db };

const functions = require("firebase-functions");
const app = require("./src/app");

// ✅ Single entry point for Firebase
exports.v1 = functions.https.onRequest(app);

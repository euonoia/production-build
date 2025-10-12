const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

// 🔹 Declare app
const app = express();

// -------------------- INITIALIZATION -------------------- //
if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.join(__dirname, "permission.json");
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      console.log("🟢 Firebase Admin initialized with serviceAccount");
    } else {
      admin.initializeApp(); // default credentials
      console.log("⚠️ Firebase Admin initialized with default credentials");
    }
  } catch (error) {
    console.error("❌ Firebase Admin initialization failed:", error);
    admin.initializeApp(); // fallback to default
  }
}

const db = admin.firestore();

app.use(cors({ origin: true }));
app.use(express.json());

console.log("✅ Express API initialized");

// -------------------- HELPERS -------------------- //
function normalizeCountry(country) {
  return country.trim().toLowerCase().replace(/\s+/g, "_");
}

// -------------------- ROUTES -------------------- //
// GET a user
app.get("/read-data", async (req, res) => {
  const { country, userId } = req.query;
  if (!country || !userId) return res.status(400).send("Missing country or userId");

  try {
    const docRef = db.collection("events").doc(normalizeCountry(country)).collection("users").doc(userId);
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).send("User not found");
    res.json(doc.data());
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

// Add/update user
app.post("/add-data", async (req, res) => {
  const { country, userId, ...fields } = req.body;
  if (!country || !userId) return res.status(400).send("Missing country or userId");

  try {
    const docRef = db.collection("events").doc(normalizeCountry(country)).collection("users").doc(userId);
    await docRef.set({ ...fields, userId, invited: fields.invited ?? false, updatedAt: new Date() }, { merge: true });
    res.status(201).send(`User ${userId} added/updated`);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

// List users
app.get("/list-users", async (req, res) => {
  const { country } = req.query;
  if (!country) return res.status(400).send("Missing country");

  try {
    const snapshot = await db.collection("events").doc(normalizeCountry(country)).collection("users").get();
    const users = snapshot.docs.map(d => ({ userId: d.id, ...d.data() }));
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

// List countries
app.get("/list-countries", async (_req, res) => {
  try {
    const snapshot = await db.collection("events").get();
    res.json(snapshot.docs.map(d => ({ country: d.id })));
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

// Analytics
app.get("/analytics", async (req, res) => {
  const { country } = req.query;
  if (!country) return res.status(400).send("Missing country");

  try {
    const snapshot = await db.collection("events").doc(normalizeCountry(country)).collection("users").get();
    let registered = 0, attended = 0;
    snapshot.forEach(doc => {
      registered++;
      if (doc.data().attended) attended++;
    });
    const attendanceRate = registered ? ((attended / registered) * 100).toFixed(2) : "0.00";
    res.json({ country: normalizeCountry(country), registered, attended, attendanceRate: `${attendanceRate}%` });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

// -------------------- EXPORT -------------------- //
exports.v1 = functions.https.onRequest(app);

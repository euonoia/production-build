const functions = require("firebase-functions");
const firebase = require("firebase-admin");
const serviceAccount = require("./permission.json");

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
});

const express = require("express");
const app = express();
const db = firebase.firestore();

const cors = require("cors");
app.use(cors({origin: true}));
app.use(express.json());

// GET user data: /read-data?country=south_korea&userId=abc123
app.get("/read-data", async (req, res) => {
  const { country, userId } = req.query;
  if (!country || !userId) {
    return res.status(400).send("Missing country or userId");
  }
  try {
    const docRef = db.collection("Event").doc(country).collection("users").doc(userId);
    const doc = await docRef.get();
    if (!doc.exists) {
      return res.status(404).send("User not found");
    }
    return res.status(200).json(doc.data());
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

// POST add/update user: { country, userId, ...fields }
app.post("/add-data", async (req, res) => {
  const { country, userId, ...fields } = req.body;
  if (!country || !userId) {
    return res.status(400).send("Missing country or userId");
  }
  try {
    const docRef = db.collection("Event").doc(country).collection("users").doc(userId);
    await docRef.set(fields, { merge: true });
    return res.status(201).send("User added/updated successfully");
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

// GET all users in a country: /list-users?country=south_korea
app.get("/list-users", async (req, res) => {
  const { country } = req.query;
  if (!country) {
    return res.status(400).send("Missing country");
  }
  try {
    const usersSnapshot = await db.collection("Event").doc(country).collection("users").get();
    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({ userId: doc.id, ...doc.data() });
    });
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

app.get("/list-countries", async (req, res) => {
  try {
    const snapshot = await db.collection("Event").get();
    const countries = [];
    snapshot.forEach(doc => countries.push({ country: doc.id }));
    return res.status(200).json(countries);
  } catch (error) {
    return res.status(500).send(error.message);
  }
});
exports.v1 = functions.https.onRequest(app);
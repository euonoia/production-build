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
app.use(express.json()); // Add this line after app.use(cors(...))

app.get("/helloworld", (req, res) => {
  const name = req.body.name;
  return res.status(200).send("Hello World! name passed is : " + name);
});

app.get("/read-data", async (req, res) => {
  const userId = req.query.userId; // Use query parameter for GET requests
  if (!userId) {
    return res.status(400).send("Missing userId");
  }
  try {
    const doc = await db.collection("Event").doc(userId).get();
    if (!doc.exists) {
      return res.status(404).send("Document not found");
    }
    const data = doc.data();
    return res.status(200).json({
      firstName: data.firstName,
      lastName: data.lastName,
      age: data.age,
      contact: data.contact,
      email: data.email,
      invited: data.invited || false, // Default to false if not set
      country: data.country || "Unknown"
    });
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

app.post("/add-data", async (req, res) => {
  const { userId, invited } = req.body;
  if (!userId || typeof invited !== "boolean") {
    return res.status(400).send("Missing required fields or invalid invited value");
  }
  try {
    await db.collection("Event").doc(userId).set(
      { invited },
      { merge: true } // <-- This ensures existing data is not overwritten
    );
    return res.status(201).send("User added/updated successfully");
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

app.get("/list-users", async (req, res) => {
  try {
    const snapshot = await db.collection("Event").get();
    const users = [];
    snapshot.forEach(doc => {
      users.push({ userId: doc.id, ...doc.data() });
    });
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

exports.v1 = functions.https.onRequest(app);

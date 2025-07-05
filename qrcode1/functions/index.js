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
    const doc = await db.collection("Information").doc(userId).get();
    if (!doc.exists) {
      return res.status(404).send("Document not found");
    }
    const data = doc.data();
    return res.status(200).json({
      firstName: data.firstName,
      lastName: data.lastName,
      age: data.age,
      contact: data.contact,
      email: data.email
    });
  } catch (error) {
    return res.status(500).send(error.message);
  }
});

exports.v1 = functions.https.onRequest(app);

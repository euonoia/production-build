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

// -------------------- USER ROUTES -------------------- //

// 🔹 GET user details
app.get("/users/:country/:userId", async (req, res) => {
  const { country, userId } = req.params;
  try {
    const userRef = db.collection("events").doc(normalizeCountry(country)).collection("users").doc(userId);
    const doc = await userRef.get();
    if (!doc.exists) return res.status(404).send("User not found");
    res.json({ userId: doc.id, ...doc.data() });
  } catch (err) {
    console.error("❌ Error fetching user:", err);
    res.status(500).send(err.message);
  }
});

// 🔹 Add or update user
app.post("/users/:country", async (req, res) => {
  const { country } = req.params;
  const { userId, ...fields } = req.body;
  if (!userId) return res.status(400).send("Missing userId");

  try {
    const userRef = db.collection("events").doc(normalizeCountry(country)).collection("users").doc(userId);
    await userRef.set({
      ...fields,
      userId,
      updatedAt: new Date(),
      invited: fields.invited ?? false,
    }, { merge: true });

    res.status(201).send(`User ${userId} added/updated for ${country}`);
  } catch (err) {
    console.error("❌ Error saving user:", err);
    res.status(500).send(err.message);
  }
});

// 🔹 List all users for a country
app.get("/users/:country", async (req, res) => {
  const { country } = req.params;
  try {
    const snapshot = await db.collection("events").doc(normalizeCountry(country)).collection("users").get();
    const users = snapshot.docs.map(d => ({ userId: d.id, ...d.data() }));
    res.json(users);
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).send(err.message);
  }
});

// 🔹 Send invite to users (updates invited + inviteSentAt)
app.post("/users/:country/send-invite", async (req, res) => {
  const { country } = req.params;
  const { userIds } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0)
    return res.status(400).send("userIds array required");

  try {
    const batch = db.batch();
    const normalized = normalizeCountry(country);

    userIds.forEach(userId => {
      const userRef = db.collection("events").doc(normalized).collection("users").doc(userId);
      batch.update(userRef, {
        invited: true,
        inviteSentAt: new Date(),
      });
    });

    await batch.commit();
    res.send(`Invitations sent to ${userIds.length} users`);
  } catch (err) {
    console.error("❌ Error sending invites:", err);
    res.status(500).send(err.message);
  }
});


// -------------------- EVENT ROUTES -------------------- //

// 🔹 List all countries
app.get("/events", async (req, res) => {
  try {
    const snapshot = await db.collection("events").get();
    const countries = snapshot.docs.map(doc => ({
      country: doc.id,
    }));
    res.json(countries);
  } catch (err) {
    console.error("❌ Error fetching countries:", err);
    res.status(500).send(err.message);
  }
});

// 🔹 Add a new event
app.post("/events/:country", async (req, res) => {
  const { country } = req.params;
  const { title, startTime } = req.body;
  if (!title || !startTime) return res.status(400).send("Missing title or startTime");

  try {
    const normalized = normalizeCountry(country);
    const eventsRef = db.collection("events").doc(normalized).collection("events");
    const newEventRef = eventsRef.doc();

    const eventData = {
      eventId: newEventRef.id,
      title,
      startTime: new Date(startTime),
      createdAt: new Date(),
    };

    await newEventRef.set(eventData);
    res.status(201).json({ message: "Event created", data: eventData });
  } catch (err) {
    console.error("❌ Error adding event:", err);
    res.status(500).send(err.message);
  }
});

// 🔹 List events for a country
app.get("/events/:country", async (req, res) => {
  const { country } = req.params;
  try {
    const normalized = normalizeCountry(country);
    const snapshot = await db
      .collection("events")
      .doc(normalized)
      .collection("events")
      .orderBy("startTime", "asc")
      .get();

    const events = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        eventId: doc.id,
        ...data,
        startTime: data.startTime?.toDate ? data.startTime.toDate().toISOString() : data.startTime,
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt,
      };
    });

    res.json(events);
  } catch (err) {
    console.error("❌ Error fetching events:", err);
    res.status(500).send(err.message);
  }
});

// 🔹 Assign event to users
app.post("/events/:country/assign", async (req, res) => {
  const { country } = req.params;
  const { eventTitle, userIds } = req.body;

  if (!eventTitle || !Array.isArray(userIds))
    return res.status(400).send("Missing eventTitle or userIds");

  try {
    const normalized = normalizeCountry(country);
    const batch = db.batch();

    userIds.forEach(userId => {
      const userRef = db.collection("events").doc(normalized).collection("users").doc(userId);
      batch.update(userRef, {
        assignedEvent: eventTitle,
        updatedAt: new Date(),
      });
    });

    await batch.commit();
    res.status(200).send(`Event "${eventTitle}" assigned to ${userIds.length} users`);
  } catch (err) {
    console.error("❌ Error assigning event:", err);
    res.status(500).send(err.message);
  }
});

// -------------------- ANALYTICS ROUTES -------------------- //

// 🔹 Analytics Overview — gives total counts
app.get("/analytics/overview", async (req, res) => {
  try {
    const eventsSnapshot = await db.collection("events").get();
    let totalCountries = eventsSnapshot.size;
    let totalUsers = 0;
    let totalEvents = 0;
    let totalInvited = 0;

    for (const countryDoc of eventsSnapshot.docs) {
      const countryId = countryDoc.id;

      // Users count
      const usersSnap = await db.collection("events").doc(countryId).collection("users").get();
      totalUsers += usersSnap.size;

      // Invited count
      usersSnap.forEach(doc => {
        const data = doc.data();
        if (data.invited) totalInvited++;
      });

      // Events count
      const eventsSnap = await db.collection("events").doc(countryId).collection("events").get();
      totalEvents += eventsSnap.size;
    }

    res.json({
      totalCountries,
      totalUsers,
      totalEvents,
      totalInvited,
      notInvited: totalUsers - totalInvited,
    });
  } catch (err) {
    console.error("❌ Analytics overview error:", err);
    res.status(500).send(err.message);
  }
});

// 🔹 Analytics Events — breakdown per country for charts
app.get("/analytics/events", async (req, res) => {
  try {
    const eventsSnapshot = await db.collection("events").get();
    const data = [];

    for (const countryDoc of eventsSnapshot.docs) {
      const countryId = countryDoc.id;

      const usersSnap = await db.collection("events").doc(countryId).collection("users").get();
      const invitedCount = usersSnap.docs.filter(d => d.data().invited).length;

      const eventsSnap = await db.collection("events").doc(countryId).collection("events").get();

      data.push({
        country: countryId,
        users: usersSnap.size,
        invited: invitedCount,
        notInvited: usersSnap.size - invitedCount,
        events: eventsSnap.size,
      });
    }

    res.json(data);
  } catch (err) {
    console.error("❌ Analytics events error:", err);
    res.status(500).send(err.message);
  }
});


// -------------------- EXPORT -------------------- //
exports.v1 = functions.https.onRequest(app);

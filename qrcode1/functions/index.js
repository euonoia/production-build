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

// 🔹 GET all countries analytics (for world map)
app.get("/analytics/countries", async (req, res) => {
  try {
    const eventsSnapshot = await db.collection("events").get();
    const countriesData = [];

    // Map country names (lowercase) → lat/lng
    const countryLatLngMap = {
      'united_states': { lat: 37.0902, lng: -95.7129 },
      'canada': { lat: 56.1304, lng: -106.3468 },
      'united_kingdom': { lat: 55.3781, lng: -3.4360 },
      'australia': { lat: -25.2744, lng: 133.7751 },
      'germany': { lat: 51.1657, lng: 10.4515 },
      'france': { lat: 46.2276, lng: 2.2137 },
      'india': { lat: 20.5937, lng: 78.9629 },
      'philippines': { lat: 12.8797, lng: 121.774 },
      'japan': { lat: 36.2048, lng: 138.2529 },
      'south_korea': { lat: 35.9078, lng: 127.7669 },
    };

    for (const countryDoc of eventsSnapshot.docs) {
      const countryId = countryDoc.id.toLowerCase(); // normalize

      // Fetch users for the country
      const usersSnap = await db.collection("events").doc(countryDoc.id).collection("users").get();
      const invitedCount = usersSnap.docs.filter(d => d.data().invited).length;

      // Fetch events for the country
      const eventsSnap = await db.collection("events").doc(countryDoc.id).collection("events").get();

      // Attach lat/lng from mapping, fallback to 0
      const latLng = countryLatLngMap[countryId] || { lat: 0, lng: 0 };

      countriesData.push({
        country: countryDoc.id, // keep original casing
        users: usersSnap.size,
        invited: invitedCount,
        notInvited: usersSnap.size - invitedCount,
        events: eventsSnap.size,
        lat: latLng.lat,
        lng: latLng.lng
      });
    }

    res.json(countriesData);
  } catch (err) {
    console.error("❌ Error fetching countries analytics:", err);
    res.status(500).send(err.message);
  }
});

// ---------------- GET all users ----------------
app.get("/users", async (req, res) => {
  try {
    const usersSnap = await db.collection("users").get();
    const users = usersSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(users);
  } catch(err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});
// ---------------- PATCH user role ----------------
app.patch("/users/:uid", async (req, res) => {
  const { uid } = req.params;
  const { role } = req.body;

  if(!role || !["user", "admin"].includes(role)){
    return res.status(400).json({ error: "Invalid role" });
  }

  try {
    // Update Firestore
    await db.collection("users").doc(uid).update({ role });

    // Optionally, update Firebase Auth custom claims for role-based auth
    await admin.auth().setCustomUserClaims(uid, { role });

    res.json({ message: `Role updated to ${role}` });
  } catch(err) {
    console.error("Error updating user role:", err);
    res.status(500).json({ error: "Failed to update role" });
  }
});

// ---------------- DELETE user ----------------
app.delete("/users/:uid", async (req, res) => {
  const { uid } = req.params;

  try {
    // Delete from Firebase Auth
    await admin.auth().deleteUser(uid);

    // Delete from Firestore
    await db.collection("users").doc(uid).delete();

    res.json({ message: "User deleted successfully" });
  } catch(err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});


// -------------------- EXPORT -------------------- //
exports.v1 = functions.https.onRequest(app);

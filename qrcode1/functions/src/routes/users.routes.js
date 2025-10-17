const express = require("express");
const router = express.Router();
const { normalizeCountry } = require("../helpers/normalize");

// 🔹 GET all users across all countries
router.get("/", async (req, res) => {
  const db = req.db;

  try {
    const eventsSnap = await db.collection("events").get();
    const allUsers = [];

    for (const eventDoc of eventsSnap.docs) {
      const usersSnap = await eventDoc.ref.collection("users").get();
      usersSnap.forEach(u => {
        allUsers.push({
          country: eventDoc.id,
          userId: u.id,
          ...u.data(),
        });
      });
    }

    res.json(allUsers);
  } catch (err) {
    console.error("❌ Error fetching all users:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 GET all users for a specific country
router.get("/:country", async (req, res) => {
  const db = req.db;
  const { country } = req.params;
  const normalized = normalizeCountry(country);

  try {
    const snapshot = await db.collection("events").doc(normalized).collection("users").get();
    const users = snapshot.docs.map(d => ({ userId: d.id, ...d.data() }));
    res.json(users);
  } catch (err) {
    console.error(`❌ Error fetching users for ${country}:`, err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 GET a specific user in a country
router.get("/:country/:userId", async (req, res) => {
  const db = req.db;
  const { country, userId } = req.params;

  try {
    const doc = await db.collection("events")
      .doc(normalizeCountry(country))
      .collection("users")
      .doc(userId)
      .get();

    if (!doc.exists) return res.status(404).json({ error: "User not found" });
    res.json({ userId: doc.id, ...doc.data() });
  } catch (err) {
    console.error("❌ Error fetching user:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 POST add or update a user in a country
router.post("/:country", async (req, res) => {
  const db = req.db;
  const { country } = req.params;
  const { userId, ...fields } = req.body;

  if (!userId) return res.status(400).json({ error: "Missing userId" });

  try {
    const userRef = db.collection("events")
      .doc(normalizeCountry(country))
      .collection("users")
      .doc(userId);

    await userRef.set(
      { ...fields, userId, invited: fields.invited ?? false, updatedAt: new Date() },
      { merge: true }
    );

    res.status(201).json({ message: `User ${userId} added/updated for ${country}` });
  } catch (err) {
    console.error("❌ Error saving user:", err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 POST send bulk invites
router.post("/:country/send-invite", async (req, res) => {
  const db = req.db;
  const { country } = req.params;
  const { userIds } = req.body;

  if (!Array.isArray(userIds) || !userIds.length)
    return res.status(400).json({ error: "userIds array required" });

  try {
    const batch = db.batch();
    const normalized = normalizeCountry(country);

    userIds.forEach(userId => {
      const userRef = db.collection("events").doc(normalized).collection("users").doc(userId);
      batch.update(userRef, { invited: true, inviteSentAt: new Date() });
    });

    await batch.commit();
    res.json({ message: `Invitations sent to ${userIds.length} users` });
  } catch (err) {
    console.error("❌ Error sending invites:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const { normalizeCountry } = require("../helpers/normalize");

// 🔹 GET users assigned to a specific event in a country
router.get("/:country/assigned/:eventName", async (req, res) => {
  const db = req.db;
  const { country, eventName } = req.params;
  const normalized = normalizeCountry(country);
  const decodedEvent = decodeURIComponent(eventName).toLowerCase().trim();

  console.log(`Fetching users in /events/${normalized}/users assigned to "${decodedEvent}"`);

  try {
    const usersRef = db.collection("events").doc(normalized).collection("users");
    const snapshot = await usersRef.get();

    if (snapshot.empty) {
      console.log(" No users found in this country's collection");
      return res.status(404).json({ message: "No users found for this country" });
    }

    const matchedUsers = snapshot.docs
      .map(doc => ({ userId: doc.id, ...doc.data() }))
      .filter(u =>
        typeof u.assignedEvent === "string" &&
        u.assignedEvent.toLowerCase().trim() === decodedEvent
      );

    console.log(` Matched users count: ${matchedUsers.length}`);

    if (!matchedUsers.length) {
      return res.status(404).json({ message: "No users found for this event" });
    }

    res.json(matchedUsers);
  } catch (error) {
    console.error(" Error fetching assigned users:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const { normalizeCountry } = require("../helpers/normalize");

// 🔹 GET all event countries
router.get("/", async (req, res) => {
  const db = req.db;
  try {
    const snapshot = await db.collection("events").get();
    const countries = snapshot.docs.map((doc) => ({ country: doc.id }));
    res.json(countries);
  } catch (err) {
    console.error("❌ Error fetching countries:", err);
    res.status(500).send(err.message);
  }
});

// 🔹 POST create new event under country
router.post("/:country", async (req, res) => {
  const { country } = req.params;
  const { title, startTime, endTime } = req.body; // Added endTime
  const db = req.db;

  if (!title || !startTime || !endTime)
    return res.status(400).send("Missing title, startTime or endTime");

  if (new Date(endTime) < new Date(startTime))
    return res.status(400).send("endTime must be after startTime");

  try {
    const normalized = normalizeCountry(country);
    const newEventRef = db
      .collection("events")
      .doc(normalized)
      .collection("events")
      .doc();

    const eventData = {
      eventId: newEventRef.id,
      title,
      startTime: new Date(startTime),
      endTime: new Date(endTime), // store endTime
      createdAt: new Date(),
    };

    await newEventRef.set(eventData);
    res.status(201).json({ message: "Event created", data: eventData });
  } catch (err) {
    console.error("❌ Error adding event:", err);
    res.status(500).send(err.message);
  }
});

// 🔹 GET all events for a country
router.get("/:country", async (req, res) => {
  const { country } = req.params;
  const db = req.db;

  try {
    const normalized = normalizeCountry(country);
    const snapshot = await db
      .collection("events")
      .doc(normalized)
      .collection("events")
      .orderBy("startTime", "asc")
      .get();

    const events = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        eventId: doc.id,
        ...data,
        startTime: data.startTime?.toDate?.().toISOString() ?? data.startTime,
        endTime: data.endTime?.toDate?.().toISOString() ?? data.endTime, // return endTime
      };
    });

    res.json(events);
  } catch (err) {
    console.error("❌ Error fetching events:", err);
    res.status(500).send(err.message);
  }
});

// 🔹 Assign event to multiple users
router.post("/:country/assign", async (req, res) => {
  const { country } = req.params;
  const { eventId, userIds } = req.body; // changed from eventTitle to eventId
  const db = req.db;

  if (!eventId || !Array.isArray(userIds))
    return res.status(400).send("Missing eventId or userIds");

  try {
    const normalized = normalizeCountry(country);
    const eventRef = db
      .collection("events")
      .doc(normalized)
      .collection("events")
      .doc(eventId);

    const eventDoc = await eventRef.get();
    if (!eventDoc.exists)
      return res.status(404).send("Event not found");

    const eventTitle = eventDoc.data().title;
    const batch = db.batch();

    userIds.forEach((userId) => {
      const userRef = db
        .collection("events")
        .doc(normalized)
        .collection("users")
        .doc(userId);
      batch.update(userRef, { assignedEvent: eventTitle, updatedAt: new Date() });
    });

    await batch.commit();
    res.status(200).send(`Event "${eventTitle}" assigned to ${userIds.length} users`);
  } catch (err) {
    console.error("❌ Error assigning event:", err);
    res.status(500).send(err.message);
  }
});

module.exports = router;

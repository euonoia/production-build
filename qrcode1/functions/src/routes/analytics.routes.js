const express = require("express");
const router = express.Router();

router.get("/overview", async (req, res) => {
  const db = req.db;
  try {
    const eventsSnapshot = await db.collection("events").get();

    let totalCountries = eventsSnapshot.size;
    let totalUsers = 0;
    let totalEvents = 0;
    let totalInvited = 0;

    for (const countryDoc of eventsSnapshot.docs) {
      const id = countryDoc.id;

      const usersSnap = await db.collection("events").doc(id).collection("users").get();
      totalUsers += usersSnap.size;
      usersSnap.forEach((doc) => {
        if (doc.data().invited) totalInvited++;
      });

      const eventsSnap = await db.collection("events").doc(id).collection("events").get();
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

router.get("/events", async (req, res) => {
  const db = req.db;
  try {
    const snapshot = await db.collection("events").get();
    const data = [];

    for (const doc of snapshot.docs) {
      const country = doc.id;
      const usersSnap = await db.collection("events").doc(country).collection("users").get();
      const invited = usersSnap.docs.filter((d) => d.data().invited).length;
      const eventsSnap = await db.collection("events").doc(country).collection("events").get();

      data.push({
        country,
        users: usersSnap.size,
        invited,
        notInvited: usersSnap.size - invited,
        events: eventsSnap.size,
      });
    }

    res.json(data);
  } catch (err) {
    console.error("❌ Analytics events error:", err);
    res.status(500).send(err.message);
  }
});

router.get("/countries", async (req, res) => {
  const db = req.db;
  try {
    const snapshot = await db.collection("events").get();
    const countriesData = [];

    const latLngMap = {
      united_states: { lat: 37.09, lng: -95.71 },
      canada: { lat: 56.13, lng: -106.34 },
      philippines: { lat: 12.88, lng: 121.77 },
      india: { lat: 20.59, lng: 78.96 },
      japan: { lat: 36.20, lng: 138.25 },
    };

    for (const doc of snapshot.docs) {
      const id = doc.id.toLowerCase();
      const usersSnap = await db.collection("events").doc(id).collection("users").get();
      const invited = usersSnap.docs.filter((d) => d.data().invited).length;
      const eventsSnap = await db.collection("events").doc(id).collection("events").get();

      const coords = latLngMap[id] || { lat: 0, lng: 0 };

      countriesData.push({
        country: id,
        users: usersSnap.size,
        invited,
        notInvited: usersSnap.size - invited,
        events: eventsSnap.size,
        ...coords,
      });
    }

    res.json(countriesData);
  } catch (err) {
    console.error("❌ Analytics countries error:", err);
    res.status(500).send(err.message);
  }
});

module.exports = router;

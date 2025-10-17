const express = require("express");
const router = express.Router();
const { admin } = require("../config/firebase");

// ---------------- GET all users with Firebase Auth status
router.get("/users", async (req, res) => {
  const db = req.db;

  try {
    const usersSnap = await db.collection("users").get();
    const users = await Promise.all(
      usersSnap.docs.map(async doc => {
        const data = doc.data();
        let disabled = false;

        try {
          const userRecord = await admin.auth().getUser(doc.id);
          disabled = userRecord.disabled;
        } catch (err) {
          console.warn(`⚠️ Could not fetch Auth record for ${doc.id}:`, err.message);
        }

        return {
          id: doc.id,
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          email: data.email || "-",
          disabled,
        };
      })
    );

    res.json(users);
  } catch (err) {
    console.error("❌ Error fetching users:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// ---------------- DELETE user
router.delete("/users/:uid", async (req, res) => {
  const db = req.db;
  const { uid } = req.params;

  async function deleteDoc(ref) {
    const snap = await ref.get();
    if (snap.exists) await ref.delete();
  }

  try {
    const userRef = db.collection("users").doc(uid);
    const userSnap = await userRef.get();
    if (!userSnap.exists) return res.status(404).json({ error: "User not found" });

    const country = userSnap.data()?.country?.toLowerCase().replace(/\s+/g, "_");

    try { await admin.auth().deleteUser(uid); } catch {}
    await deleteDoc(userRef);

    if (country) {
      const eventUserRef = db.collection("events").doc(country).collection("users").doc(uid);
      await deleteDoc(eventUserRef);
    }

    res.json({ message: `User ${uid} deleted successfully` });
  } catch (err) {
    console.error("❌ Error deleting user:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// ---------------- PATCH disable/enable user
router.patch("/users/:uid/disable", async (req, res) => {
  const db = req.db;
  const { uid } = req.params;
  const disable = req.body.disable ?? true;

  try {
    await admin.auth().updateUser(uid, { disabled: disable });
    await db.collection("users").doc(uid).update({
      status: disable ? "disabled" : "active",
      updatedAt: new Date(),
    });

    res.json({ message: `User ${uid} ${disable ? "disabled" : "enabled"} successfully` });
  } catch (err) {
    console.error("❌ Failed to toggle user:", err);
    res.status(500).json({ error: `Failed to ${disable ? "disable" : "enable"} user` });
  }
});

module.exports = router;

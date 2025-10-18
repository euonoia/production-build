const express = require("express");
const router = express.Router();

let clients = new Set(); // 🧹 Using a Set prevents duplicates and is faster to clean
let lastPrint = null;

// 🟢 Web dashboard connects via SSE (Server-Sent Events)
router.get("/stream", (req, res) => {
  // Set headers to keep the connection open
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });
  res.flushHeaders();

  // Add to connected clients
  clients.add(res);
  console.log(`🟢 Web connected (${clients.size} total)`);

  // Immediately send the last known print event (for page refresh)
  if (lastPrint) {
    res.write(`data: ${JSON.stringify(lastPrint)}\n\n`);
  }

  // Remove when disconnected
  req.on("close", () => {
    clients.delete(res);
    console.log(`🔴 Web disconnected (${clients.size} remaining)`);
  });
});

// 🔹 Triggered from the phone when “Print Now” is pressed
router.post("/", (req, res) => {
  const { userId, country, assignedEvent, firstName, lastName } = req.body;

  // Validate input
  if (!userId || !country) {
    console.warn("⚠️ Missing required fields in print request");
    return res.status(400).json({ error: "Missing userId or country" });
  }

  // Prepare broadcast payload
  const data = {
    userId,
    country,
    assignedEvent: assignedEvent || "N/A",
    firstName: firstName || "",
    lastName: lastName || "",
    time: Date.now(),
  };

  lastPrint = data;
  console.log("📢 Broadcasting print event to web clients:", data);

  // Broadcast to all connected dashboards
  for (const client of clients) {
    try {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      console.error("⚠️ Failed to send to client:", err);
      clients.delete(client); // Remove broken connection
    }
  }

  return res.json({ success: true, message: "Print event broadcasted" });
});

module.exports = router;

const express = require("express");
const cors = require("cors");
const { db } = require("./config/firebase");

// -------------------- 🔹 EXPRESS APP INIT -------------------- //
const app = express();

// ✅ Prevent compression/buffering (needed for Server-Sent Events)
app.disable("etag");
app.set("x-powered-by", false);
app.use((req, res, next) => {
  // Disable caching for SSE
  res.setHeader("Cache-Control", "no-cache");
  // Some environments (like Firebase Emulator) buffer by default
  if (!res.flushHeaders) res.flushHeaders = () => {};
  next();
});

// ✅ Enable CORS globally
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Parse incoming JSON
app.use(express.json());

// ✅ Attach Firestore to all requests
app.use((req, res, next) => {
  req.db = db;
  next();
});

// -------------------- 🔹 ROUTES -------------------- //
const userRoutes = require("./routes/users.routes");
const eventRoutes = require("./routes/events.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const adminRoutes = require("./routes/admin.routes");
const eventOrganizerRoutes = require("./routes/eventOrganizer.routes");
const notifyPrintRoutes = require("./routes/notifyprint.routes");

// Mount route handlers
app.use("/users", userRoutes);
app.use("/events", eventRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/admin", adminRoutes);
app.use("/eventOrganizer", eventOrganizerRoutes);
app.use("/notifyPrint", notifyPrintRoutes);

// -------------------- 🔹 READY -------------------- //
console.log("✅ Express API initialized (SSE-safe)");

module.exports = app;

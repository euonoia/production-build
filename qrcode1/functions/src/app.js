const express = require("express");
const cors = require("cors");
const { db } = require("./config/firebase");

// Import routes
const userRoutes = require("./routes/users.routes");
const eventRoutes = require("./routes/events.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const adminRoutes = require("./routes/admin.routes");
const eventOrganizerRoutes = require("./routes/eventOrganizer.routes");

// Initialize Express
const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Attach Firestore to all requests
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Register routes
app.use("/users", userRoutes);
app.use("/events", eventRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/admin", adminRoutes);
app.use("/eventOrganizer", eventOrganizerRoutes);

console.log("✅ Express API initialized");

module.exports = app;

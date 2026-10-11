const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");

// Public routes
router.get("/health", (req, res) => {
    res.json({ ok: true, service: "movezapp-backend" });
});

// Dev routes (dev-only token mint)
const devRoutes = require("./dev");
router.use(devRoutes);

// Protected routes
const trainingRoutes = require("./training");
const activityRoutes = require("./activities");
const todayRoutes = require("./today");

router.use(auth);

router.get("/me", (req, res) => {
    res.json({ ok: true, user: req.user });
});

router.use(trainingRoutes);
router.use(activityRoutes);
router.use(todayRoutes);

module.exports = router;
const express = require("express");
const jwt = require("jsonwebtoken");
const { requireBody } = require("./_validate");

const router = express.Router();

// DEV ONLY: mint a token for local testing
router.post("/dev/token", (req, res) => {
    const isProd = (process.env.NODE_ENV || "").toLowerCase() === "production";
    if (isProd) return res.status(404).json({ error: "Not found" });

    const { id, username, is_paid, is_paid_onetime, expires_in_seconds } = req.body || {};

    if (!requireBody(req, res, ["id", "username"])) return;

    const payload = {
        id: Number.isFinite(Number(id)) ? Number(id) : 3,
        username: username || "devuser",
        is_paid: typeof is_paid === "boolean" ? is_paid : true,
        is_paid_onetime: typeof is_paid_onetime === "boolean" ? is_paid_onetime : false,
    };

    const expSeconds = Number.isFinite(Number(expires_in_seconds))
        ? Number(expires_in_seconds)
        : 60 * 60; // 1 hour

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: expSeconds });

    return res.json({ ok: true, token, payload, expires_in_seconds: expSeconds });
});

module.exports = router;
const express = require("express");
const router = express.Router();
const db = require("../db/knex");
const { requireBody, requireNumber } = require("./_validate");

router.post("/activity_entries", async (req, res) => {
    const userId = req.user.id;
    const {
        occurred_at,
        activity_type,
        duration_minutes,
        distance,
        steps,
        intensity,
        note
    } = req.body || {};

    if (!requireBody(req, res, ["activity_type", "duration_minutes"])) return;
    if (!requireNumber(req, res, "duration_minutes")) return;

    try {
        const [row] = await db("activity_entries")
            .insert({
                user_id: userId,
                occurred_at: occurred_at ? new Date(occurred_at) : db.fn.now(),
                activity_type,
                duration_minutes: Number(duration_minutes),
                distance: distance != null ? Number(distance) : null,
                steps: steps != null ? Number(steps) : null,
                intensity: intensity || null,
                note: note || null
            })
            .returning(["id", "user_id", "occurred_at", "activity_type", "duration_minutes"]);

        res.status(201).json({ ok: true, activity: row });
    } catch (err) {
        res.status(500).json({ ok: false, error: "Failed to log activity" });
    }
});

router.put("/activity_entries/:id", async (req, res) => {
    const userId = req.user.id;
    const activityId = Number(req.params.id);
    const {
        occurred_at,
        activity_type,
        duration_minutes,
        distance,
        steps,
        intensity,
        note
    } = req.body || {};

    if (!Number.isFinite(activityId)) {
        return res.status(400).json({ ok: false, error: "Invalid activity id" });
    }

    if (duration_minutes != null && !requireNumber(req, res, "duration_minutes")) return;

    const updates = {};
    if (occurred_at != null) updates.occurred_at = new Date(occurred_at);
    if (activity_type != null) updates.activity_type = activity_type;
    if (duration_minutes != null) updates.duration_minutes = Number(duration_minutes);
    if (distance != null) updates.distance = Number(distance);
    if (steps != null) updates.steps = Number(steps);
    if (intensity != null) updates.intensity = intensity || null;
    if (note != null) updates.note = note || null;

    if (!Object.keys(updates).length) {
        return res.status(400).json({ ok: false, error: "No fields to update" });
    }

    try {
        const [row] = await db("activity_entries")
            .where({ id: activityId, user_id: userId })
            .update(updates)
            .returning(["id", "user_id", "occurred_at", "activity_type", "duration_minutes", "distance", "steps", "intensity", "note"]);

        if (!row) {
            return res.status(404).json({ ok: false, error: "Activity not found" });
        }

        res.json({ ok: true, activity: row });
    } catch (err) {
        res.status(500).json({ ok: false, error: "Failed to update activity" });
    }
});

router.delete("/activity_entries/:id", async (req, res) => {
    const userId = req.user.id;
    const activityId = Number(req.params.id);

    if (!Number.isFinite(activityId)) {
        return res.status(400).json({ ok: false, error: "Invalid activity id" });
    }

    try {
        const deleted = await db("activity_entries")
            .where({ id: activityId, user_id: userId })
            .del();

        if (!deleted) {
            return res.status(404).json({ ok: false, error: "Activity not found" });
        }

        res.json({ ok: true, deleted: true });
    } catch (err) {
        res.status(500).json({ ok: false, error: "Failed to delete activity" });
    }
});

module.exports = router;
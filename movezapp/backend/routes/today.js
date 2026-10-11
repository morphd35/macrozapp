const express = require("express");
const router = express.Router();
const db = require("../db/knex");

router.get("/today", async (req, res) => {
    const userId = req.user.id;

    // Start of today in local time
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    try {
        const sessions = await db("training_sessions")
            .where("user_id", userId)
            .andWhere("started_at", ">=", start)
            .orderBy("started_at", "desc");

        const sessionIds = sessions.map(s => s.id);

        const exercises = sessionIds.length
            ? await db("training_exercises").whereIn("session_id", sessionIds).orderBy(["session_id", { column: "sort_order", order: "asc" }])
            : [];

        const exerciseIds = exercises.map(e => e.id);

        const sets = exerciseIds.length
            ? await db("training_sets").whereIn("exercise_id", exerciseIds).orderBy(["exercise_id", { column: "set_no", order: "asc" }])
            : [];

        const activities = await db("activity_entries")
            .where("user_id", userId)
            .andWhere("occurred_at", ">=", start)
            .orderBy("occurred_at", "desc");

        const exercisesBySession = new Map();
        exercises.forEach(ex => {
            const list = exercisesBySession.get(ex.session_id) || [];
            list.push({ ...ex, sets: [] });
            exercisesBySession.set(ex.session_id, list);
        });

        const setsByExercise = new Map();
        sets.forEach(set => {
            const list = setsByExercise.get(set.exercise_id) || [];
            list.push(set);
            setsByExercise.set(set.exercise_id, list);
        });

        exercisesBySession.forEach((list) => {
            list.forEach((ex) => {
                ex.sets = setsByExercise.get(ex.id) || [];
            });
        });

        const groupedSessions = sessions.map(session => ({
            ...session,
            exercises: exercisesBySession.get(session.id) || [],
        }));

        res.json({ ok: true, sessions: groupedSessions, activities });
    } catch (err) {
        res.status(500).json({ ok: false, error: "Failed to load today" });
    }
});

router.get("/history", async (req, res) => {
    const userId = req.user.id;
    const { from, to, type, exercise } = req.query || {};

    if (!from || !to) {
        return res.status(400).json({ ok: false, error: "from and to are required" });
    }

    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(from) || !dateRegex.test(to)) {
        return res.status(400).json({ ok: false, error: "from/to must be YYYY-MM-DD" });
    }

    const start = new Date(`${from}T00:00:00`);
    const end = new Date(`${to}T23:59:59`);

    try {
        const wantsTraining = !type || String(type).toLowerCase() === "training";
        const wantsActivity = !type || String(type).toLowerCase() === "activity";
        const exerciseFilter = exercise ? String(exercise).toLowerCase() : null;

        let sessions = [];
        let exercises = [];
        let sets = [];

        if (wantsTraining) {
            sessions = await db("training_sessions")
                .where("user_id", userId)
                .andWhere("started_at", ">=", start)
                .andWhere("started_at", "<=", end)
                .orderBy("started_at", "desc");

            const sessionIds = sessions.map(s => s.id);

            exercises = sessionIds.length
                ? await db("training_exercises").whereIn("session_id", sessionIds).orderBy(["session_id", { column: "sort_order", order: "asc" }])
                : [];

            if (exerciseFilter) {
                exercises = exercises.filter(ex => String(ex.name || "").toLowerCase().includes(exerciseFilter));
                const allowedSessionIds = new Set(exercises.map(ex => ex.session_id));
                sessions = sessions.filter(s => allowedSessionIds.has(s.id));
            }

            const exerciseIds = exercises.map(e => e.id);

            sets = exerciseIds.length
                ? await db("training_sets").whereIn("exercise_id", exerciseIds).orderBy(["exercise_id", { column: "set_no", order: "asc" }])
                : [];
        }

        const activities = wantsActivity
            ? await db("activity_entries")
                .where("user_id", userId)
                .andWhere("occurred_at", ">=", start)
                .andWhere("occurred_at", "<=", end)
                .orderBy("occurred_at", "desc")
            : [];

        res.json({ ok: true, sessions, exercises, sets, activities });
    } catch (err) {
        res.status(500).json({ ok: false, error: "Failed to load history" });
    }
});

module.exports = router;
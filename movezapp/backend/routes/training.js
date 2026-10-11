const express = require("express");
const router = express.Router();
const db = require("../db/knex");
const { requireBody, requireArray } = require("./_validate");

// Create a training session
router.post("/training_sessions", async (req, res) => {
    const userId = req.user.id;
    const { started_at, note } = req.body || {};

    if (!requireBody(req, res, [])) return;

    try {
        const [row] = await db("training_sessions")
            .insert({
                user_id: userId,
                started_at: started_at ? new Date(started_at) : db.fn.now(),
                note: note || null
            })
            .returning(["id", "user_id", "started_at", "note"]);

        res.status(201).json({ ok: true, session: row });
    } catch (err) {
        res.status(500).json({ ok: false, error: "Failed to create session" });
    }
});

// Create a full session with exercises and sets (paste workout)
router.post("/training_sessions/full", async (req, res) => {
    const userId = req.user.id;
    const { session, exercises } = req.body || {};

    if (!requireBody(req, res, ["session", "exercises"])) return;
    if (!Array.isArray(exercises) || exercises.length === 0) {
        return res.status(400).json({ ok: false, error: "exercises must be a non-empty array" });
    }

    const startedAt = session?.started_at ? new Date(session.started_at) : db.fn.now();
    const note = session?.note || null;

    try {
        const result = await db.transaction(async (trx) => {
            const [createdSession] = await trx("training_sessions")
                .insert({
                    user_id: userId,
                    started_at: startedAt,
                    note,
                })
                .returning(["id", "user_id", "started_at", "note"]);

            const createdExercises = [];
            const createdSets = [];

            for (let i = 0; i < exercises.length; i += 1) {
                const ex = exercises[i] || {};
                if (!ex.name) {
                    throw new Error("exercise name is required");
                }

                const [createdExercise] = await trx("training_exercises")
                    .insert({
                        session_id: createdSession.id,
                        name: ex.name,
                        sort_order: Number.isFinite(ex.sort_order) ? ex.sort_order : i,
                    })
                    .returning(["id", "session_id", "name", "sort_order"]);

                createdExercises.push(createdExercise);

                const sets = Array.isArray(ex.sets) ? ex.sets : [];
                if (!sets.length) {
                    throw new Error("each exercise requires at least one set");
                }

                const invalidSet = sets.find((s) => {
                    const setType = (s.set_type || "normal").toLowerCase();
                    const hasReps = Number.isFinite(Number(s.reps));
                    const hasWeight = Number.isFinite(Number(s.weight));
                    if (setType === "bodyweight") return !hasReps;
                    return !hasReps || !hasWeight;
                });
                if (invalidSet) {
                    throw new Error("each set requires reps; weight is required unless set_type is bodyweight");
                }

                if (sets.length) {
                    const rowsToInsert = sets.map((s, setIndex) => ({
                        exercise_id: createdExercise.id,
                        set_no: Number.isFinite(s.set_no) ? s.set_no : (setIndex + 1),
                        weight: Number(s.weight),
                        reps: Number(s.reps),
                        set_type: s.set_type || "normal",
                        note: s.note || null,
                    }));

                    const insertedSets = await trx("training_sets")
                        .insert(rowsToInsert)
                        .returning(["id", "exercise_id", "set_no", "weight", "reps", "set_type"]);

                    createdSets.push(...insertedSets);
                }
            }

            return { session: createdSession, exercises: createdExercises, sets: createdSets };
        });

        res.status(201).json({ ok: true, ...result });
    } catch (err) {
        const message = err?.message || "Failed to create full session";
        res.status(500).json({ ok: false, error: message });
    }
});

// Add an exercise to a session
router.post("/training_sessions/:sessionId/exercises", async (req, res) => {
    const userId = req.user.id;
    const sessionId = Number(req.params.sessionId);
    const { name, sort_order } = req.body || {};

    if (!requireBody(req, res, ["name"])) return;

    try {
        // Ensure session belongs to user
        const session = await db("training_sessions").where({ id: sessionId, user_id: userId }).first();
        if (!session) return res.status(404).json({ ok: false, error: "Session not found" });

        const [row] = await db("training_exercises")
            .insert({
                session_id: sessionId,
                name,
                sort_order: Number.isFinite(sort_order) ? sort_order : 0
            })
            .returning(["id", "session_id", "name", "sort_order"]);

        res.status(201).json({ ok: true, exercise: row });
    } catch (err) {
        res.status(500).json({ ok: false, error: "Failed to add exercise" });
    }
});

// Bulk add sets to an exercise
router.post("/training_exercises/:exerciseId/sets", async (req, res) => {
    const userId = req.user.id;
    const exerciseId = Number(req.params.exerciseId);
    const { sets } = req.body || {};

    if (!requireArray(req, res, "sets") || sets.length === 0) {
        return res.status(400).json({ ok: false, error: "sets array is required" });
    }

    const invalidSet = sets.find((s) => {
        const setType = (s.set_type || "normal").toLowerCase();
        const hasReps = Number.isFinite(Number(s.reps));
        const hasWeight = Number.isFinite(Number(s.weight));
        if (setType === "bodyweight") return !hasReps;
        return !hasReps || !hasWeight;
    });
    if (invalidSet) {
        return res.status(400).json({ ok: false, error: "each set requires reps; weight is required unless set_type is bodyweight" });
    }

    try {
        // Ensure exercise belongs to user (join session)
        const exercise = await db("training_exercises as e")
            .join("training_sessions as s", "s.id", "e.session_id")
            .where("e.id", exerciseId)
            .andWhere("s.user_id", userId)
            .select("e.id")
            .first();

        if (!exercise) return res.status(404).json({ ok: false, error: "Exercise not found" });

        const rowsToInsert = sets.map((s, i) => ({
            exercise_id: exerciseId,
            set_no: Number.isFinite(s.set_no) ? s.set_no : (i + 1),
            weight: Number(s.weight),
            reps: Number(s.reps),
            set_type: s.set_type || "normal",
            note: s.note || null
        }));

        const inserted = await db("training_sets")
            .insert(rowsToInsert)
            .returning(["id", "exercise_id", "set_no", "weight", "reps", "set_type"]);

        res.status(201).json({ ok: true, sets: inserted });
    } catch (err) {
        res.status(500).json({ ok: false, error: "Failed to add sets" });
    }
});

module.exports = router;
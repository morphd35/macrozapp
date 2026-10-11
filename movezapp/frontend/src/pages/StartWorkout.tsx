import React, { useEffect, useMemo, useState } from "react";

type ParsedSet = {
    set_no: number;
    weight: number;
    reps: number;
    set_type: string;
};

type ParsedExercise = {
    name: string;
    sort_order: number;
    sets: ParsedSet[];
};

type ParsedActivity = {
    activity_type: string;
    duration_minutes: number;
    note?: string;
};

type BuilderSet = {
    weight: string;
    reps: string;
    sets: string;
    set_type: string;
};

type BuilderExercise = {
    name: string;
    sets: BuilderSet[];
};

const StartWorkout: React.FC = () => {
    const [pasteText, setPasteText] = useState("");
    const [note, setNote] = useState("");
    const [startedAt, setStartedAt] = useState("");
    const [treatMinutesAsActivity, setTreatMinutesAsActivity] = useState(true);
    const [builderExercises, setBuilderExercises] = useState<BuilderExercise[]>([
        { name: "", sets: [{ weight: "", reps: "", sets: "1", set_type: "normal" }] },
    ]);
    const [exerciseSuggestions, setExerciseSuggestions] = useState<string[]>([]);
    const [structuredError, setStructuredError] = useState<string | null>(null);
    const [structuredStatus, setStructuredStatus] = useState<string | null>(null);
    const [pasteError, setPasteError] = useState<string | null>(null);
    const [pasteStatus, setPasteStatus] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const apiBase = useMemo(() => {
        return process.env.REACT_APP_API_BASE_URL || "http://localhost:5055";
    }, []);

    useEffect(() => {
        if (startedAt) return;
        const now = new Date();
        const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        setStartedAt(local);
    }, [startedAt]);

    React.useEffect(() => {
        const stored = localStorage.getItem("movezapp_exercises");
        if (!stored) return;
        try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
                setExerciseSuggestions(parsed.filter(Boolean));
            }
        } catch {
            setExerciseSuggestions([]);
        }
    }, []);

    const parseWorkout = (input: string) => {
        const warnings: string[] = [];
        const exercises: ParsedExercise[] = [];
        const activities: ParsedActivity[] = [];

        const cleanExerciseName = (name: string) => {
            return name.replace(/^[^A-Za-z0-9]+/, "").trim();
        };

        const isNoteLine = (line: string) => {
            const trimmed = line.trim();
            return trimmed.startsWith("(") && trimmed.endsWith(")");
        };

        const getOrCreateExercise = (name: string) => {
            const trimmed = cleanExerciseName(name);
            if (!trimmed) return null;
            const exercise = {
                name: trimmed,
                sort_order: exercises.length,
                sets: [] as ParsedSet[],
            };
            exercises.push(exercise);
            return exercise;
        };

        const parseSetLine = (line: string) => {
            const lower = line.toLowerCase();
            const isBodyweight = /\b(bw|bodyweight)\b/.test(lower);
            const repFirstMatch = line.match(/(\d+(?:\.\d+)?)\s*(?:reps?)?(?:\s*x\s*(\d+(?:\.\d+)?))?\s*@\s*(\d+(?:\.\d+)?)/i);

            if (repFirstMatch) {
                const reps = Number(repFirstMatch[1]);
                const sets = repFirstMatch[2] ? Number(repFirstMatch[2]) : 1;
                const weight = Number(repFirstMatch[3]);
                if (!Number.isFinite(reps) || reps <= 0) return null;
                if (!Number.isFinite(sets) || sets <= 0) return null;
                if (!Number.isFinite(weight)) return null;
                return { weight, reps, sets, set_type: isBodyweight ? "bodyweight" : "normal" };
            }

            const numbers = line.match(/[\d]+(?:\.\d+)?/g)?.map(Number) ?? [];
            if (numbers.length < 2) return null;

            let weight = 0;
            let reps = 0;
            let sets = 1;
            let set_type = isBodyweight ? "bodyweight" : "normal";

            if (numbers.length >= 3) {
                [weight, reps, sets] = numbers;
            } else if (isBodyweight) {
                [reps, sets] = numbers;
            } else {
                [weight, reps] = numbers;
            }

            if (!Number.isFinite(reps) || reps <= 0) return null;
            if (!Number.isFinite(sets) || sets <= 0) sets = 1;

            return { weight, reps, sets, set_type };
        };

        const parseActivityLine = (line: string) => {
            const match = line.match(/(\d+(?:\.\d+)?)\s*(min|mins|minutes)\b/i);
            if (!match) return null;
            const duration = Number(match[1]);
            if (!Number.isFinite(duration) || duration <= 0) return null;
            const activity_type = line.replace(match[0], "").trim() || "Activity";
            return { activity_type, duration_minutes: duration, note: line };
        };

        const lines = input
            .split(/\r?\n/)
            .map(line => line.trim())
            .filter(Boolean);

        let currentExercise: ParsedExercise | null = null;

        lines.forEach((line) => {
            const hasNumber = /\d/.test(line);
            const hasLetters = /[A-Za-z]/.test(line);

            if (treatMinutesAsActivity) {
                const activity = parseActivityLine(line);
                if (activity) {
                    activities.push(activity);
                    return;
                }
            }

            if (!hasNumber) {
                if (!hasLetters || isNoteLine(line)) {
                    return;
                }
                currentExercise = getOrCreateExercise(line);
                return;
            }

            if (!currentExercise) {
                currentExercise = getOrCreateExercise("Misc") || currentExercise;
            }

            const parsed = parseSetLine(line);
            if (!parsed) {
                warnings.push(`Could not parse line: \"${line}\"`);
                return;
            }

            const { weight, reps, sets, set_type } = parsed;
            const existingCount = currentExercise?.sets.length || 0;
            const newSets: ParsedSet[] = Array.from({ length: sets }).map((_, setIndex) => ({
                set_no: existingCount + setIndex + 1,
                weight,
                reps,
                set_type,
            }));

            currentExercise?.sets.push(...newSets);
        });

        return { exercises, activities, warnings };
    };

    const handleSaveWorkout = async () => {
        setPasteError(null);
        setPasteStatus(null);

        const token = localStorage.getItem("movezapp_token");
        if (!token) {
            setPasteError("No token found. Use the dev token on Today for now.");
            return;
        }

        const { exercises, activities, warnings } = parseWorkout(pasteText);
        if (!exercises.length) {
            setPasteError("No exercises parsed. Check the paste format.");
            return;
        }

        if (warnings.length) {
            setPasteStatus(`Parsed with warnings: ${warnings.join(" ")}`);
        }

        setIsSaving(true);
        try {
            const response = await fetch(`${apiBase}/api/training_sessions/full`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    session: {
                        started_at: startedAt || undefined,
                        note: note || undefined,
                    },
                    exercises,
                }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || "Failed to save workout");
            }

            if (activities.length) {
                await Promise.all(
                    activities.map((activity) =>
                        fetch(`${apiBase}/api/activity_entries`, {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                                activity_type: activity.activity_type,
                                duration_minutes: activity.duration_minutes,
                                occurred_at: startedAt || undefined,
                                note: activity.note,
                            }),
                        })
                    )
                );
            }

            setPasteStatus("Workout saved.");
            setPasteText("");
            setNote("");
            setStartedAt("");
        } catch (err) {
            setPasteError(err instanceof Error ? err.message : "Failed to save workout");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveStructured = async () => {
        setStructuredError(null);
        setStructuredStatus(null);

        const token = localStorage.getItem("movezapp_token");
        if (!token) {
            setStructuredError("No token found. Use the dev token on Today for now.");
            return;
        }

        const exercises = builderExercises
            .map((exercise, exerciseIndex) => {
                const name = exercise.name.trim();
                const sets = exercise.sets.flatMap((set, setIndex) => {
                    const weight = Number(set.weight);
                    const reps = Number(set.reps);
                    const count = Number(set.sets) || 1;
                    const setType = (set.set_type || "normal").trim() || "normal";

                    if (!Number.isFinite(weight) || !Number.isFinite(reps)) return [];

                    return Array.from({ length: count }).map((_, offset) => ({
                        set_no: setIndex + offset + 1,
                        weight,
                        reps,
                        set_type: setType,
                    }));
                });

                return {
                    name,
                    sort_order: exerciseIndex,
                    sets,
                };
            })
            .filter((exercise) => exercise.name && exercise.sets.length > 0);

        if (!exercises.length) {
            setStructuredError("Add at least one exercise with valid sets.");
            return;
        }

        const invalidExercise = exercises.find((exercise) => !exercise.name || exercise.sets.length === 0);
        if (invalidExercise) {
            setStructuredError("Each exercise needs a name and at least one valid set.");
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch(`${apiBase}/api/training_sessions/full`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    session: {
                        started_at: startedAt || undefined,
                        note: note || undefined,
                    },
                    exercises,
                }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || "Failed to save workout");
            }

            setStructuredStatus("Structured session saved.");
            setBuilderExercises([{ name: "", sets: [{ weight: "", reps: "", sets: "1", set_type: "normal" }] }]);
            setNote("");
            setStartedAt("");
        } catch (err) {
            setStructuredError(err instanceof Error ? err.message : "Failed to save workout");
        } finally {
            setIsSaving(false);
        }
    };

    const updateExerciseName = (index: number, value: string) => {
        setBuilderExercises((prev) => prev.map((exercise, i) => (
            i === index ? { ...exercise, name: value } : exercise
        )));
    };

    const addExercise = () => {
        setBuilderExercises((prev) => ([
            ...prev,
            { name: "", sets: [{ weight: "", reps: "", sets: "1", set_type: "normal" }] },
        ]));
    };

    const removeExercise = (index: number) => {
        setBuilderExercises((prev) => prev.filter((_, i) => i !== index));
    };

    const updateSet = (exerciseIndex: number, setIndex: number, key: keyof BuilderSet, value: string) => {
        setBuilderExercises((prev) => prev.map((exercise, i) => {
            if (i !== exerciseIndex) return exercise;
            const updatedSets = exercise.sets.map((set, j) => (
                j === setIndex ? { ...set, [key]: value } : set
            ));
            return { ...exercise, sets: updatedSets };
        }));
    };

    const addSet = (exerciseIndex: number) => {
        setBuilderExercises((prev) => prev.map((exercise, i) => (
            i === exerciseIndex
                ? { ...exercise, sets: [...exercise.sets, { weight: "", reps: "", sets: "1", set_type: "normal" }] }
                : exercise
        )));
    };

    const removeSet = (exerciseIndex: number, setIndex: number) => {
        setBuilderExercises((prev) => prev.map((exercise, i) => {
            if (i !== exerciseIndex) return exercise;
            return { ...exercise, sets: exercise.sets.filter((_, j) => j !== setIndex) };
        }));
    };

    const setTypeOptions = [
        "normal",
        "warmup",
        "drop",
        "superset",
        "giant",
        "mega",
        "cluster",
        "amrap",
    ];

    return (
        <section>
            <div className="section-header">
                <h1>Start Workout</h1>
                <p>Choose how you want to log your training today.</p>
            </div>

            <div className="card-grid">
                <div className="card" style={{ animationDelay: "0.05s" }}>
                    <h3>Structured Session</h3>
                    <p>Build your session with exercises and sets.</p>
                    <div className="toolbar" style={{ marginBottom: "12px" }}>
                        <input
                            className="input"
                            type="datetime-local"
                            value={startedAt}
                            onChange={(event) => setStartedAt(event.target.value)}
                        />
                        <input
                            className="input"
                            placeholder="Session note"
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                        />
                    </div>
                    <div className="list">
                        {builderExercises.map((exercise, exerciseIndex) => (
                            <div key={`exercise-${exerciseIndex}`} className="list-item" style={{ alignItems: "stretch" }}>
                                <div style={{ flex: 1 }}>
                                    <input
                                        className="input"
                                        placeholder={`Exercise ${exerciseIndex + 1}`}
                                        value={exercise.name}
                                        onChange={(event) => updateExerciseName(exerciseIndex, event.target.value)}
                                        list="exercise-suggestions"
                                    />
                                    <div style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
                                        {exercise.sets.map((set, setIndex) => (
                                            <div key={`set-${exerciseIndex}-${setIndex}`} className="set-row">
                                                <input
                                                    className="input"
                                                    type="number"
                                                    min="0"
                                                    step="0.5"
                                                    placeholder="Weight"
                                                    value={set.weight}
                                                    onChange={(event) => updateSet(exerciseIndex, setIndex, "weight", event.target.value)}
                                                />
                                                <input
                                                    className="input"
                                                    type="number"
                                                    min="0"
                                                    step="1"
                                                    placeholder="Reps"
                                                    value={set.reps}
                                                    onChange={(event) => updateSet(exerciseIndex, setIndex, "reps", event.target.value)}
                                                />
                                                <select
                                                    className="input"
                                                    value={set.set_type}
                                                    onChange={(event) => updateSet(exerciseIndex, setIndex, "set_type", event.target.value)}
                                                >
                                                    {setTypeOptions.map((option) => (
                                                        <option key={option} value={option}>
                                                            {option}
                                                        </option>
                                                    ))}
                                                </select>
                                                <input
                                                    className="input"
                                                    type="number"
                                                    min="1"
                                                    step="1"
                                                    placeholder="Sets"
                                                    value={set.sets}
                                                    onChange={(event) => updateSet(exerciseIndex, setIndex, "sets", event.target.value)}
                                                />
                                                <button
                                                    className="cta secondary"
                                                    type="button"
                                                    onClick={() => removeSet(exerciseIndex, setIndex)}
                                                    disabled={exercise.sets.length === 1}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="cta secondary" type="button" onClick={() => addSet(exerciseIndex)} style={{ marginTop: "10px" }}>
                                        Add set
                                    </button>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                                    <button className="cta secondary" type="button" onClick={() => removeExercise(exerciseIndex)}>
                                        Remove exercise
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {structuredError ? <p style={{ marginTop: "10px", color: "#b0472a" }}>{structuredError}</p> : null}
                    {structuredStatus ? <p style={{ marginTop: "10px" }}>{structuredStatus}</p> : null}
                    <div className="toolbar" style={{ marginTop: "12px" }}>
                        <button className="cta secondary" type="button" onClick={addExercise}>
                            Add exercise
                        </button>
                        <button className="cta" type="button" onClick={handleSaveStructured} disabled={isSaving}>
                            {isSaving ? "Saving..." : "Save session"}
                        </button>
                    </div>
                    <datalist id="exercise-suggestions">
                        {exerciseSuggestions.map((name) => (
                            <option key={name} value={name} />
                        ))}
                    </datalist>
                </div>
                <div className="card" style={{ animationDelay: "0.1s" }}>
                    <h3>Paste Workout</h3>
                    <p>Paste a workout block below to log in one call.</p>
                    <div className="toolbar" style={{ marginBottom: "12px" }}>
                        <input
                            className="input"
                            type="datetime-local"
                            value={startedAt}
                            onChange={(event) => setStartedAt(event.target.value)}
                        />
                        <input
                            className="input"
                            placeholder="Session note"
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                        />
                        <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <input
                                type="checkbox"
                                checked={treatMinutesAsActivity}
                                onChange={(event) => setTreatMinutesAsActivity(event.target.checked)}
                            />
                            Treat lines with minutes as activities
                        </label>
                    </div>
                    <textarea
                        className="textarea"
                        placeholder="Bench press 3x8 @ 135\nPull ups 3x10 BW\nSquat 3x5 @ 225"
                        value={pasteText}
                        onChange={(event) => setPasteText(event.target.value)}
                    />
                    {pasteError ? <p style={{ marginTop: "10px", color: "#b0472a" }}>{pasteError}</p> : null}
                    {pasteStatus ? <p style={{ marginTop: "10px" }}>{pasteStatus}</p> : null}
                    <button className="cta secondary" style={{ marginTop: "12px" }} onClick={handleSaveWorkout} disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save workout"}
                    </button>
                </div>
            </div>
        </section>
    );
};

export default StartWorkout;

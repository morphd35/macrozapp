import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type TrainingSession = {
    id: number;
    user_id: number;
    started_at: string;
    note: string | null;
};

type TrainingExercise = {
    id: number;
    session_id: number;
    name: string;
    sort_order: number;
};

type TrainingSet = {
    id: number;
    exercise_id: number;
    set_no: number;
    weight: number | null;
    reps: number | null;
    set_type: string | null;
};

type ActivityEntry = {
    id: number;
    occurred_at: string;
    activity_type: string;
    duration_minutes: number;
    distance: number | null;
    steps: number | null;
    intensity: string | null;
    note: string | null;
};

type ActivityForm = {
    occurred_at: string;
    activity_type: string;
    duration_minutes: string;
    distance: string;
    steps: string;
    intensity: string;
    note: string;
};

type SessionWithExercises = TrainingSession & {
    exercises: Array<TrainingExercise & { sets: TrainingSet[] }>;
};

const History: React.FC = () => {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);

    const toDateString = (value: Date) => value.toISOString().slice(0, 10);

    const [fromDate, setFromDate] = useState(toDateString(weekAgo));
    const [toDate, setToDate] = useState(toDateString(today));
    const [filterType, setFilterType] = useState("all");
    const [exerciseFilter, setExerciseFilter] = useState("");
    const [sessions, setSessions] = useState<SessionWithExercises[]>([]);
    const [activities, setActivities] = useState<ActivityEntry[]>([]);
    const [expandedSessionId, setExpandedSessionId] = useState<number | null>(null);
    const [expandedActivityId, setExpandedActivityId] = useState<number | null>(null);
    const [editingActivityId, setEditingActivityId] = useState<number | null>(null);
    const [activityForm, setActivityForm] = useState<ActivityForm | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const apiBase = useMemo(() => {
        return process.env.REACT_APP_API_BASE_URL || "http://localhost:5055";
    }, []);

    const applyQuickRange = (days: number) => {
        const end = new Date();
        const start = new Date(end);
        start.setDate(end.getDate() - days);
        setFromDate(toDateString(start));
        setToDate(toDateString(end));
    };

    const formatDateTimeLocal = (value: string) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toISOString().slice(0, 16);
    };

    const startEditActivity = (activity: ActivityEntry) => {
        setEditingActivityId(activity.id);
        setActivityForm({
            occurred_at: formatDateTimeLocal(activity.occurred_at),
            activity_type: activity.activity_type || "",
            duration_minutes: String(activity.duration_minutes ?? ""),
            distance: activity.distance != null ? String(activity.distance) : "",
            steps: activity.steps != null ? String(activity.steps) : "",
            intensity: activity.intensity || "",
            note: activity.note || "",
        });
        setExpandedActivityId(activity.id);
    };

    const cancelEditActivity = () => {
        setEditingActivityId(null);
        setActivityForm(null);
    };

    const saveEditActivity = async (activityId: number) => {
        if (!activityForm) return;
        setError(null);
        setStatus(null);

        const token = localStorage.getItem("movezapp_token");
        if (!token) {
            setError("No token found. Use the dev token on Today for now.");
            return;
        }

        const durationValue = Number(activityForm.duration_minutes);
        if (!Number.isFinite(durationValue) || durationValue <= 0) {
            setError("Duration must be a positive number.");
            return;
        }

        try {
            const response = await fetch(`${apiBase}/api/activity_entries/${activityId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    occurred_at: activityForm.occurred_at || undefined,
                    activity_type: activityForm.activity_type,
                    duration_minutes: durationValue,
                    distance: activityForm.distance ? Number(activityForm.distance) : undefined,
                    steps: activityForm.steps ? Number(activityForm.steps) : undefined,
                    intensity: activityForm.intensity || undefined,
                    note: activityForm.note || undefined,
                }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || "Failed to update activity");
            }

            const data = await response.json();
            const updated = data.activity as ActivityEntry;
            setActivities((prev) => prev.map((activity) => (activity.id === updated.id ? updated : activity)));
            setStatus("Activity updated.");
            cancelEditActivity();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to update activity");
        }
    };

    const deleteActivity = async (activityId: number) => {
        setError(null);
        setStatus(null);

        const token = localStorage.getItem("movezapp_token");
        if (!token) {
            setError("No token found. Use the dev token on Today for now.");
            return;
        }

        const confirmed = window.confirm("Delete this activity entry?");
        if (!confirmed) return;

        try {
            const response = await fetch(`${apiBase}/api/activity_entries/${activityId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || "Failed to delete activity");
            }

            setActivities((prev) => prev.filter((activity) => activity.id !== activityId));
            setStatus("Activity deleted.");
            if (expandedActivityId === activityId) {
                setExpandedActivityId(null);
            }
            if (editingActivityId === activityId) {
                cancelEditActivity();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete activity");
        }
    };

    const buildGroupedSessions = (
        sessionList: TrainingSession[],
        exerciseList: TrainingExercise[],
        setList: TrainingSet[]
    ) => {
        const exercisesBySession = new Map<number, Array<TrainingExercise & { sets: TrainingSet[] }>>();
        const setsByExercise = new Map<number, TrainingSet[]>();

        setList.forEach((set) => {
            const list = setsByExercise.get(set.exercise_id) || [];
            list.push(set);
            setsByExercise.set(set.exercise_id, list);
        });

        exerciseList.forEach((exercise) => {
            const list = exercisesBySession.get(exercise.session_id) || [];
            list.push({ ...exercise, sets: setsByExercise.get(exercise.id) || [] });
            exercisesBySession.set(exercise.session_id, list);
        });

        return sessionList.map((session) => ({
            ...session,
            exercises: exercisesBySession.get(session.id) || [],
        }));
    };

    const csvEscape = (value: string | number | null | undefined) => {
        const text = String(value ?? "");
        if (text.includes("\"") || text.includes(",") || text.includes("\n")) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    };

    const downloadCsv = (filename: string, rows: Array<Array<string | number | null | undefined>>) => {
        const content = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
        const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    };

    const exportSessionsCsv = () => {
        const rows: Array<Array<string | number | null | undefined>> = [
            ["date", "time", "session_id", "exercise", "set_no", "weight", "reps", "set_type"],
        ];

        sessions.forEach((session) => {
            const date = new Date(session.started_at);
            const dateStr = date.toISOString().slice(0, 10);
            const timeStr = date.toLocaleTimeString();
            session.exercises.forEach((exercise) => {
                exercise.sets.forEach((set) => {
                    rows.push([
                        dateStr,
                        timeStr,
                        session.id,
                        exercise.name,
                        set.set_no,
                        set.weight,
                        set.reps,
                        set.set_type,
                    ]);
                });
            });
        });

        downloadCsv(`movezapp_sessions_${fromDate}_to_${toDate}.csv`, rows);
    };

    const exportActivitiesCsv = () => {
        const rows: Array<Array<string | number | null | undefined>> = [
            ["date", "time", "activity_type", "duration_minutes", "distance", "steps", "intensity", "note"],
        ];

        activities.forEach((activity) => {
            const date = new Date(activity.occurred_at);
            const dateStr = date.toISOString().slice(0, 10);
            const timeStr = date.toLocaleTimeString();
            rows.push([
                dateStr,
                timeStr,
                activity.activity_type,
                activity.duration_minutes,
                activity.distance,
                activity.steps,
                activity.intensity,
                activity.note,
            ]);
        });

        downloadCsv(`movezapp_activities_${fromDate}_to_${toDate}.csv`, rows);
    };

    const handleSearch = useCallback(async () => {
        setError(null);
        setStatus(null);

        const token = localStorage.getItem("movezapp_token");
        if (!token) {
            setError("No token found. Use the dev token on Today for now.");
            return;
        }

        if (!fromDate || !toDate) {
            setError("Choose both from/to dates.");
            return;
        }

        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                from: fromDate,
                to: toDate,
            });

            if (filterType !== "all") {
                params.set("type", filterType);
            }

            if (exerciseFilter.trim()) {
                params.set("exercise", exerciseFilter.trim());
            }

            const response = await fetch(`${apiBase}/api/history?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || "Failed to load history");
            }

            const data = await response.json();
            const groupedSessions = buildGroupedSessions(data.sessions || [], data.exercises || [], data.sets || []);

            const exerciseNames = (data.exercises || [])
                .map((exercise: TrainingExercise) => exercise.name)
                .filter(Boolean);
            if (exerciseNames.length) {
                const unique = Array.from(new Set(exerciseNames));
                localStorage.setItem("movezapp_exercises", JSON.stringify(unique));
            }

            setSessions(groupedSessions);
            setActivities(data.activities || []);
            setStatus("History loaded.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load history");
        } finally {
            setIsLoading(false);
        }
    }, [apiBase, exerciseFilter, filterType, fromDate, toDate]);

    useEffect(() => {
        handleSearch();
    }, [handleSearch]);

    const totalSets = sessions.reduce((sum, session) => {
        return sum + session.exercises.reduce((inner, ex) => inner + (ex.sets?.length || 0), 0);
    }, 0);

    return (
        <section>
            <div className="section-header">
                <h1>History</h1>
                <p>Review training sessions and activities over time.</p>
            </div>

            <div className="card" style={{ marginBottom: "18px" }}>
                <div className="toolbar" style={{ marginBottom: "12px" }}>
                    <input
                        className="input"
                        type="date"
                        value={fromDate}
                        onChange={(event) => setFromDate(event.target.value)}
                    />
                    <input
                        className="input"
                        type="date"
                        value={toDate}
                        onChange={(event) => setToDate(event.target.value)}
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                        <button className="cta secondary" type="button" onClick={() => applyQuickRange(7)}>7 days</button>
                        <button className="cta secondary" type="button" onClick={() => applyQuickRange(30)}>30 days</button>
                        <button className="cta secondary" type="button" onClick={() => applyQuickRange(90)}>90 days</button>
                    </div>
                    <select
                        className="input"
                        value={filterType}
                        onChange={(event) => setFilterType(event.target.value)}
                    >
                        <option value="all">All</option>
                        <option value="training">Training</option>
                        <option value="activity">Activity</option>
                    </select>
                    <input
                        className="input"
                        placeholder="Exercise filter"
                        value={exerciseFilter}
                        onChange={(event) => setExerciseFilter(event.target.value)}
                    />
                    <button className="cta secondary" onClick={handleSearch} disabled={isLoading}>
                        {isLoading ? "Loading..." : "Search"}
                    </button>
                    <button className="cta secondary" type="button" onClick={exportSessionsCsv}>
                        Export sessions CSV
                    </button>
                    <button className="cta secondary" type="button" onClick={exportActivitiesCsv}>
                        Export activities CSV
                    </button>
                </div>
                {error ? <p style={{ color: "#b0472a" }}>{error}</p> : null}
                {status ? <p>{status}</p> : null}
            </div>

            <div className="card-grid">
                <div className="card" style={{ animationDelay: "0.05s" }}>
                    <h3>Training Sessions</h3>
                    <p>{sessions.length} sessions · {totalSets} sets</p>
                </div>
                <div className="card" style={{ animationDelay: "0.1s" }}>
                    <h3>Activities</h3>
                    <p>{activities.length} entries · {activities.reduce((sum, entry) => sum + Number(entry.duration_minutes || 0), 0)} min</p>
                </div>
            </div>

            <div className="card" style={{ marginTop: "18px" }}>
                <h3>Sessions</h3>
                {sessions.length === 0 ? (
                    <p>No sessions in this range.</p>
                ) : (
                    <div className="list">
                        {sessions.map((session) => {
                            const setCount = session.exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0);
                            const isExpanded = expandedSessionId === session.id;
                            return (
                                <div key={session.id} className="list-item" style={{ alignItems: "stretch" }}>
                                    <div>
                                        <strong>{new Date(session.started_at).toLocaleDateString()}</strong>
                                        <div style={{ color: "var(--ink-soft)" }}>
                                            {session.exercises.length} exercises · {setCount} sets
                                        </div>
                                        <div style={{ marginTop: "6px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                                            {session.exercises.map((exercise) => (
                                                <Link
                                                    key={exercise.id}
                                                    className="pill"
                                                    to={`/exercise/${encodeURIComponent(exercise.name)}`}
                                                >
                                                    {exercise.name}
                                                </Link>
                                            ))}
                                        </div>
                                        {isExpanded ? (
                                            <div style={{ marginTop: "10px" }}>
                                                {session.exercises.map((exercise) => (
                                                    <div key={`detail-${exercise.id}`} style={{ marginBottom: "10px" }}>
                                                        <strong>{exercise.name}</strong>
                                                        <div style={{ color: "var(--ink-soft)", marginTop: "4px" }}>
                                                            {exercise.sets.map((set) => (
                                                                <div key={`set-${set.id}`}>
                                                                    Set {set.set_no}: {set.weight} x {set.reps}{set.set_type ? ` (${set.set_type})` : ""}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                                        <span className="badge">{new Date(session.started_at).toLocaleTimeString()}</span>
                                        <button
                                            className="cta secondary"
                                            onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                                        >
                                            {isExpanded ? "Hide" : "View"}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="card" style={{ marginTop: "18px" }}>
                <h3>Activities</h3>
                {activities.length === 0 ? (
                    <p>No activities in this range.</p>
                ) : (
                    <div className="list">
                        {activities.map((activity) => {
                            const isExpanded = expandedActivityId === activity.id;
                            const isEditing = editingActivityId === activity.id;
                            return (
                                <div key={activity.id} className="list-item" style={{ alignItems: "stretch" }}>
                                    <div>
                                        <strong>{activity.activity_type}</strong>
                                        <div style={{ color: "var(--ink-soft)" }}>
                                            {new Date(activity.occurred_at).toLocaleDateString()} · {activity.duration_minutes} min
                                        </div>
                                        {isExpanded ? (
                                            <div style={{ marginTop: "8px", color: "var(--ink-soft)" }}>
                                                {isEditing && activityForm ? (
                                                    <div style={{ display: "grid", gap: "8px" }}>
                                                        <input
                                                            className="input"
                                                            type="datetime-local"
                                                            value={activityForm.occurred_at}
                                                            onChange={(event) => setActivityForm({ ...activityForm, occurred_at: event.target.value })}
                                                        />
                                                        <input
                                                            className="input"
                                                            placeholder="Activity type"
                                                            value={activityForm.activity_type}
                                                            onChange={(event) => setActivityForm({ ...activityForm, activity_type: event.target.value })}
                                                        />
                                                        <input
                                                            className="input"
                                                            type="number"
                                                            min="0"
                                                            step="1"
                                                            placeholder="Duration (min)"
                                                            value={activityForm.duration_minutes}
                                                            onChange={(event) => setActivityForm({ ...activityForm, duration_minutes: event.target.value })}
                                                        />
                                                        <div style={{ display: "flex", gap: "8px" }}>
                                                            <input
                                                                className="input"
                                                                type="number"
                                                                min="0"
                                                                step="0.1"
                                                                placeholder="Distance"
                                                                value={activityForm.distance}
                                                                onChange={(event) => setActivityForm({ ...activityForm, distance: event.target.value })}
                                                            />
                                                            <input
                                                                className="input"
                                                                type="number"
                                                                min="0"
                                                                step="1"
                                                                placeholder="Steps"
                                                                value={activityForm.steps}
                                                                onChange={(event) => setActivityForm({ ...activityForm, steps: event.target.value })}
                                                            />
                                                        </div>
                                                        <input
                                                            className="input"
                                                            placeholder="Intensity"
                                                            value={activityForm.intensity}
                                                            onChange={(event) => setActivityForm({ ...activityForm, intensity: event.target.value })}
                                                        />
                                                        <textarea
                                                            className="textarea"
                                                            placeholder="Note"
                                                            value={activityForm.note}
                                                            onChange={(event) => setActivityForm({ ...activityForm, note: event.target.value })}
                                                        />
                                                    </div>
                                                ) : (
                                                    <>
                                                        {activity.distance != null ? <div>Distance: {activity.distance}</div> : null}
                                                        {activity.steps != null ? <div>Steps: {activity.steps}</div> : null}
                                                        {activity.note ? <div>Note: {activity.note}</div> : null}
                                                    </>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                                        <span className="badge">{activity.intensity || "Logged"}</span>
                                        {isEditing ? (
                                            <>
                                                <button
                                                    className="cta"
                                                    onClick={() => saveEditActivity(activity.id)}
                                                >
                                                    Save
                                                </button>
                                                <button
                                                    className="cta secondary"
                                                    onClick={cancelEditActivity}
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    className="cta secondary"
                                                    onClick={() => setExpandedActivityId(isExpanded ? null : activity.id)}
                                                >
                                                    {isExpanded ? "Hide" : "View"}
                                                </button>
                                                <button
                                                    className="cta"
                                                    onClick={() => startEditActivity(activity)}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    className="cta secondary"
                                                    onClick={() => deleteActivity(activity.id)}
                                                >
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
};

export default History;

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

type TrainingSet = {
    id: number;
    exercise_id: number;
    set_no: number;
    weight: number | null;
    reps: number | null;
    set_type: string | null;
};

type TrainingExercise = {
    id: number;
    session_id: number;
    name: string;
    sort_order: number;
    sets: TrainingSet[];
};

type TrainingSession = {
    id: number;
    user_id: number;
    started_at: string;
    note: string | null;
    exercises: TrainingExercise[];
};

type ActivityEntry = {
    id: number;
    user_id: number;
    occurred_at: string;
    activity_type: string;
    duration_minutes: number;
    distance: number | null;
    steps: number | null;
    intensity: string | null;
    note: string | null;
};

const Today: React.FC = () => {
    const navigate = useNavigate();
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sessions, setSessions] = useState<TrainingSession[]>([]);
    const [activities, setActivities] = useState<ActivityEntry[]>([]);

    const apiBase = useMemo(() => {
        return process.env.REACT_APP_API_BASE_URL || "http://localhost:5055";
    }, []);

    const isDev = process.env.NODE_ENV === "development";

    const activityMinutes = useMemo(() => {
        return activities.reduce((sum, activity) => sum + Number(activity.duration_minutes || 0), 0);
    }, [activities]);

    const totalSets = useMemo(() => {
        return sessions.reduce((sum, session) => {
            const setsInSession = session.exercises.reduce((inner, ex) => inner + (ex.sets?.length || 0), 0);
            return sum + setsInSession;
        }, 0);
    }, [sessions]);

    const loadToken = () => {
        const stored = localStorage.getItem("movezapp_token");
        if (stored) {
            setToken(stored);
        }
    };

    useEffect(() => {
        loadToken();
    }, []);

    const fetchToday = async (activeToken: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${apiBase}/api/today`, {
                headers: {
                    Authorization: `Bearer ${activeToken}`,
                },
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || "Failed to load today");
            }

            const data = await response.json();
            setSessions(data.sessions || []);
            setActivities(data.activities || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load today");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchToday(token);
        }
    }, [token]);

    const handleMintDevToken = async () => {
        try {
            const response = await fetch(`${apiBase}/api/dev/token`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: 3, username: "devuser" }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || "Failed to mint dev token");
            }

            const data = await response.json();
            if (!data?.token) {
                throw new Error("Dev token response missing token");
            }

            localStorage.setItem("movezapp_token", data.token);
            setToken(data.token);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to mint dev token");
        }
    };

    return (
        <section>
            <div className="section-header">
                <h1>Today</h1>
                <p>Quick snapshot of today’s training, activities, and progress.</p>
            </div>

            {isDev ? (
                <div className="card" style={{ marginBottom: "18px" }}>
                    <div className="toolbar">
                        <button className="cta" onClick={handleMintDevToken}>Mint dev token</button>
                        <button className="cta secondary" onClick={() => token && fetchToday(token)} disabled={!token || loading}>
                            {loading ? "Loading..." : "Refresh"}
                        </button>
                    </div>
                    {token ? <p style={{ marginTop: "10px" }}>Dev token loaded.</p> : <p style={{ marginTop: "10px" }}>No dev token yet.</p>}
                    {error ? <p style={{ marginTop: "8px", color: "#b0472a" }}>{error}</p> : null}
                </div>
            ) : null}

            <div className="card-grid">
                <div className="card" style={{ animationDelay: "0.05s" }}>
                    <span className="pill">Start Workout</span>
                    <h3>Lift Session</h3>
                    <p>Create a structured session with exercises + sets.</p>
                    <button className="cta" onClick={() => navigate("/start")}>Start New</button>
                </div>
                <div className="card" style={{ animationDelay: "0.1s" }}>
                    <span className="pill">Paste Workout</span>
                    <h3>Fast Log</h3>
                    <p>Drop in a workout from your notes and log it in one call.</p>
                    <button className="cta secondary" onClick={() => navigate("/start")}>Paste Workout</button>
                </div>
                <div className="card" style={{ animationDelay: "0.15s" }}>
                    <span className="pill">Today Summary</span>
                    <h3>Totals</h3>
                    <p>Today’s training + activity at a glance.</p>
                    <div className="list">
                        <div className="list-item">
                            <span>Sessions</span>
                            <span className="badge">{sessions.length}</span>
                        </div>
                        <div className="list-item">
                            <span>Sets</span>
                            <span className="badge">{totalSets}</span>
                        </div>
                        <div className="list-item">
                            <span>Activity</span>
                            <span className="badge">{activityMinutes} min</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card" style={{ marginTop: "22px" }}>
                <h3>Today Sessions</h3>
                {sessions.length === 0 ? (
                    <p>No sessions logged yet.</p>
                ) : (
                    <div className="list">
                        {sessions.map((session) => (
                            <div key={session.id} className="list-item">
                                <div>
                                    <strong>{new Date(session.started_at).toLocaleTimeString()}</strong>
                                    <div style={{ color: "var(--ink-soft)" }}>
                                        {session.exercises.length} exercises
                                    </div>
                                </div>
                                <span className="badge">{session.exercises.reduce((sum, ex) => sum + (ex.sets?.length || 0), 0)} sets</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default Today;

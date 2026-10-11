import React, { useEffect, useMemo, useState } from "react";

const LogActivity: React.FC = () => {
    const [activityType, setActivityType] = useState("");
    const [durationMinutes, setDurationMinutes] = useState("");
    const [distance, setDistance] = useState("");
    const [steps, setSteps] = useState("");
    const [intensity, setIntensity] = useState("");
    const [occurredAt, setOccurredAt] = useState("");
    const [note, setNote] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const apiBase = useMemo(() => {
        return process.env.REACT_APP_API_BASE_URL || "http://localhost:5055";
    }, []);

    useEffect(() => {
        if (occurredAt) return;
        const now = new Date();
        const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        setOccurredAt(local);
    }, [occurredAt]);

    const handleSubmit = async () => {
        setError(null);
        setStatus(null);

        const token = localStorage.getItem("movezapp_token");
        if (!token) {
            setError("No token found. Use the dev token on Today for now.");
            return;
        }

        if (!activityType.trim()) {
            setError("Activity type is required.");
            return;
        }

        const durationValue = Number(durationMinutes);
        if (!Number.isFinite(durationValue) || durationValue <= 0) {
            setError("Duration must be a positive number.");
            return;
        }

        setIsSaving(true);
        try {
            const response = await fetch(`${apiBase}/api/activity_entries`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    activity_type: activityType.trim(),
                    duration_minutes: durationValue,
                    distance: distance ? Number(distance) : undefined,
                    steps: steps ? Number(steps) : undefined,
                    intensity: intensity.trim() || undefined,
                    occurred_at: occurredAt || undefined,
                    note: note.trim() || undefined,
                }),
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || "Failed to log activity");
            }

            setStatus("Activity logged.");
            setActivityType("");
            setDurationMinutes("");
            setDistance("");
            setSteps("");
            setIntensity("");
            setOccurredAt("");
            setNote("");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to log activity");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section>
            <div className="section-header">
                <h1>Log Activity</h1>
                <p>Capture runs, walks, mobility, or any movement session.</p>
            </div>

            <div className="card">
                <div className="form-row" style={{ marginBottom: "12px" }}>
                    <div className="field">
                        <span className="field-label">Activity</span>
                        <input
                            className="input"
                            placeholder="Activity type"
                            value={activityType}
                            onChange={(event) => setActivityType(event.target.value)}
                        />
                    </div>
                    <div className="field">
                        <span className="field-label">Duration (min)</span>
                        <input
                            className="input"
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={durationMinutes}
                            onChange={(event) => setDurationMinutes(event.target.value)}
                        />
                    </div>
                    <div className="field">
                        <span className="field-label">Distance</span>
                        <input
                            className="input"
                            type="number"
                            min="0"
                            step="0.1"
                            placeholder="Optional"
                            value={distance}
                            onChange={(event) => setDistance(event.target.value)}
                        />
                    </div>
                </div>
                <div className="form-row" style={{ marginBottom: "12px" }}>
                    <div className="field">
                        <span className="field-label">Steps</span>
                        <input
                            className="input"
                            type="number"
                            min="0"
                            step="1"
                            placeholder="Optional"
                            value={steps}
                            onChange={(event) => setSteps(event.target.value)}
                        />
                    </div>
                    <div className="field">
                        <span className="field-label">Intensity</span>
                        <input
                            className="input"
                            placeholder="Optional"
                            value={intensity}
                            onChange={(event) => setIntensity(event.target.value)}
                        />
                    </div>
                    <div className="field">
                        <span className="field-label">Date/Time</span>
                        <input
                            className="input"
                            type="datetime-local"
                            value={occurredAt}
                            onChange={(event) => setOccurredAt(event.target.value)}
                        />
                    </div>
                </div>
                <textarea
                    className="textarea"
                    placeholder="Notes (optional)"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                />
                {error ? <p style={{ marginTop: "10px", color: "#b0472a" }}>{error}</p> : null}
                {status ? <p style={{ marginTop: "10px" }}>{status}</p> : null}
                <button className="cta" style={{ marginTop: "12px" }} onClick={handleSubmit} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Log activity"}
                </button>
            </div>
        </section>
    );
};

export default LogActivity;

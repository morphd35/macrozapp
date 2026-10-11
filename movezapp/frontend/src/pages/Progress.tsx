import React, { useCallback, useEffect, useMemo, useState } from "react";

type TrainingSession = {
    id: number;
    started_at: string;
};

type TrainingExercise = {
    id: number;
    session_id: number;
};

type TrainingSet = {
    id: number;
    exercise_id: number;
    weight: number | null;
    reps: number | null;
};

type ActivityEntry = {
    id: number;
    occurred_at: string;
    duration_minutes: number;
};

type DailyStat = {
    date: string;
    volume: number;
    sets: number;
    activityMinutes: number;
};

const Progress: React.FC = () => {
    const today = new Date();
    const monthAgo = new Date(today);
    monthAgo.setDate(today.getDate() - 30);

    const toDateString = (value: Date) => value.toISOString().slice(0, 10);

    const [fromDate, setFromDate] = useState(toDateString(monthAgo));
    const [toDate, setToDate] = useState(toDateString(today));
    const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
    const [totalSessions, setTotalSessions] = useState(0);
    const [totalSets, setTotalSets] = useState(0);
    const [totalVolume, setTotalVolume] = useState(0);
    const [totalActivityMinutes, setTotalActivityMinutes] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showVolumeInfo, setShowVolumeInfo] = useState(false);
    const [weightUnit, setWeightUnit] = useState<"lb" | "kg">(() => {
        const stored = localStorage.getItem("movezapp_units");
        if (stored === "kg" || stored === "lb") {
            return stored;
        }
        const locale = navigator.language;
        const useLb = ["en-US", "en-LR", "en-MM"].includes(locale);
        return useLb ? "lb" : "kg";
    });
    const weightFactor = weightUnit === "kg" ? 0.453592 : 1;
    const volumeUnit = `${weightUnit}-reps`;

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

    const exportProgressCsv = () => {
        const rows: Array<Array<string | number | null | undefined>> = [
            ["date", `volume_${volumeUnit}`, "sets", "activity_minutes"],
        ];

        dailyStats.forEach((stat) => {
            rows.push([
                stat.date,
                Math.round(stat.volume * weightFactor),
                Math.round(stat.sets),
                Math.round(stat.activityMinutes),
            ]);
        });

        downloadCsv(`movezapp_progress_${fromDate}_to_${toDate}.csv`, rows);
    };

    useEffect(() => {
        localStorage.setItem("movezapp_units", weightUnit);
    }, [weightUnit]);

    const renderLineChart = (
        values: number[],
        labels: string[],
        height = 160,
        width = 520,
        formatValue: (value: number) => string = (value) => String(value)
    ) => {
        const padding = 18;
        const count = Math.min(values.length, labels.length);
        if (!count) return null;

        const slicedValues = values.slice(0, count);
        const min = Math.min(...slicedValues);
        const max = Math.max(...slicedValues);
        const span = max - min || 1;

        const pointData = slicedValues.map((value, index) => {
            const x = padding + (width - padding * 2) * (count === 1 ? 0.5 : index / (count - 1));
            const y = padding + (height - padding * 2) * (1 - (value - min) / span);
            return { x, y, value, label: labels[index] };
        });

        const points = pointData.map((point) => `${point.x},${point.y}`).join(" ");
        const lastPoint = pointData[pointData.length - 1];
        const maxLabel = formatValue(max);
        const minLabel = formatValue(min);
        const lastLabel = lastPoint ? formatValue(lastPoint.value) : "";

        return (
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
                <polyline
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={points}
                />
                {pointData.map((point, index) => (
                    <circle key={`${point.label}-${index}`} cx={point.x} cy={point.y} r="4" fill="var(--accent)">
                        <title>{`${point.label}: ${formatValue(point.value)}`}</title>
                    </circle>
                ))}
                {lastPoint ? (
                    <text
                        x={Math.min(lastPoint.x + 6, width - 6)}
                        y={Math.max(lastPoint.y - 6, 12)}
                        fill="var(--ink-soft)"
                        fontSize="11"
                        textAnchor="start"
                    >
                        {lastLabel}
                    </text>
                ) : null}
                <text x={padding} y={12} fill="var(--ink-soft)" fontSize="11">{maxLabel}</text>
                <text x={padding} y={height - 6} fill="var(--ink-soft)" fontSize="11">{minLabel}</text>
            </svg>
        );
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

            const response = await fetch(`${apiBase}/api/history?${params.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload?.error || "Failed to load progress");
            }

            const data = await response.json();
            const sessions: TrainingSession[] = data.sessions || [];
            const exercises: TrainingExercise[] = data.exercises || [];
            const sets: TrainingSet[] = data.sets || [];
            const activities: ActivityEntry[] = data.activities || [];

            const sessionMap = new Map<number, TrainingSession>();
            sessions.forEach((session) => sessionMap.set(session.id, session));

            const exerciseMap = new Map<number, TrainingExercise>();
            exercises.forEach((exercise) => exerciseMap.set(exercise.id, exercise));

            const statMap = new Map<string, DailyStat>();

            sets.forEach((set) => {
                const exercise = exerciseMap.get(set.exercise_id);
                if (!exercise) return;
                const session = sessionMap.get(exercise.session_id);
                if (!session) return;

                const date = new Date(session.started_at).toISOString().slice(0, 10);
                const volume = set.weight != null && set.reps != null
                    ? Number(set.weight) * Number(set.reps)
                    : 0;

                const existing = statMap.get(date) || { date, volume: 0, sets: 0, activityMinutes: 0 };
                statMap.set(date, {
                    ...existing,
                    volume: existing.volume + volume,
                    sets: existing.sets + 1,
                });
            });

            activities.forEach((activity) => {
                const date = new Date(activity.occurred_at).toISOString().slice(0, 10);
                const existing = statMap.get(date) || { date, volume: 0, sets: 0, activityMinutes: 0 };
                statMap.set(date, {
                    ...existing,
                    activityMinutes: existing.activityMinutes + Number(activity.duration_minutes || 0),
                });
            });

            const sorted = Array.from(statMap.values()).sort((a, b) => a.date.localeCompare(b.date));
            const volumeTotal = sets.reduce((sum, set) => {
                if (set.weight == null || set.reps == null) return sum;
                return sum + Number(set.weight) * Number(set.reps);
            }, 0);

            setDailyStats(sorted);
            setTotalSessions(sessions.length);
            setTotalSets(sets.length);
            setTotalVolume(volumeTotal);
            setTotalActivityMinutes(activities.reduce((sum, entry) => sum + Number(entry.duration_minutes || 0), 0));
            setStatus("Progress loaded.");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load progress");
        } finally {
            setIsLoading(false);
        }
    }, [apiBase, fromDate, toDate]);

    useEffect(() => {
        handleSearch();
    }, [handleSearch]);

    return (
        <section>
            <div className="section-header">
                <h1>Progress</h1>
                <p>Overall training + activity trends for the selected range.</p>
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
                        <button
                            className={`cta secondary ${weightUnit === "lb" ? "active" : ""}`}
                            type="button"
                            onClick={() => setWeightUnit("lb")}
                        >
                            lb
                        </button>
                        <button
                            className={`cta secondary ${weightUnit === "kg" ? "active" : ""}`}
                            type="button"
                            onClick={() => setWeightUnit("kg")}
                        >
                            kg
                        </button>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <button className="cta secondary" type="button" onClick={() => applyQuickRange(7)}>7 days</button>
                        <button className="cta secondary" type="button" onClick={() => applyQuickRange(30)}>30 days</button>
                        <button className="cta secondary" type="button" onClick={() => applyQuickRange(90)}>90 days</button>
                    </div>
                    <button className="cta secondary" onClick={handleSearch} disabled={isLoading}>
                        {isLoading ? "Loading..." : "Refresh"}
                    </button>
                    <button className="cta secondary" type="button" onClick={exportProgressCsv}>
                        Export CSV
                    </button>
                </div>
                {error ? <p style={{ color: "#b0472a" }}>{error}</p> : null}
                {status ? <p>{status}</p> : null}
            </div>

            <div className="card-grid">
                <div className="card" style={{ animationDelay: "0.05s" }}>
                    <h3>Training Totals</h3>
                    <p>{totalSessions} sessions · {totalSets} sets</p>
                </div>
                <div className="card" style={{ animationDelay: "0.1s" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <h3>Volume</h3>
                        <button
                            className="cta secondary"
                            type="button"
                            onClick={() => setShowVolumeInfo(true)}
                        >
                            What is this?
                        </button>
                    </div>
                    <p>{Math.round(totalVolume * weightFactor)} {volumeUnit}</p>
                </div>
                <div className="card" style={{ animationDelay: "0.15s" }}>
                    <h3>Activity Minutes</h3>
                    <p>{totalActivityMinutes} min</p>
                </div>
            </div>

            <div className="card" style={{ marginTop: "18px" }}>
                <h3>Daily Training Volume ({volumeUnit})</h3>
                {dailyStats.length === 0 ? (
                    <p>No data to chart yet.</p>
                ) : (
                    <div>
                        {renderLineChart(
                            dailyStats.map((stat) => stat.volume),
                            dailyStats.map((stat) => stat.date),
                            160,
                            520,
                            (value) => `${Math.round(value * weightFactor)} ${volumeUnit}`
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-soft)", marginTop: "6px" }}>
                            <span>Date</span>
                            <span>Volume ({volumeUnit})</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-soft)" }}>
                            <span>{dailyStats[0].date}</span>
                            <span>{dailyStats[dailyStats.length - 1].date}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="card" style={{ marginTop: "18px" }}>
                <h3>Daily Sets (sets)</h3>
                {dailyStats.length === 0 ? (
                    <p>No data to chart yet.</p>
                ) : (
                    <div>
                        {renderLineChart(
                            dailyStats.map((stat) => stat.sets),
                            dailyStats.map((stat) => stat.date),
                            160,
                            520,
                            (value) => `${Math.round(value)} sets`
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-soft)", marginTop: "6px" }}>
                            <span>Date</span>
                            <span>Sets</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-soft)" }}>
                            <span>{dailyStats[0].date}</span>
                            <span>{dailyStats[dailyStats.length - 1].date}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="card" style={{ marginTop: "18px" }}>
                <h3>Daily Activity Minutes (min)</h3>
                {dailyStats.length === 0 ? (
                    <p>No data to chart yet.</p>
                ) : (
                    <div>
                        {renderLineChart(
                            dailyStats.map((stat) => stat.activityMinutes),
                            dailyStats.map((stat) => stat.date),
                            160,
                            520,
                            (value) => `${Math.round(value)} min`
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-soft)", marginTop: "6px" }}>
                            <span>Date</span>
                            <span>Minutes</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-soft)" }}>
                            <span>{dailyStats[0].date}</span>
                            <span>{dailyStats[dailyStats.length - 1].date}</span>
                        </div>
                    </div>
                )}
            </div>

            {showVolumeInfo ? (
                <div
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0, 0, 0, 0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "24px",
                        zIndex: 50,
                    }}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="card" style={{ maxWidth: "520px", width: "100%" }}>
                        <h3>How volume is calculated</h3>
                        <p>
                            Volume is the total training load for the range. We sum $weight \times reps$ for every
                            recorded set. Units are {weightUnit} and the result is {volumeUnit}.
                        </p>
                        <p>
                            Example: 3 sets of 10 reps at 100 {weightUnit} counts as $100 \times 10 \times 3 = 3000$ {volumeUnit}.
                        </p>
                        <button className="cta" type="button" onClick={() => setShowVolumeInfo(false)}>
                            Got it
                        </button>
                    </div>
                </div>
            ) : null}
        </section>
    );
};

export default Progress;

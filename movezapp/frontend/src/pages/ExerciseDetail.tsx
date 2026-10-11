import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

type TrainingSession = {
    id: number;
    started_at: string;
};

type TrainingExercise = {
    id: number;
    session_id: number;
    name: string;
};

type TrainingSet = {
    id: number;
    exercise_id: number;
    set_no: number;
    weight: number | null;
    reps: number | null;
    set_type: string | null;
};

type SetRecord = TrainingSet & {
    occurred_at: string;
    exercise_name: string;
};

type DailyStat = {
    date: string;
    volume: number;
    maxWeight: number;
};

const ExerciseDetail: React.FC = () => {
    const { id } = useParams();
    const exerciseName = id ? decodeURIComponent(id) : "";
    const [records, setRecords] = useState<SetRecord[]>([]);
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

    const toDateString = (value: Date) => value.toISOString().slice(0, 10);

    const defaultRange = useMemo(() => {
        const end = new Date();
        const start = new Date(end);
        start.setDate(end.getDate() - 90);
        return {
            from: toDateString(start),
            to: toDateString(end),
        };
    }, []);

    const [fromDate, setFromDate] = useState(defaultRange.from);
    const [toDate, setToDate] = useState(defaultRange.to);

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

    const exportSetsCsv = () => {
        const rows: Array<Array<string | number | null | undefined>> = [
            ["date", "time", "exercise", "set_no", `weight_${weightUnit}`, "reps", "set_type"],
        ];

        records.forEach((record) => {
            const date = new Date(record.occurred_at);
            const dateStr = date.toISOString().slice(0, 10);
            const timeStr = date.toLocaleTimeString();
            rows.push([
                dateStr,
                timeStr,
                record.exercise_name,
                record.set_no,
                record.weight != null ? Math.round(record.weight * weightFactor) : null,
                record.reps,
                record.set_type,
            ]);
        });

        const safeName = exerciseName ? exerciseName.replace(/[^a-z0-9-_]+/gi, "_") : "exercise";
        downloadCsv(`movezapp_${safeName}_${fromDate}_to_${toDate}.csv`, rows);
    };

    useEffect(() => {
        const loadDetail = async () => {
            setError(null);
            setStatus(null);

            const token = localStorage.getItem("movezapp_token");
            if (!token) {
                setError("No token found. Use the dev token on Today for now.");
                return;
            }

            if (!exerciseName) {
                setError("Missing exercise name.");
                return;
            }

            setIsLoading(true);
            try {
                const params = new URLSearchParams({
                    from: fromDate,
                    to: toDate,
                    type: "training",
                    exercise: exerciseName,
                });

                const response = await fetch(`${apiBase}/api/history?${params.toString()}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    const payload = await response.json().catch(() => ({}));
                    throw new Error(payload?.error || "Failed to load exercise history");
                }

                const data = await response.json();
                const sessions: TrainingSession[] = data.sessions || [];
                const exercises: TrainingExercise[] = data.exercises || [];
                const sets: TrainingSet[] = data.sets || [];

                const sessionMap = new Map<number, TrainingSession>();
                sessions.forEach((session) => sessionMap.set(session.id, session));

                const exerciseMap = new Map<number, TrainingExercise>();
                exercises.forEach((exercise) => exerciseMap.set(exercise.id, exercise));

                const mapped: SetRecord[] = sets
                    .map((set) => {
                        const exercise = exerciseMap.get(set.exercise_id);
                        if (!exercise) return null;
                        const session = sessionMap.get(exercise.session_id);
                        if (!session) return null;
                        return {
                            ...set,
                            occurred_at: session.started_at,
                            exercise_name: exercise.name,
                        };
                    })
                    .filter(Boolean) as SetRecord[];

                mapped.sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

                setRecords(mapped);
                setStatus("Exercise history loaded.");
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load exercise history");
            } finally {
                setIsLoading(false);
            }
        };

        loadDetail();
    }, [apiBase, exerciseName, fromDate, toDate]);

    useEffect(() => {
        localStorage.setItem("movezapp_units", weightUnit);
    }, [weightUnit]);

    const bestSet = records.reduce((best, record) => {
        if (record.weight == null || record.reps == null) return best;
        if (!best) return record;
        if ((record.weight || 0) > (best.weight || 0)) return record;
        if ((record.weight || 0) === (best.weight || 0) && (record.reps || 0) > (best.reps || 0)) return record;
        return best;
    }, null as SetRecord | null);

    const totalVolume = records.reduce((sum, record) => {
        if (record.weight == null || record.reps == null) return sum;
        return sum + Number(record.weight) * Number(record.reps);
    }, 0);

    const dailyStats = useMemo(() => {
        const statMap = new Map<string, DailyStat>();

        records.forEach((record) => {
            const date = new Date(record.occurred_at).toISOString().slice(0, 10);
            const volume = record.weight != null && record.reps != null
                ? Number(record.weight) * Number(record.reps)
                : 0;
            const existing = statMap.get(date) || { date, volume: 0, maxWeight: 0 };
            statMap.set(date, {
                date,
                volume: existing.volume + volume,
                maxWeight: Math.max(existing.maxWeight, Number(record.weight || 0)),
            });
        });

        return Array.from(statMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }, [records]);

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

    return (
        <section>
            <div className="section-header">
                <h1>Exercise Detail</h1>
                <p>{exerciseName || "Unknown exercise"}</p>
            </div>

            <div className="card" style={{ marginBottom: "18px" }}>
                <h3>Volume Snapshot</h3>
                <p>Trend for the selected range.</p>
                {error ? <p style={{ color: "#b0472a" }}>{error}</p> : null}
                {status ? <p>{status}</p> : null}
                <div className="toolbar" style={{ marginTop: "12px" }}>
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
                    <button className="cta secondary" type="button" onClick={exportSetsCsv}>
                        Export CSV
                    </button>
                </div>
                <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
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
                <div className="list">
                    <div className="list-item">
                        <span>Best set</span>
                        <span className="badge">
                            {bestSet && bestSet.weight != null && bestSet.reps != null
                                ? `${Math.round(bestSet.weight * weightFactor)} ${weightUnit} x ${bestSet.reps}`
                                : isLoading
                                    ? "Loading"
                                    : "No sets"}
                        </span>
                    </div>
                    <div className="list-item">
                        <span>Volume</span>
                        <span className="badge">
                            {totalVolume ? `${Math.round(totalVolume * weightFactor)} ${volumeUnit}` : `0 ${volumeUnit}`}
                        </span>
                    </div>
                </div>
                <button
                    className="cta secondary"
                    type="button"
                    style={{ marginTop: "12px" }}
                    onClick={() => setShowVolumeInfo(true)}
                >
                    What is volume?
                </button>
            </div>

            <div className="card" style={{ marginBottom: "18px" }}>
                <h3>Daily Volume ({volumeUnit})</h3>
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

            <div className="card" style={{ marginBottom: "18px" }}>
                <h3>Max Weight Trend ({weightUnit})</h3>
                {dailyStats.length === 0 ? (
                    <p>No data to chart yet.</p>
                ) : (
                    <div>
                        {renderLineChart(
                            dailyStats.map((stat) => stat.maxWeight),
                            dailyStats.map((stat) => stat.date),
                            160,
                            520,
                            (value) => `${Math.round(value * weightFactor)} ${weightUnit}`
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-soft)", marginTop: "6px" }}>
                            <span>Date</span>
                            <span>Weight ({weightUnit})</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-soft)" }}>
                            <span>{dailyStats[0].date}</span>
                            <span>{dailyStats[dailyStats.length - 1].date}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="card">
                <h3>Recent Sets</h3>
                {records.length === 0 ? (
                    <p>No sets found in the last 90 days.</p>
                ) : (
                    <div className="list">
                        {records.slice(0, 20).map((record) => (
                            <div key={record.id} className="list-item">
                                <div>
                                    <strong>{new Date(record.occurred_at).toLocaleDateString()}</strong>
                                    <div style={{ color: "var(--ink-soft)" }}>
                                        {record.exercise_name}
                                    </div>
                                </div>
                                <span className="badge">
                                    {record.weight != null && record.reps != null
                                        ? `${Math.round(record.weight * weightFactor)} ${weightUnit} x ${record.reps}`
                                        : "Set"}
                                </span>
                            </div>
                        ))}
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
                            Volume is the total training load. We sum $weight \times reps$ for every
                            recorded set in this exercise. Units are {weightUnit} and the result is {volumeUnit}.
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

export default ExerciseDetail;

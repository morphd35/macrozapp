import React, { useState, useEffect, useMemo } from 'react';
import axiosInstance from '../utils/axiosConfig';
import { jwtDecode } from 'jwt-decode';

// Raw API response type
interface ApiFoodLog {
    name: string;
    serving_size: string;
    servings: number;
    macro_name: string;
    total_value: number;
    unit: string;
    log_date: string;
}

// Transformed types for frontend use
interface FoodLogMacro {
    macro_name: string;
    total_value: number;
    unit: string;
}

interface FoodLogDetail {
    name: string;
    serving_size: string;
    servings: number;
    log_date: string;
    macros: FoodLogMacro[];
}

// Type for macro goals
interface MacroGoal {
    id: number;
    user_id: number;
    macro_name: string;
    target_value: number;
    unit: string;
    goal_type: 'stay_under' | 'reach_or_exceed';
}

// Type for summary data (used in foodLogs state)
interface FoodLogSummary {
    log_date: string;
    [key: string]: number | string; // Allows log_date as string, others as numbers
}

interface WeightLog {
    id: number;
    weight_lb: number | string;
    log_date: string;
}

const Logs: React.FC = () => {
    const [logType, setLogType] = useState<'food' | 'weight'>('food');
    const [timeRange, setTimeRange] = useState<'day' | 'week' | 'range'>('day');
    const [selectedDate, setSelectedDate] = useState<string>(() => {
        const today = new Date();
        return today.toISOString().split('T')[0]; // Ensures YYYY-MM-DD format
    });
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [foodLogs, setFoodLogs] = useState<FoodLogSummary[]>([]);
    const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
    const [detailedLogs, setDetailedLogs] = useState<FoodLogDetail[]>([]);
    const [selectedLogDate, setSelectedLogDate] = useState<string | null>(null);
    const [userId, setUserId] = useState<number | null>(null); // Dynamic userId
    const [error, setError] = useState<string>(''); // Error state for token issues
    const [goals, setGoals] = useState<MacroGoal[]>([]); // Store user macro goals
    const [showAllMacros, setShowAllMacros] = useState<boolean>(false); // Toggle for showing all macros

    // Define the main macros to prioritize
    const mainMacros = ['calories', 'protein', 'carbs', 'fats', 'sugars'] as const;

    // Resolve userId from token
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded: { id: number; username: string } = jwtDecode(token);
                setUserId(decoded.id);
                localStorage.setItem('user_id', decoded.id.toString());
            } catch (err) {
                console.error('Error decoding token:', err);
                setError('Invalid token. Please log in again.');
                localStorage.removeItem('token');
                localStorage.removeItem('user_id');
            }
        } else {
            setError('No token found. Please log in.');
        }
    }, []);

    // Fetch goals when userId is available
    useEffect(() => {
        if (userId) {
            fetchGoals();
        }
    }, [userId]);

    const fetchGoals = async () => {
        try {
            const res = await axiosInstance.get<MacroGoal[]>(`/api/food_logs/goals/${userId}`);
            console.log('Goals Response:', res.data);
            setGoals(res.data || []);
        } catch (err) {
            console.error('Fetch Goals Error:', err);
            setGoals([]);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchLogs();
        }
    }, [logType, timeRange, selectedDate, startDate, endDate, selectedLogDate, userId, goals]);

    const fetchLogs = async () => {
        if (!userId) return; // Wait until userId is resolved
        try {
            let url = '';
            if (logType === 'food') {
                if (timeRange === 'day') {
                    url = `/food_logs/detailed/${userId}/${selectedDate}`;
                    const res = await axiosInstance.get<ApiFoodLog[]>(url);
                    console.log('API Response (Day):', res.data);

                    // Pivot into daily summary
                    const dailySummary: FoodLogSummary = { log_date: selectedDate };
                    const detailedLogs: FoodLogDetail[] = [];
                    res.data.forEach(log => {
                        const logDate = log.log_date.split('T')[0];
                        const macroKey = `total_${log.macro_name.toLowerCase()}`;
                        dailySummary[macroKey] = (dailySummary[macroKey] as number || 0) + (log.total_value || 0);

                        // Build detailed logs
                        const existingLog = detailedLogs.find(
                            d => d.log_date === logDate && d.name === log.name && d.servings === log.servings
                        );
                        if (!existingLog) {
                            detailedLogs.push({
                                name: log.name,
                                serving_size: log.serving_size,
                                servings: log.servings,
                                log_date: logDate,
                                macros: [{ macro_name: log.macro_name, total_value: log.total_value, unit: log.unit }],
                            });
                        } else {
                            existingLog.macros.push({
                                macro_name: log.macro_name,
                                total_value: log.total_value,
                                unit: log.unit,
                            });
                        }
                    });

                    console.log('Daily Summary:', dailySummary);
                    console.log('Detailed Logs:', detailedLogs);
                    setFoodLogs([dailySummary]);
                    setDetailedLogs(detailedLogs);
                } else if (timeRange === 'week' || timeRange === 'range') {
                    const start = timeRange === 'week'
                        ? new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() - new Date(selectedDate).getDay())).toISOString().split('T')[0]
                        : startDate;
                    const end = timeRange === 'week'
                        ? new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() - new Date(selectedDate).getDay() + 6)).toISOString().split('T')[0]
                        : endDate;
                    url = `/food_logs/range/${userId}/${start}/${end}`;
                    const res = await axiosInstance.get<ApiFoodLog[]>(url);
                    console.log('API Response (Range):', res.data);

                    // Group by date
                    const dailySummaries: { [key: string]: FoodLogSummary } = {};
                    const detailedLogs: FoodLogDetail[] = [];
                    res.data.forEach(log => {
                        const logDate = log.log_date.split('T')[0];
                        dailySummaries[logDate] = dailySummaries[logDate] || { log_date: logDate };
                        const macroKey = `total_${log.macro_name.toLowerCase()}`;
                        dailySummaries[logDate][macroKey] = (dailySummaries[logDate][macroKey] as number || 0) + (log.total_value || 0);

                        // Build detailed logs
                        const existingLog = detailedLogs.find(
                            d => d.log_date === logDate && d.name === log.name && d.servings === log.servings
                        );
                        if (!existingLog) {
                            detailedLogs.push({
                                name: log.name,
                                serving_size: log.serving_size,
                                servings: log.servings,
                                log_date: logDate,
                                macros: [{ macro_name: log.macro_name, total_value: log.total_value, unit: log.unit }],
                            });
                        } else {
                            existingLog.macros.push({
                                macro_name: log.macro_name,
                                total_value: log.total_value,
                                unit: log.unit,
                            });
                        }
                    });

                    console.log('Daily Summaries:', dailySummaries);
                    console.log('Detailed Logs:', detailedLogs);
                    setFoodLogs(Object.entries(dailySummaries).map(([_, summary]) => summary));
                    setDetailedLogs(detailedLogs);
                }
            } else if (logType === 'weight') {
                if (timeRange === 'day') {
                    url = `/weight_logs?user_id=${userId}&date=${selectedDate}`;
                    const res = await axiosInstance.get<WeightLog[]>(url);
                    console.log('Weight Logs Response (Day):', res.data);
                    setWeightLogs(res.data);
                } else if (timeRange === 'week' || timeRange === 'range') {
                    const start = timeRange === 'week'
                        ? new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() - new Date(selectedDate).getDay())).toISOString().split('T')[0]
                        : startDate;
                    const end = timeRange === 'week'
                        ? new Date(new Date(selectedDate).setDate(new Date(selectedDate).getDate() - new Date(selectedDate).getDay() + 6)).toISOString().split('T')[0]
                        : endDate;
                    url = `/weight_logs/range?user_id=${userId}&start_date=${start}&end_date=${end}`;
                    const res = await axiosInstance.get<WeightLog[]>(url);
                    console.log('Weight Logs Response (Range):', res.data);
                    setWeightLogs(res.data);
                }
            }
        } catch (err) {
            console.error('Fetch Logs Error:', err);
            if (logType === 'food') setFoodLogs([]);
            else setWeightLogs([]);
        }
    };

    const formatNumber = (num: number | string | undefined | null): string => {
        if (num === undefined || num === null) return 'N/A';
        const parsedNum = typeof num === 'string' ? parseFloat(num) : num;
        if (isNaN(parsedNum)) return '0';
        return Number(parsedNum.toFixed(2)).toString();
    };

    const showDetailedLogs = (date: string) => {
        setSelectedLogDate(date);
    };

    // Dynamically set all tracked macros based on user goals
    const allTrackedMacros = useMemo(() => {
        return goals.map(goal => goal.macro_name.toLowerCase());
    }, [goals]);

    // Limit the number of displayed macros to 5 by default, prioritizing main macros
    const maxDisplayedMacros = 5;
    const displayedMacros = useMemo(() => {
        if (showAllMacros) return allTrackedMacros; // Show all macros when toggled
        const trackedMainMacros = allTrackedMacros.filter(macro => mainMacros.includes(macro as (typeof mainMacros)[number]));
        const remainingSlots = maxDisplayedMacros - trackedMainMacros.length;
        const additionalMacros = allTrackedMacros
            .filter(macro => !mainMacros.includes(macro as (typeof mainMacros)[number]))
            .slice(0, remainingSlots);
        return [...trackedMainMacros, ...additionalMacros];
    }, [allTrackedMacros, mainMacros, showAllMacros]); // Ensure showAllMacros triggers recomputation

    console.log('showAllMacros:', showAllMacros); // Debug log to confirm state change
    console.log('displayedMacros:', displayedMacros); // Debug log to confirm macro selection

    if (!userId && !error) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <h1>Logs</h1>
            <div className="card">
                <h2>Logs</h2>
                <div className="form-grid">
                    <label>
                        Log Type
                        <select value={logType} onChange={e => setLogType(e.target.value as 'food' | 'weight')}>
                            <option value="food">Food</option>
                            <option value="weight">Weight</option>
                        </select>
                    </label>
                    <label>
                        Time Range
                        <select value={timeRange} onChange={e => setTimeRange(e.target.value as 'day' | 'week' | 'range')}>
                            <option value="day">Day</option>
                            <option value="week">Week</option>
                            <option value="range">Date Range</option>
                        </select>
                    </label>
                    {timeRange === 'day' && (
                        <label>
                            Date
                            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                        </label>
                    )}
                    {timeRange === 'range' && (
                        <>
                            <label>
                                Start Date
                                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                            </label>
                            <label>
                                End Date
                                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                            </label>
                        </>
                    )}
                </div>
            </div>
            {logType === 'food' && foodLogs.length > 0 && (
                <div className="card">
                    <h2>Logged Foods</h2>
                    {allTrackedMacros.length > maxDisplayedMacros && (
                        <button
                            className="toggle-macros-btn"
                            onClick={() => {
                                console.log('Toggling showAllMacros from', showAllMacros, 'to', !showAllMacros); // Debug log
                                setShowAllMacros(!showAllMacros);
                            }}
                        >
                            {showAllMacros ? 'Show Fewer Macros' : 'Show All Macros'}
                        </button>
                    )}
                    <div className="table-container">
                        <div className="data-table-header">
                            <span className="header-cell sticky date-column">Date</span>
                            {displayedMacros.map((macro: string) => (
                                <span
                                    key={macro}
                                    className="header-cell"
                                    title={`${macro.charAt(0).toUpperCase() + macro.slice(1)} (${goals.find(g => g.macro_name.toLowerCase() === macro)?.unit || ''})`}
                                >
                                    {macro.charAt(0).toUpperCase() + macro.slice(1)}
                                    {goals.find(g => g.macro_name.toLowerCase() === macro)?.unit && (
                                        <span className="unit">({goals.find(g => g.macro_name.toLowerCase() === macro)?.unit})</span>
                                    )}
                                </span>
                            ))}
                            <span className="header-cell expand-column"></span>
                        </div>
                        {foodLogs.map((log, index) => (
                            <React.Fragment key={index}>
                                <div
                                    className={`data-table-row ${selectedLogDate === log.log_date ? 'expanded' : ''}`}
                                    onClick={() => {
                                        if (selectedLogDate === log.log_date) {
                                            setSelectedLogDate(null);
                                        } else {
                                            showDetailedLogs(log.log_date);
                                        }
                                    }}
                                >
                                    <span className="data-cell sticky date-column">{log.log_date}</span>
                                    {displayedMacros.map((macro: string) => (
                                        <span key={macro} className="data-cell">
                                            {formatNumber(log[`total_${macro}`])}
                                        </span>
                                    ))}
                                    <span className="data-cell expand-column"></span>
                                </div>
                                {selectedLogDate === log.log_date && (
                                    <div className="table-container">
                                        <div className="data-table-header">
                                            <span className="header-cell sticky food-name-column">Food Name</span>
                                            {allTrackedMacros.map((macro: string) => (
                                                <span
                                                    key={macro}
                                                    className="header-cell"
                                                    title={`${macro.charAt(0).toUpperCase() + macro.slice(1)} (${goals.find(g => g.macro_name.toLowerCase() === macro)?.unit || ''})`}
                                                >
                                                    {macro.charAt(0).toUpperCase() + macro.slice(1)}
                                                    {goals.find(g => g.macro_name.toLowerCase() === macro)?.unit && (
                                                        <span className="unit">({goals.find(g => g.macro_name.toLowerCase() === macro)?.unit})</span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                        {detailedLogs
                                            .filter(detail => detail.log_date === log.log_date)
                                            .map((detail, detailIndex) => (
                                                <div key={detailIndex} className="data-table-row">
                                                    <span className="data-cell sticky food-name-column">
                                                        {detail.name} ({detail.serving_size} x {detail.servings})
                                                    </span>
                                                    {allTrackedMacros.map((macro: string) => (
                                                        <span key={macro} className="data-cell" data-label={macro.charAt(0).toUpperCase() + macro.slice(1)}>
                                                            {formatNumber(detail.macros.find(m => m.macro_name.toLowerCase() === macro)?.total_value)}
                                                        </span>
                                                    ))}
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>
            )}
            {logType === 'weight' && weightLogs.length > 0 && (
                <div className="card">
                    <h2>Logged Weights</h2>
                    <ul className="weight-list">
                        {weightLogs.map((log, index) => (
                            <li key={index}>
                                {new Date(log.log_date).toISOString().split('T')[0]}: {formatNumber(log.weight_lb)} lbs
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default Logs;
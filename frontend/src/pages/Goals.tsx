import React, { useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import { jwtDecode } from 'jwt-decode';
import axiosInstance from '../utils/axiosConfig';
import EditIcon from '@mui/icons-material/Edit'; // Import EditIcon
import DeleteIcon from '@mui/icons-material/Delete'; // Import DeleteIcon
import '../App.css';

interface DecodedToken {
    id: number;
    username: string;
}

interface MacroGoal {
    id: number;
    user_id: number;
    macro_name: string;
    target_value: number;
    unit: string;
    goal_type: 'stay_under' | 'reach_or_exceed';
}

const Goals: React.FC = () => {
    const [goals, setGoals] = useState<MacroGoal[]>([]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [userId, setUserId] = useState<number | null>(null);
    const [error, setError] = useState('');
    const [newGoal, setNewGoal] = useState({ macro_name: '', target_value: 0, unit: '', goal_type: 'stay_under' as 'stay_under' | 'reach_or_exceed' });
    const [editGoal, setEditGoal] = useState<MacroGoal | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded: DecodedToken = jwtDecode(token);
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

    useEffect(() => {
        if (userId) {
            fetchGoals();
        }
    }, [userId]);

    const fetchGoals = async () => {
        if (!userId) return;
        try {
            const res = await axiosInstance.get<MacroGoal[]>(`api/food_logs/goals/${userId}`);
            // console.log('Goals Response:', res.data);
            setGoals(res.data || []);
        } catch (err) {
            const error = err as AxiosError;
            console.error('Fetch Goals Error:', error.response?.data || error.message);
            setGoals([]);
        }
    };

    const saveGoal = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!userId) {
            alert('Please log in to save goals');
            return;
        }

        // Normalize macro_name: lowercase, replace spaces with underscores
        const normalizedMacroName = newGoal.macro_name.toLowerCase().replace(/\s+/g, '_');

        try {
            const response = await axiosInstance.post('/api/food_logs/goals', {
                user_id: userId,
                macro_name: normalizedMacroName,
                target_value: newGoal.target_value,
                unit: newGoal.unit,
                goal_type: newGoal.goal_type,
            });
            // console.log('Save Goal Response:', response.data);
            await fetchGoals();
            setNewGoal({ macro_name: '', target_value: 0, unit: '', goal_type: 'stay_under' });
            setShowAddModal(false);
            alert('Goal saved successfully');
        } catch (err) {
            const error = err as AxiosError;
            console.error('Save Goal Error:', error.response?.data || error.message);
            alert('Failed to save goal');
        }
    };

    const updateGoal = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!userId || !editGoal) return;

        try {
            const response = await axiosInstance.put(`api/food_logs/goals/${userId}/${editGoal.macro_name}`, {
                target_value: editGoal.target_value,
                unit: editGoal.unit,
                goal_type: editGoal.goal_type,
            });
            // console.log('Update Goal Response:', response.data);
            await fetchGoals();
            setEditGoal(null);
            setShowEditModal(false);
            alert('Goal updated successfully');
        } catch (err) {
            const error = err as AxiosError;
            console.error('Update Goal Error:', error.response?.data || error.message);
            alert('Failed to update goal');
        }
    };

    const deleteGoal = async (macro_name: string) => {
        if (!userId) return;
        try {
            await axiosInstance.delete(`api/food_logs/goals/${userId}/${macro_name}`);
            await fetchGoals();
            alert('Goal deleted successfully');
        } catch (err) {
            const error = err as AxiosError;
            console.error('Delete Goal Error:', error.response?.data || error.message);
            alert('Failed to delete goal');
        }
    };

    const formatNumber = (num: number | null | undefined): string => {
        if (num === undefined || num === null || num === 0) return 'N/A';
        return num.toFixed(1);
    };

    if (!userId && !error) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <h1>Goals</h1>
            <div className="card">
                <h2>Your Macro Goals</h2>
                <button className="button-with-icon" onClick={() => setShowAddModal(true)}>
                    Add New Goal
                </button>
                {goals.map(goal => (
                    <div key={goal.id} className="goal-item">
                        <span className="goal-text">
                            {goal.macro_name}: {formatNumber(goal.target_value)} {goal.unit} ({goal.goal_type === 'stay_under' ? 'Stay Under' : 'Reach or Exceed'})
                        </span>
                        <div className="goal-actions">
                            <EditIcon
                                className="edit-btn"
                                onClick={() => { setEditGoal(goal); setShowEditModal(true); }}
                                style={{ cursor: 'pointer', marginRight: '5px', fontSize: '1rem' }}
                            />
                            <DeleteIcon
                                className="delete-btn"
                                onClick={() => deleteGoal(goal.macro_name)}
                                style={{ cursor: 'pointer', fontSize: '1rem' }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {showAddModal && (
                <>
                    <div className="modal-backdrop" onClick={() => setShowAddModal(false)} />
                    <div className="modal">
                        <h3>Add New Macro Goal</h3>
                        <form onSubmit={saveGoal}>
                            <label>
                                Macro Name
                                <input
                                    type="text"
                                    value={newGoal.macro_name}
                                    onChange={e => setNewGoal({ ...newGoal, macro_name: e.target.value })}
                                    required
                                />
                            </label>
                            <label>
                                Target Value
                                <input
                                    type="number"
                                    value={newGoal.target_value}
                                    onChange={e => setNewGoal({ ...newGoal, target_value: parseFloat(e.target.value) || 0 })}
                                    step="0.1"
                                    required
                                />
                            </label>
                            <label>
                                Unit
                                <select
                                    value={newGoal.unit}
                                    onChange={e => setNewGoal({ ...newGoal, unit: e.target.value })}
                                    required
                                >
                                    <option value="">Select Unit</option>
                                    <option value="kcal">kcal</option>
                                    <option value="g">g</option>
                                    <option value="mg">mg</option>
                                    <option value="oz">oz</option>
                                </select>
                            </label>
                            <label>
                                Goal Type
                                <select
                                    value={newGoal.goal_type}
                                    onChange={e => setNewGoal({ ...newGoal, goal_type: e.target.value as 'stay_under' | 'reach_or_exceed' })}
                                    required
                                >
                                    <option value="stay_under">Stay Under</option>
                                    <option value="reach_or_exceed">Reach or Exceed</option>
                                </select>
                            </label>
                            <button type="submit">Save</button>
                            <button type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
                        </form>
                    </div>
                </>
            )}

            {showEditModal && editGoal && (
                <>
                    <div className="modal-backdrop" onClick={() => setShowEditModal(false)} />
                    <div className="modal">
                        <h3>Edit Macro Goal</h3>
                        <form onSubmit={updateGoal}>
                            <label>
                                Macro Name
                                <input type="text" value={editGoal.macro_name} disabled />
                            </label>
                            <label>
                                Target Value
                                <input
                                    type="number"
                                    value={editGoal.target_value}
                                    onChange={e => setEditGoal({ ...editGoal, target_value: parseFloat(e.target.value) || 0 })}
                                    step="0.1"
                                    required
                                />
                            </label>
                            <label>
                                Unit
                                <select
                                    value={editGoal.unit}
                                    onChange={e => setEditGoal({ ...editGoal, unit: e.target.value })}
                                    required
                                >
                                    <option value="">Select Unit</option>
                                    <option value="kcal">kcal</option>
                                    <option value="g">g</option>
                                    <option value="mg">mg</option>
                                    <option value="oz">oz</option>
                                </select>
                            </label>
                            <label>
                                Goal Type
                                <select
                                    value={editGoal.goal_type}
                                    onChange={e => setEditGoal({ ...editGoal, goal_type: e.target.value as 'stay_under' | 'reach_or_exceed' })}
                                    required
                                >
                                    <option value="stay_under">Stay Under</option>
                                    <option value="reach_or_exceed">Reach or Exceed</option>
                                </select>
                            </label>
                            <button type="submit">Update</button>
                            <button type="button" onClick={() => setShowEditModal(false)}>Cancel</button>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};

export default Goals;
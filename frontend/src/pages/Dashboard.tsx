import React, { useState, useEffect, useCallback } from 'react';
import { AxiosError } from 'axios';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import { jwtDecode } from 'jwt-decode';
import axiosInstance from '../utils/axiosConfig';
import '../App.css';

interface DailySummary {
    [key: string]: number | undefined;
    total_calories?: number;
    total_protein?: number;
    total_carbs?: number;
    total_fats?: number;
    total_sugars?: number;
    total_sodium?: number;
    total_cholesterol?: number;
}

interface FoodMacro {
    macro_name: string;
    value: number;
    unit: string;
}

interface Food {
    id: number;
    name: string;
    serving_size: string;
    category: string;
    macros: FoodMacro[];
    custom?: boolean;
}

interface Category {
    id: number;
    name: string;
}

interface MacroGoal {
    id: number;
    user_id: number;
    macro_name: string;
    target_value: number;
    unit: string;
    goal_type: 'stay_under' | 'reach_or_exceed';
}

const Dashboard: React.FC = () => {
    const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
    const [goals, setGoals] = useState<MacroGoal[]>([]);
    const [logDate, setLogDate] = useState<string>(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    const [showLogModal, setShowLogModal] = useState(false);
    const [showAddFoodModal, setShowAddFoodModal] = useState(false);
    const [foods, setFoods] = useState<Food[]>([]);
    const [selectedFood, setSelectedFood] = useState<Food | null>(null);
    const [servings, setServings] = useState<number>(1);
    const [userId, setUserId] = useState<number | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
    const [newCategory, setNewCategory] = useState<string>('');
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [showLogWeightModal, setShowLogWeightModal] = useState(false);
    const [weight, setWeight] = useState<number>(0);
    const [error, setError] = useState('');
    const [customFoodMacros, setCustomFoodMacros] = useState<{ [key: string]: number }>({}); // Track macro values for the form

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

    const fetchDailySummary = useCallback(async () => {
        if (!userId) return;
        try {
            const url = `/api/food_logs/${userId}/${logDate}`;
            console.log('Fetching daily summary from:', url);
            const res = await axiosInstance.get<DailySummary>(url);
            console.log('Raw Daily Summary Response:', res.data); // Log the raw response
            const parsedSummary = res.data || {};
            setDailySummary(parsedSummary);
        } catch (err) {
            const error = err as AxiosError;
            console.error('Fetch Summary Error:', error.response?.data || error.message);
            setDailySummary(null);
        }
    }, [userId, logDate]);

    const fetchGoals = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await axiosInstance.get<MacroGoal[]>(`/api/food_logs/goals/${userId}`);
            console.log('Goals Response:', res.data);
            setGoals(res.data || []);
            // Initialize customFoodMacros with tracked macros
            const initialMacros = res.data.reduce((acc, goal) => {
                acc[goal.macro_name] = 0;
                return acc;
            }, {} as { [key: string]: number });
            setCustomFoodMacros(initialMacros);
        } catch (err) {
            const error = err as AxiosError;
            console.error('Fetch Goals Error:', error.response?.data || error.message);
            setGoals([]);
        }
    }, [userId]);

    const fetchFoods = useCallback(async () => {
        try {
            const res = await axiosInstance.get<Food[]>('/api/food_logs/foods'); // Updated endpoint
            console.log('Fetched foods:', res.data); // Debug log
            setFoods(res.data);
        } catch (err) {
            const error = err as AxiosError;
            console.error('Fetch Foods Error:', error.response?.data || error.message);
        }
    }, []);

    const fetchCategories = useCallback(async () => {
        try {
            const res = await axiosInstance.get<Category[]>('/api/categories');
            console.log('Fetched categories:', res.data);
            setCategories(res.data);
        } catch (err) {
            console.error('Fetch Categories Error:', err);
            setCategories([]);
        }
    }, []);

    useEffect(() => {
        if (userId) {
            fetchDailySummary();
            fetchGoals();
            fetchFoods();
            fetchCategories();
        }
    }, [fetchDailySummary, fetchGoals, fetchFoods, fetchCategories, userId]);

    const addCategory = async () => {
        if (newCategory.trim()) {
            try {
                const res = await axiosInstance.post<Category>('/api/categories', { name: newCategory });
                setCategories(prev => [...prev, res.data]);
                setNewCategory('');
            } catch (err) {
                const error = err as AxiosError;
                console.error('Add Category Error:', error.response?.data || error.message);
                alert('Failed to add category.');
            }
        }
    };

    const editCategory = async () => {
        if (editingCategory && editingCategory.name.trim()) {
            try {
                const res = await axiosInstance.put<Category>(
                    `api/categories/${editingCategory.id}`,
                    { name: editingCategory.name }
                );
                setCategories(prev => prev.map(c => c.id === editingCategory.id ? res.data : c));
                setEditingCategory(null);
            } catch (err) {
                const error = err as AxiosError;
                console.error('Edit Category Error:', error.response?.data || error.message);
                alert('Failed to edit category.');
            }
        }
    };

    const deleteCategory = async (id: number) => {
        try {
            await axiosInstance.delete(`api/categories/${id}`);
            setCategories(prev => prev.filter(c => c.id !== id));
        } catch (err) {
            const error = err as AxiosError;
            console.error('Delete Category Error:', error.response?.data || error.message);
            alert('Failed to delete category.');
        }
    };

    const logWeight = async () => {
        if (!userId) return;
        try {
            const response = await axiosInstance.post('/api/weight_logs', {
                user_id: userId,
                weight_lb: weight,
                log_date: logDate,
            });
            console.log('Log Weight Response:', response.data);
            setShowLogWeightModal(false);
            setWeight(0);
        } catch (err) {
            const error = err as AxiosError;
            console.error('Log Weight Error:', error.response?.data || error.message);
            alert('Failed to log weight');
        }
    };

    const addCustomFood = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const foodName = formData.get('name') as string;
        const servingSize = formData.get('serving_size') as string;
        const category = formData.get('category') as string;

        if (foodName && servingSize && category) {
            try {
                const macros = goals.map(goal => ({
                    macro_name: goal.macro_name,
                    value: customFoodMacros[goal.macro_name] || 0,
                    unit: goal.unit,
                }));

                const res = await axiosInstance.post<Food>('/api/food_logs/foods', {
                    name: foodName,
                    serving_size: servingSize,
                    category,
                    macros,
                });
                console.log('Add Food Response:', res.data); // Debug log
                const newFood = { ...res.data, custom: true };
                setFoods(prevFoods => [...prevFoods, newFood]); // Immediately update state with new food
                await fetchFoods(); // Re-fetch the full list to ensure consistency
                setShowAddFoodModal(false);
                setCustomFoodMacros(goals.reduce((acc, goal) => {
                    acc[goal.macro_name] = 0;
                    return acc;
                }, {} as { [key: string]: number }));
            } catch (err) {
                const error = err as AxiosError;
                console.error('Add Food Error:', error.message, error.response?.data);
                alert('Failed to add food');
            }
        }
    };

    const logFood = async () => {
        if (!selectedFood || !userId) {
            console.warn('No selected food or userId:', { selectedFood, userId });
            return;
        }
        try {
            const response = await axiosInstance.post('/api/food_logs/food_logs', {
                user_id: userId,
                food_id: selectedFood.id,
                servings,
                log_date: logDate,
            });
            console.log('Log Food Response:', response.data); // Debug log
            await fetchDailySummary();
            await fetchFoods(); // Refresh foods list after logging
            setShowLogModal(false);
            setSelectedFood(null);
            setServings(1);
        } catch (err) {
            const error = err as AxiosError;
            console.error('Log Food Error:', error.response?.data || error.message);
            alert('Failed to log food');
        }
    };

    const handleMacroChange = (macroName: string, value: number) => {
        setCustomFoodMacros(prev => ({
            ...prev,
            [macroName]: value,
        }));
    };

    const formatNumber = (num: number | undefined | null): string => {
        if (num === undefined || num === null || num === 0) return 'N/A';
        return num.toFixed(1);
    };

    const calculateProgress = (current: number | undefined, goal: number | undefined, goalType: 'stay_under' | 'reach_or_exceed') => {
        if (!current || !goal || goal === 0) {
            return { percentage: 0, status: 'safe' };
        }
        const percentage = (current / goal) * 100;
        if (goalType === 'stay_under') {
            if (percentage > 100) {
                return { percentage: Math.min(percentage, 100), status: 'over' };
            } else if (percentage >= 80) {
                return { percentage: Math.min(percentage, 100), status: 'warning' };
            }
            return { percentage: Math.min(percentage, 100), status: 'safe' };
        } else {
            if (percentage >= 100) {
                return { percentage: Math.min(percentage, 100), status: 'success' };
            } else if (percentage >= 80) {
                return { percentage: Math.min(percentage, 100), status: 'warning' };
            }
            return { percentage: Math.min(percentage, 100), status: 'under' };
        }
    };

    const hasNoEntries = dailySummary && Object.values(dailySummary).every(val => val === 0 || val === undefined);

    if (!userId && !error) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <h1>MacroZapp</h1>
            <div className="card">
                <h2>Dashboard</h2>
                <div className="form-grid">
                    <label>
                        Date
                        <div className="input-with-icon">
                            <CalendarTodayIcon className="icon" />
                            <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} />
                        </div>
                    </label>
                    <div>
                        <button className="button-with-icon" onClick={() => setShowLogModal(true)}>
                            <RestaurantIcon className="icon" />
                            Log Food
                        </button>
                        <button className="button-with-icon" onClick={() => setShowLogWeightModal(true)}>
                            <FitnessCenterIcon className="icon" />
                            Log Weight
                        </button>
                    </div>
                </div>
            </div>
            {hasNoEntries ? (
                <p className="prompt">Start logging your food for today!</p>
            ) : (
                dailySummary && (
                    <div className="card">
                        <h2>Daily Totals ({logDate})</h2>
                        {goals.map(goal => {
                            const currentValue = dailySummary[`total_${goal.macro_name.toLowerCase()}`];
                            return (
                                <div key={goal.id} className="progress-item">
                                    <p>
                                        {goal.macro_name}: {formatNumber(currentValue)} / {formatNumber(goal.target_value)} {goal.unit} ({goal.goal_type === 'stay_under' ? 'Stay Under' : 'Reach or Exceed'})
                                    </p>
                                    <div className="progress-bar">
                                        <div
                                            className={`progress-fill ${calculateProgress(currentValue, goal.target_value, goal.goal_type).status}`}
                                            style={{ width: `${calculateProgress(currentValue, goal.target_value, goal.goal_type).percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {showLogModal && (
                <>
                    <div className="modal-backdrop" onClick={() => setShowLogModal(false)} />
                    <div className="modal">
                        <h3>Log Food</h3>
                        <div className="form-grid">
                            <label>
                                Select Food
                                <select
                                    value={selectedFood?.id || ''}
                                    onChange={e => {
                                        const food = foods.find(f => f.id === parseInt(e.target.value));
                                        console.log('Selected food:', food); // Debug log
                                        setSelectedFood(food || null);
                                    }}
                                >
                                    <option value="">Select Food</option>
                                    {foods.map(food => (
                                        <option key={food.id} value={food.id}>
                                            {food.name} ({food.serving_size})
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <div>
                                <button className="button-with-icon" onClick={() => setShowAddFoodModal(true)}>
                                    <AddCircleOutlineIcon className="icon" />
                                    Add New Food
                                </button>
                            </div>
                            <label>
                                Servings
                                <input
                                    type="number"
                                    value={servings}
                                    onChange={e => setServings(parseFloat(e.target.value) || 0)}
                                    step="0.1"
                                />
                            </label>
                            <div>
                                <button className="button-with-icon" onClick={logFood}>
                                    <RestaurantIcon className="icon" />
                                    Log Food
                                </button>
                            </div>
                        </div>
                        <button type="button" onClick={() => setShowLogModal(false)}>Cancel</button>
                    </div>
                </>
            )}

            {showLogWeightModal && (
                <>
                    <div className="modal-backdrop" onClick={() => setShowLogWeightModal(false)} />
                    <div className="modal">
                        <h3>Log Weight</h3>
                        <div className="form-grid">
                            <label>
                                Date
                                <div className="input-with-icon">
                                    <CalendarTodayIcon className="icon" />
                                    <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} />
                                </div>
                            </label>
                            <label>
                                Weight (lbs)
                                <input
                                    type="number"
                                    value={weight}
                                    onChange={e => setWeight(parseFloat(e.target.value) || 0)}
                                    step="0.1"
                                />
                            </label>
                            <div>
                                <button className="button-with-icon" onClick={logWeight}>
                                    <FitnessCenterIcon className="icon" />
                                    Log Weight
                                </button>
                            </div>
                        </div>
                        <button type="button" onClick={() => setShowLogWeightModal(false)}>Cancel</button>
                    </div>
                </>
            )}

            {showAddFoodModal && (
                <>
                    <div className="modal-backdrop" onClick={() => setShowAddFoodModal(false)} />
                    <div className="modal">
                        <h3>Add Custom Food</h3>
                        <form onSubmit={addCustomFood}>
                            <label>
                                Name
                                <input type="text" name="name" required />
                            </label>
                            <label>
                                Serving Size
                                <input type="text" name="serving_size" required />
                            </label>
                            {goals.map(goal => (
                                <label key={goal.macro_name}>
                                    {goal.macro_name} ({goal.unit})
                                    <input
                                        type="number"
                                        name={`macro_${goal.macro_name}`}
                                        step={goal.unit === 'kcal' || goal.unit === 'mg' ? '1' : '0.1'}
                                        value={customFoodMacros[goal.macro_name] || 0}
                                        onChange={e => handleMacroChange(goal.macro_name, parseFloat(e.target.value) || 0)}
                                    />
                                </label>
                            ))}
                            <label>
                                Category
                                <select name="category" required>
                                    <option value="">Select Category</option>
                                    {categories.map(category => (
                                        <option key={category.id} value={category.name}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <button type="button" onClick={() => setShowCategoryModal(true)}>
                                Manage Categories
                            </button>
                            <button type="submit">Add Food</button>
                            <button type="button" onClick={() => setShowAddFoodModal(false)}>Cancel</button>
                        </form>
                    </div>
                </>
            )}

            {showCategoryModal && (
                <>
                    <div className="modal-backdrop" onClick={() => setShowCategoryModal(false)} />
                    <div className="modal" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                        <h3>Manage Categories</h3>
                        <div className="category-modal-content">
                            <div className="new-category-section">
                                <label>
                                    New Category
                                    <input
                                        type="text"
                                        value={newCategory}
                                        onChange={e => setNewCategory(e.target.value)}
                                        placeholder="Enter new category"
                                    />
                                </label>
                                <button onClick={addCategory}>Add Category</button>
                            </div>
                            <ul>
                                {categories.map(category => (
                                    <li key={category.id}>
                                        {editingCategory && editingCategory.id === category.id ? (
                                            <>
                                                <input
                                                    type="text"
                                                    value={editingCategory.name}
                                                    onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                                                />
                                                <button className="save-btn" onClick={editCategory}>Save</button>
                                            </>
                                        ) : (
                                            <>
                                                <span>{category.name}</span>
                                                <div className="category-actions">
                                                    <button className="edit-btn" onClick={() => setEditingCategory(category)}>Edit</button>
                                                    <button className="delete-btn" onClick={() => deleteCategory(category.id)}>Delete</button>
                                                </div>
                                            </>
                                        )}
                                    </li>
                                ))}
                            </ul>
                            <button
                                className="close-btn"
                                onClick={() => {
                                    setShowCategoryModal(false);
                                    setEditingCategory(null);
                                    setNewCategory('');
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default Dashboard;
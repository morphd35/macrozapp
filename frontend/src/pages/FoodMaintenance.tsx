import React, { useState, useEffect, useMemo } from 'react';
import axios, { AxiosError } from 'axios';
import axiosInstance from '../utils/axiosConfig';
import './FoodMaintenance.css';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MenuIcon from '@mui/icons-material/Menu';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from 'react-router-dom';

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

interface ErrorResponse {
    error?: string;
}

const FoodMaintenance: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [foods, setFoods] = useState<Food[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [showAddModal, setShowAddModal] = useState<boolean>(false);
    const [showEditModal, setShowEditModal] = useState<boolean>(false);
    const [editingFood, setEditingFood] = useState<Food | null>(null);
    const [categories, setCategories] = useState<Category[]>([]);
    const [showCategoryModal, setShowCategoryModal] = useState<boolean>(false);
    const [newCategory, setNewCategory] = useState<string>('');
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [goals, setGoals] = useState<MacroGoal[]>([]);
    const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
    const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
    const [foodToDelete, setFoodToDelete] = useState<number | null>(null);
    const [expandedRows, setExpandedRows] = useState<number[]>([]);
    const navigate = useNavigate();
    const [loading, setLoading] = useState<boolean>(false);
    const [success, setSuccess] = useState<string>('');
    const [error, setError] = useState<string>('');

    useEffect(() => {
        fetchFoods();
        fetchCategories();
        fetchGoals();
    }, []);

    const fetchFoods = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('User not authenticated.');
                return;
            }
            const decoded: { id: number } = JSON.parse(atob(token.split('.')[1]));
            setLoading(true);
            const response = await axiosInstance.get<Food[]>('/api/foods/foods', {
                params: { user_id: decoded.id },
            });
            console.log('Fetched foods:', response.data);
            setFoods(response.data);
        } catch (err) {
            const error = err as AxiosError<ErrorResponse>;
            console.error('Fetch Foods Error:', error.response?.data || error.message);
            setFoods([]);
            setError(error.response?.data?.error || 'Failed to fetch foods.');
        } finally {
            setLoading(false);
        }
    };

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const response = await axiosInstance.get<Category[]>('/api/categories');
            console.log('Fetched categories:', response.data);
            setCategories(response.data);
        } catch (err) {
            const error = err as AxiosError<ErrorResponse>;
            console.error('Fetch Categories Error:', error.response?.data || error.message);
            setCategories([]);
            setError(error.response?.data?.error || 'Failed to fetch categories.');
        } finally {
            setLoading(false);
        }
    };

    const fetchGoals = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setError('User not authenticated.');
                return;
            }
            const decoded: { id: number } = JSON.parse(atob(token.split('.')[1]));
            setLoading(true);
            const response = await axiosInstance.get<MacroGoal[]>(`/api/food_logs/goals/${decoded.id}`);
            console.log('Fetched goals:', response.data);
            setGoals(response.data);
        } catch (err) {
            const error = err as AxiosError<ErrorResponse>;
            console.error('Fetch Goals Error:', error.response?.data || error.message);
            setGoals([]);
            setError(error.response?.data?.error || 'Failed to fetch goals.');
        } finally {
            setLoading(false);
        }
    };

    const addCategory = async () => {
        if (newCategory.trim()) {
            try {
                setLoading(true);
                const response = await axiosInstance.post<Category>('/api/categories', { name: newCategory });
                setCategories(prev => [...prev, response.data]);
                setNewCategory('');
                setSuccess('Category added successfully!');
            } catch (err) {
                const error = err as AxiosError<ErrorResponse>;
                console.error('Add Category Error:', error.response?.data || error.message);
                setError(error.response?.data?.error || 'Failed to add category.');
            } finally {
                setLoading(false);
            }
        }
    };

    const editCategory = async () => {
        if (editingCategory && editingCategory.name.trim()) {
            try {
                setLoading(true);
                const response = await axiosInstance.put<Category>(`/api/categories/${editingCategory.id}`, { name: editingCategory.name });
                setCategories(prev => prev.map(c => c.id === editingCategory.id ? response.data : c));
                setEditingCategory(null);
                setSuccess('Category updated successfully!');
            } catch (err) {
                const error = err as AxiosError<ErrorResponse>;
                console.error('Edit Category Error:', error.response?.data || error.message);
                setError(error.response?.data?.error || 'Failed to edit category.');
            } finally {
                setLoading(false);
            }
        }
    };

    const deleteCategory = async (id: number) => {
        try {
            setLoading(true);
            await axiosInstance.delete(`/api/categories/${id}`);
            setCategories(prev => prev.filter(c => c.id !== id));
            setSuccess('Category deleted successfully!');
        } catch (err) {
            const error = err as AxiosError<ErrorResponse>;
            console.error('Delete Category Error:', error.response?.data || error.message);
            setError(error.response?.data?.error || 'Failed to delete category.');
        } finally {
            setLoading(false);
        }
    };

    const addFood = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const token = localStorage.getItem('token');
        if (!token) {
            setError('User not authenticated.');
            return;
        }
        const decoded: { id: number } = JSON.parse(atob(token.split('.')[1]));
        const formData = new FormData(e.currentTarget);
        const macros: FoodMacro[] = goals.map(goal => {
            const value = formData.get(goal.macro_name) as string;
            return {
                macro_name: goal.macro_name.toLowerCase(),
                value: value ? Math.max(0, parseFloat(value)) : 0, // Prevent negative values
                unit: goal.unit,
            };
        });

        const foodData = {
            user_id: decoded.id,
            name: formData.get('name') as string,
            serving_size: formData.get('serving_size') as string,
            category: formData.get('category') as string,
            macros,
        };

        if (foodData.name && foodData.serving_size && foodData.category) {
            try {
                setLoading(true);
                const response = await axiosInstance.post<Food>('/api/foods/foods', foodData);
                console.log('Add Food Response:', response.data);
                setFoods(prevFoods => [...prevFoods, response.data]);
                await fetchFoods();
                setShowAddModal(false);
                setSuccess('Food added successfully!');
            } catch (err) {
                const error = err as AxiosError<ErrorResponse>;
                console.error('Add Food Error:', error.response?.data || error.message);
                setError(error.response?.data?.error || 'Failed to add food.');
            } finally {
                setLoading(false);
            }
        } else {
            setError('Please fill in all required fields.');
        }
    };

    const editFood = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingFood) return;
        const token = localStorage.getItem('token');
        if (!token) {
            setError('User not authenticated.');
            return;
        }
        const decoded: { id: number } = JSON.parse(atob(token.split('.')[1]));
        const formData = new FormData(e.currentTarget);
        const macros: FoodMacro[] = goals.map(goal => {
            const value = formData.get(goal.macro_name) as string;
            return {
                macro_name: goal.macro_name.toLowerCase(),
                value: value ? Math.max(0, parseFloat(value)) : 0, // Prevent negative values
                unit: goal.unit,
            };
        });

        const updatedFood = {
            user_id: decoded.id,
            name: formData.get('name') as string,
            serving_size: formData.get('serving_size') as string,
            category: formData.get('category') as string,
            macros,
        };

        try {
            setLoading(true);
            console.log('Editing food with id:', editingFood.id, 'for user_id:', decoded.id);
            const response = await axiosInstance.put<Food>(`/api/foods/foods/${editingFood.id}`, updatedFood);
            setFoods(prevFoods => prevFoods.map(f => (f.id === editingFood.id ? response.data : f)));
            await fetchFoods();
            setShowEditModal(false);
            setEditingFood(null);
            setSuccess('Food updated successfully!');
        } catch (err) {
            const error = err as AxiosError<ErrorResponse>;
            console.error('Edit Food Error:', error.response?.data || error.message);
            setError(error.response?.data?.error || 'Failed to edit food.');
        } finally {
            setLoading(false);
        }
    };

    const confirmDelete = (id: number) => {
        setFoodToDelete(id);
        setShowDeleteModal(true);
    };

    const deleteFood = async () => {
        if (foodToDelete === null) return;
        const token = localStorage.getItem('token');
        if (!token) {
            setError('User not authenticated.');
            return;
        }
        const decoded: { id: number } = JSON.parse(atob(token.split('.')[1]));
        try {
            setLoading(true);
            console.log('Deleting food with id:', foodToDelete, 'for user_id:', decoded.id); // Add this log
            await axiosInstance.delete(`/api/foods/foods/${foodToDelete}`, {
                params: { user_id: decoded.id },
            });
            setFoods(prevFoods => prevFoods.filter(f => f.id !== foodToDelete));
            await fetchFoods();
            setShowDeleteModal(false);
            setFoodToDelete(null);
            setSuccess('Food deleted successfully!');
        } catch (err) {
            const error = err as AxiosError<ErrorResponse>;
            console.error('Delete Food Error:', error.response?.data || error.message);
            setError(error.response?.data?.error || 'Failed to delete food.');
        } finally {
            setLoading(false);
        }
    };

    const toggleRow = (id: number) => {
        setExpandedRows(prev => prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]);
    };

    const filteredFoods = useMemo(() => {
        console.log('Filtering foods:', { searchTerm, selectedCategory, totalFoods: foods.length });
        const filtered = foods.filter(food => {
            const matchesCategory = !selectedCategory || food.category === selectedCategory;
            const matchesSearch = !searchTerm || food.name.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCategory && matchesSearch;
        });
        console.log('Filtered foods:', filtered);
        return filtered;
    }, [foods, selectedCategory, searchTerm]);

    const getMacroValue = (food: Food, macroName: string) => {
        const macro = food.macros.find(m => m.macro_name === macroName.toLowerCase());
        return macro ? macro.value : 'N/A';
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const maxMacros = 10;
    const displayedMacros = goals.slice(0, maxMacros).map(goal => goal.macro_name.toLowerCase());

    return (
        <div className="food-maintenance">
            <div className="mobile-nav">
                <MenuIcon className="hamburger-menu" onClick={() => setIsMenuOpen(!isMenuOpen)} />
                {isMenuOpen && (
                    <div className="nav-menu">
                        <ul>
                            <li onClick={() => { navigate('/dashboard'); setIsMenuOpen(false); }}>Dashboard</li>
                            <li onClick={() => { navigate('/food-maintenance'); setIsMenuOpen(false); }}>Food Maintenance</li>
                            <li onClick={() => { navigate('/logs'); setIsMenuOpen(false); }}>Logs</li>
                            <li onClick={() => { handleLogout(); setIsMenuOpen(false); }}>Logout</li>
                        </ul>
                    </div>
                )}
            </div>
            <h1>Food Maintenance</h1>
            {loading && <div className="loading">Loading...</div>}
            {success && (
                <div className="success-message">
                    {success}
                    <button onClick={() => setSuccess('')}>Dismiss</button>
                </div>
            )}
            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError('')}>Dismiss</button>
                </div>
            )}
            <div className="card-food-maintenance">
                <button className="button-with-icon" onClick={() => setShowAddModal(true)}>
                    Add New Food
                </button>
                <div className="filter-section">
                    <label>Filter by Category</label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="category-filter"
                    >
                        <option value="">All</option>
                        {categories.map(category => (
                            <option key={category.id} value={category.name}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="search-section">
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => {
                            console.log('Search term changed:', e.target.value);
                            setSearchTerm(e.target.value);
                        }}
                        className="search-box"
                    />
                </div>
            </div>
            <div className="card-food-maintenance">
                <h2>Food List</h2>
                <div className="food-table">
                    <div className="food-table-header" style={{ gridTemplateColumns: `2fr 1fr ${displayedMacros.map(() => '1fr').join(' ')} 1fr 2.5fr` }}>
                        <span>Name</span>
                        <span>Serving</span>
                        {displayedMacros.map(macro => (
                            <span key={macro}>
                                {macro.charAt(0).toUpperCase() + macro.slice(1)} ({goals.find(g => g.macro_name.toLowerCase() === macro)?.unit || 'g'})
                            </span>
                        ))}
                        <span>Category</span>
                        <span>Actions</span>
                    </div>
                    {filteredFoods.map((food) => (
                        <div key={food.id} className={`food-table-row ${expandedRows.includes(food.id) ? 'expanded' : ''}`} style={{ gridTemplateColumns: `2fr 1fr ${displayedMacros.map(() => '1fr').join(' ')} 1fr 2.5fr` }}>
                            <span>{food.name}</span>
                            <span>{food.serving_size}</span>
                            {displayedMacros.map(macro => (
                                <span key={macro}>{getMacroValue(food, macro)}</span>
                            ))}
                            <span>{food.category}</span>
                            <span>
                                <EditIcon
                                    className="edit-icon"
                                    onClick={() => {
                                        setEditingFood(food);
                                        setShowEditModal(true);
                                    }}
                                    style={{ cursor: 'pointer', color: '#f39c12', marginRight: '5px', fontSize: '1rem' }}
                                />
                                <DeleteIcon
                                    className="delete-icon"
                                    onClick={() => confirmDelete(food.id)}
                                    style={{ cursor: 'pointer', color: '#e74c3c', fontSize: '1rem' }}
                                />
                                {window.innerWidth <= 767 && (
                                    <ExpandMoreIcon
                                        className="expand-icon"
                                        onClick={() => toggleRow(food.id)}
                                        style={{ cursor: 'pointer', color: '#2c3e50', fontSize: '1rem' }}
                                    />
                                )}
                            </span>
                            {expandedRows.includes(food.id) && window.innerWidth <= 767 && (
                                <div className="mobile-details">
                                    {displayedMacros.map(macro => (
                                        <div key={macro} className="macro-detail">
                                            <span>{macro.charAt(0).toUpperCase() + macro.slice(1)} ({goals.find(g => g.macro_name.toLowerCase() === macro)?.unit || 'g'}):</span>
                                            <span>{getMacroValue(food, macro)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {showAddModal && (
                <>
                    <div className="modal-backdrop" onClick={() => setShowAddModal(false)} />
                    <div className="modal" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                        <h3>Add Food</h3>
                        <form onSubmit={addFood}>
                            <label>
                                Name
                                <input type="text" name="name" required />
                            </label>
                            <label>
                                Serving Size
                                <input type="text" name="serving_size" required />
                            </label>
                            {goals.map(goal => (
                                <div key={goal.macro_name}>
                                    <label>{goal.macro_name} ({goal.unit}):</label>
                                    <input
                                        type="number"
                                        name={goal.macro_name}
                                        min="0"
                                        step="0.1" // Allow decimal values with 1 decimal place
                                        defaultValue="0"
                                        required
                                        onFocus={(e) => {
                                            if (e.target.value === '0') {
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                </div>
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
                            <button type="button" onClick={() => setShowAddModal(false)}>Cancel</button>
                        </form>
                    </div>
                </>
            )}

            {showEditModal && editingFood && (
                <>
                    <div className="modal-backdrop" onClick={() => setShowEditModal(false)} />
                    <div className="modal" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
                        <h3>Edit Food</h3>
                        <form onSubmit={editFood}>
                            <label>
                                Name
                                <input type="text" name="name" defaultValue={editingFood.name} required />
                            </label>
                            <label>
                                Serving Size
                                <input type="text" name="serving_size" defaultValue={editingFood.serving_size} required />
                            </label>
                            {goals.map(goal => {
                                const macro = editingFood.macros.find(m => m.macro_name.toLowerCase() === goal.macro_name.toLowerCase());
                                return (
                                    <div key={goal.macro_name}>
                                        <label>{goal.macro_name} ({goal.unit}):</label>
                                        <input
                                            type="number"
                                            name={goal.macro_name}
                                            min="0"
                                            step="0.1" // Allow decimal values
                                            defaultValue={macro ? macro.value : '0'}
                                            required
                                            onFocus={(e) => {
                                                if (e.target.value === '0') {
                                                    e.target.value = '';
                                                }
                                            }}
                                        />
                                    </div>
                                );
                            })}
                            <label>
                                Category
                                <select name="category" defaultValue={editingFood.category} required>
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
                            <button type="submit">Save</button>
                            <button type="button" onClick={() => setShowEditModal(false)}>Cancel</button>
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
                                        onChange={(e) => setNewCategory(e.target.value)}
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
                                                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
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

            {showDeleteModal && (
                <>
                    <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)} />
                    <div className="modal">
                        <h3>Confirm Delete</h3>
                        <p>Are you sure you want to delete this food? This action cannot be undone.</p>
                        <button className="delete-btn" onClick={deleteFood}>Yes, Delete</button>
                        <button className="cancel-btn" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                    </div>
                </>
            )}
        </div>
    );
};

export default FoodMaintenance;
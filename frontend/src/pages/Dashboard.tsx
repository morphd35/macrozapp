import React, { useState, useEffect, useCallback, useContext, useMemo, useRef } from 'react';
import { AxiosError } from 'axios';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import SearchIcon from '@mui/icons-material/Search';
import InfoIcon from '@mui/icons-material/Info';
import { jwtDecode } from 'jwt-decode';
import axiosInstance from '../utils/axiosConfig';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import FoodLookup, { FoodLookupRef } from '../FoodLookup';
import { FoodItem } from '../types';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../App.css';

interface ErrorResponse {
    error?: string;
    details?: string;
}

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
    user_id: number;
    name: string;
    serving_size: string;
    category: string;
    macros: FoodMacro[];
    custom?: boolean;
    foodId?: string;
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

const debounce = (func: (...args: any[]) => void, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

const Dashboard: React.FC = () => {
    const { user, token, refreshUser } = useContext(AuthContext);
    const location = useLocation();
    const navigate = useNavigate();
    const stableUser = useMemo(() => user, [user?.id, user?.isPaid, user?.isPaidOneTime]);
    const stableToken = useMemo(() => token, [token ? JSON.stringify(token) : token]);
    const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
    const [goals, setGoals] = useState<MacroGoal[]>([]);
    const [logDate, setLogDate] = useState<string>(() => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });
    // Restore the diary date after returning from the mobile-first Add Food screen.
    useEffect(() => {
        const state = location.state as { logDate?: string; foodLogged?: boolean } | null;
        if (state?.logDate && /^\d{4}-\d{2}-\d{2}$/.test(state.logDate)) {
            setLogDate(state.logDate);
        }
        if (state?.foodLogged) {
            toast.success("Food logged successfully!");
            navigate(location.pathname, { replace: true, state: { logDate: state.logDate } });
        }
    }, [location.state, location.pathname, navigate]);
    const [success, setSuccess] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
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
    const [error, setError] = useState<string | null>('');
    const [customFoodMacros, setCustomFoodMacros] = useState<{ [key: string]: number }>({});
    const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [dashboardSearchQuery, setDashboardSearchQuery] = useState<string>('');
    const [hasFetchedInitialData, setHasFetchedInitialData] = useState(false);
    const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
    const foodLookupRef = useRef<FoodLookupRef>(null);
    const [showFoodDetailsModal, setShowFoodDetailsModal] = useState(false);
    const [selectedFoodDetails, setSelectedFoodDetails] = useState<Food | FoodItem | null>(null);
    const [foodDetailsNutrients, setFoodDetailsNutrients] = useState<any>(null);
    const [foodDetailsServings, setFoodDetailsServings] = useState<number>(1);
    const [foodDetailsWeight, setFoodDetailsWeight] = useState<number>(100);
    const [foodQuery, setFoodQuery] = useState<string>('');
    const [edamamError, setEdamamError] = useState<string | null>(null);
    const [shouldLog, setShouldLog] = useState(true);

    // Type guard to narrow FoodItem
    function isFoodItem(item: Food | FoodItem): item is FoodItem {
        return 'label' in item;
    }

    // Focus the input when the modal opens
    useEffect(() => {
        if (showLogModal && foodLookupRef.current) {
            foodLookupRef.current.focusInput();
        }
    }, [showLogModal]);

    // Determine user status
    const userStatus = useMemo(() => {
        if (stableUser?.isPaid) return 'subscribed';
        if (stableUser?.isPaidOneTime) return 'onetime';
        return 'free';
    }, [stableUser]);

    // AdSense and upgrade prompt logic
    useEffect(() => {
        if (userStatus === 'free') {
            try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                setTimeout(() => setShowUpgradePrompt(true), 5000);
            } catch (e) {
                console.error('AdSense error:', e);
            }
        }
    }, [userStatus]);

    useEffect(() => {
        if (token) {
            try {
                const decoded: { id: number; username: string } = jwtDecode(token);
                setUserId(decoded.id);
                console.log('Set userId from token:', decoded.id);
                localStorage.setItem('user_id', decoded.id.toString());
            } catch (err) {
                console.error('Error decoding token:', err);
                setError('Invalid token. Please log in again.');
                localStorage.removeItem('token');
                localStorage.removeItem('user_id');
                setUserId(null);
                setGoals([]);
                setDailySummary(null);
            }
        } else {
            setError('No token found. Please log in.');
            setUserId(null);
            setGoals([]);
            setDailySummary(null);
        }
    }, [token]);



    const fetchDailySummary = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const url = `/api/food_logs/${userId}/${logDate}`;
            console.log('Fetching daily summary from:', url);
            const res = await axiosInstance.post<DailySummary>(url, {});
            console.log('Raw Daily Summary Response:', res.data);
            const parsedSummary = res.data && typeof res.data === 'object' ? res.data : {};
            setDailySummary(parsedSummary);
            setError(null);
        } catch (err) {
            const error = err as AxiosError<ErrorResponse>;
            console.error('Fetch Summary Error:', error.response?.data || error.message);
            setDailySummary({});
            setError(error.response?.data?.error || 'Failed to fetch daily summary.');
        } finally {
            setLoading(false);
        }
    }, [userId, logDate]);

    const fetchGoals = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const res = await axiosInstance.get<MacroGoal[]>(`/api/food_logs/goals/${userId}`);
            setGoals(res.data || []);
            const initialMacros = res.data.reduce((acc, goal) => {
                acc[goal.macro_name] = 0;
                return acc;
            }, {} as { [key: string]: number });
            setCustomFoodMacros(initialMacros);
        } catch (err) {
            const error = err as AxiosError<ErrorResponse>;
            console.error('Fetch Goals Error:', error.response?.data || error.message);
            setGoals([]);
            setError(error.response?.data?.error || 'Failed to fetch goals.');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const fetchFoods = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const res = await axiosInstance.get<Food[]>('/api/food_logs/foods', {
                params: { user_id: userId },
            });
            setFoods(res.data);
        } catch (err) {
            const error = err as AxiosError<ErrorResponse>;
            console.error('Fetch Foods Error:', error.response?.data || error.message);
            setError(error.response?.data?.error || 'Failed to fetch foods.');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get<Category[]>('/api/categories');
            setCategories(res.data);
        } catch (err) {
            console.error('Fetch Categories Error:', err);
            setCategories([]);
            setError('Failed to fetch categories.');
        } finally {
            setLoading(false);
        }
    }, []);
    // Memoize the debounced fetchDailySummary to prevent recreation
    const debouncedFetchDailySummary = useMemo(() => debounce(fetchDailySummary, 300), [fetchDailySummary]);

    // Fetch initial data only once when userId and logDate change
    useEffect(() => {
        if (userId) {
            console.log('UserId before fetching data:', userId, 'logDate:', logDate);
            debouncedFetchDailySummary();
            if (!hasFetchedInitialData) {
                fetchGoals();
                fetchFoods();
                fetchCategories();
                setHasFetchedInitialData(true);
            }
        } else {
            console.log('No userId, skipping data fetch');
            setGoals([]);
            setDailySummary(null);
        }
    }, [debouncedFetchDailySummary, fetchGoals, fetchFoods, fetchCategories, userId, logDate]);

    // Refetch user data if payment was just verified
    useEffect(() => {
        if (location.state?.paymentVerified && token) {
            refreshUser();
            navigate(location.pathname, { state: { ...location.state, paymentVerified: false }, replace: true });
        }
    }, [location.state, token, refreshUser, navigate]);

    const addCategory = async () => {
        if (newCategory.trim()) {
            try {
                const res = await axiosInstance.post<Category>('/api/categories', { name: newCategory });
                setCategories(prev => [...prev, res.data]);
                setNewCategory('');
                setSuccess('Category added successfully!');
            } catch (err) {
                const error = err as AxiosError<ErrorResponse>;
                console.error('Add Category Error:', error.response?.data || error.message);
                setError(error.response?.data?.error || 'Failed to add category.');
            }
        }
    };

    const editCategory = async () => {
        if (editingCategory && editingCategory.name.trim()) {
            try {
                const res = await axiosInstance.put<Category>(
                    `/api/categories/${editingCategory.id}`,
                    { name: editingCategory.name }
                );
                setCategories(prev => prev.map(c => (c.id === editingCategory.id ? res.data : c)));
                setEditingCategory(null);
                setSuccess('Category updated successfully!');
            } catch (err) {
                const error = err as AxiosError<ErrorResponse>;
                console.error('Edit Category Error:', error.response?.data || error.message);
                setError(error.response?.data?.error || 'Failed to edit category.');
            }
        }
    };

    const deleteCategory = async (id: number) => {
        try {
            await axiosInstance.delete(`/api/categories/${id}`);
            setCategories(prev => prev.filter(c => c.id !== id));
            setSuccess('Category deleted successfully!');
        } catch (err) {
            const error = err as AxiosError<ErrorResponse>;
            console.error('Delete Category Error:', error.response?.data || error.message);
            setError(error.response?.data?.error || 'Failed to delete category.');
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
            setShowLogWeightModal(false);
            setWeight(0);
            setSuccess('Weight logged successfully!');
        } catch (err) {
            const error = err as AxiosError<ErrorResponse>;
            console.error('Log Weight Error:', error.response?.data || error.message);
            setError(error.response?.data?.error || 'Failed to log weight.');
        }
    };

    const addCustomFood = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!userId) return;
        const formData = new FormData(e.currentTarget);
        const foodName = formData.get('name') as string;
        const servingSize = formData.get('serving_size') as string;
        const category = formData.get('category') as string;

        if (foodName && servingSize && category) {
            try {
                const macros = goals.map(goal => ({
                    macro_name: goal.macro_name.toLowerCase().replace(/\s+/g, '_'),
                    value: customFoodMacros[goal.macro_name] || 0,
                    unit: goal.unit,
                }));

                const res = await axiosInstance.post<Food>('/api/food_logs/foods', {
                    user_id: userId,
                    name: foodName,
                    serving_size: servingSize,
                    category,
                    macros,
                });
                const newFood = { ...res.data, custom: true };
                setFoods(prevFoods => [...prevFoods, { ...res.data, custom: true }]);
                await fetchFoods();
                setShowAddFoodModal(false);
                setCustomFoodMacros(goals.reduce((acc, goal) => {
                    acc[goal.macro_name] = 0;
                    return acc;
                }, {} as { [key: string]: number }));
                setSuccess('Food added successfully!');
            } catch (err) {
                const error = err as AxiosError<ErrorResponse>;
                console.error('Add Food Error:', error.message, error.response?.data);
                setError(error.response?.data?.error || 'Failed to add food.');
            }
        } else {
            setError('Please fill in all required fields.');
        }
    };

    const parseQuery = (query: string) => {
        const ozMatch = query.match(/(\d*\.?\d+|\d+\/\d+)\s*oz/i);
        const cupMatch = query.match(/(\d*\.?\d+|\d+\/\d+)\s*cup/i);

        if (ozMatch) {
            const amount = ozMatch[1].includes('/') ? eval(ozMatch[1]) : parseFloat(ozMatch[1]);
            const foodName = query.replace(ozMatch[0], '').trim();
            return { unit: 'oz', amount, foodName };
        } else if (cupMatch) {
            const amount = cupMatch[1].includes('/') ? eval(cupMatch[1]) : parseFloat(cupMatch[1]);
            const foodName = query.replace(cupMatch[0], '').trim();
            return { unit: 'cup', amount, foodName };
        }
        return { unit: null, amount: null, foodName: query.trim() };
    };

    const logFood = async (food: Food | FoodItem, servings: number = 1) => {
        if (!food || !userId) {
            toast.error('Please select a food and ensure you are logged in.');
            return;
        }

        const finalServings = Math.max(0.1, servings);

        try {
            let foodToLog: Food;

            if ('id' in food && food.id && food.id > 0) {
                foodToLog = food as Food;
            } else {
                const foodItem = food as FoodItem;
                const foodMacros = 'macros' in food ? (food as Food).macros : null;
                const foodNutrients = 'nutrients' in food ? (food as FoodItem).nutrients : null;

                const macros = foodMacros || (foodNutrients ? [
                    { macro_name: 'calories', value: foodNutrients.calories || 0, unit: 'kcal' },
                    { macro_name: 'protein', value: foodNutrients.protein || 0, unit: 'g' },
                    { macro_name: 'carbs', value: foodNutrients.carbs || 0, unit: 'g' },
                    { macro_name: 'fats', value: foodNutrients.fats || 0, unit: 'g' },
                    ...(foodNutrients.sugars ? [{ macro_name: 'sugars', value: foodNutrients.sugars, unit: 'g' }] : []),
                    ...(foodNutrients.sodium ? [{ macro_name: 'sodium', value: foodNutrients.sodium, unit: 'mg' }] : []),
                ] : []);

                const newFoodData = {
                    user_id: userId,
                    name: foodItem.label ? foodItem.label.split(' - ')[0] : (food as Food).name.split(' - ')[0] || 'Unknown Food',
                    serving_size: foodItem.serving_size || (food as Food).serving_size || '1 serving',
                    category: foodItem.category || (food as Food).category || 'Generic',
                    macros,
                };

                const response = await axiosInstance.post<Food>('/api/food_logs/foods', newFoodData);
                foodToLog = { ...response.data, custom: true, foodId: foodItem.foodId };
                setFoods(prevFoods => [...prevFoods, foodToLog]);
            }

            await axiosInstance.post('/api/food_logs/food_logs', {
                user_id: userId,
                food_id: foodToLog.id,
                servings: finalServings,
                log_date: logDate,
            });

            await fetchDailySummary();
            setShowLogModal(false);
            setSelectedFood(null);
            setServings(1);
            setSearchResults([]);
            setFoodQuery('');
            setEdamamError(null);
            toast.success('Food logged successfully!');
        } catch (err) {
            const error = err as AxiosError<ErrorResponse>;
            console.error('Log Food Error:', error.response?.data || error.message);
            toast.error(error.response?.data?.error || 'Failed to log food.');
        }
    };

    const handleMacroChange = (macroName: string, value: number) => {
        setCustomFoodMacros(prev => ({
            ...prev,
            [macroName]: Math.max(0, value),
        }));
    };

    const fetchFoodDetails = async (food: FoodItem) => {
        try {
            const { unit, amount } = parseQuery(food.label);
            let targetQuantity = 1;
            let targetMeasure = 'serving';

            const defaultMeasure = food.measures?.find(measure => measure.label === 'Serving') || food.measures?.[0];
            const baseWeightGrams = defaultMeasure ? defaultMeasure.weight : 100;

            if (unit === 'oz' && amount) {
                targetQuantity = amount;
                targetMeasure = 'ounce';
            } else if (unit === 'cup' && amount) {
                targetQuantity = amount;
                targetMeasure = 'cup';
            }

            const payload = {
                foodId: food.foodId,
                quantity: targetQuantity,
                measure: targetMeasure,
                userId,
            };

            console.log('Fetching food details with payload:', payload, 'fetchAll=true');

            const responseAll = await axiosInstance.post<{
                foodId: string;
                name: string;
                serving_size: string;
                category: string;
                macros: any[];
                totalWeight: number;
                totalNutrients: any;
            }>(`/api/premium_1/food-nutrients?fetchAll=true`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            console.log('Food details (all nutrients) response:', responseAll.data);

            const responseGoals = await axiosInstance.post<{
                foodId: string;
                name: string;
                serving_size: string;
                category: string;
                macros: FoodMacro[];
                totalWeight: number;
                totalNutrients?: any;
            }>(`/api/premium_1/food-nutrients?fetchAll=false`, {
                foodId: food.foodId,
                quantity: targetQuantity,
                measure: targetMeasure,
                userId,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            console.log('Food details (goal-based macros) response:', responseGoals.data);

            const foodWithMacros: Food = {
                id: -1,
                user_id: userId!,
                name: responseGoals.data.name,
                serving_size: responseGoals.data.serving_size,
                category: responseGoals.data.category,
                macros: responseGoals.data.macros,
                custom: false,
                foodId: food.foodId,
            };

            const nutrientsToDisplay = responseAll.data.totalNutrients && Object.keys(responseAll.data.totalNutrients).length > 0
                ? responseAll.data.totalNutrients
                : responseGoals.data.macros.reduce((acc: { [key: string]: { label: string; quantity: number; unit: string } }, macro: FoodMacro) => {
                    acc[macro.macro_name.toUpperCase()] = {
                        label: macro.macro_name,
                        quantity: macro.value,
                        unit: macro.unit,
                    };
                    return acc;
                }, {});

            setFoodDetailsNutrients(nutrientsToDisplay);
            setSelectedFoodDetails(foodWithMacros);
            setFoodDetailsWeight(baseWeightGrams);
            setShowFoodDetailsModal(true);
        } catch (err) {
            const error = err as AxiosError<ErrorResponse>;
            console.error('Error fetching food details:', error.response?.data || error.message);
            setError(error.response?.data?.error || 'Failed to fetch food details.');
            setShowFoodDetailsModal(false);
            setSelectedFoodDetails(null);
            setFoodDetailsNutrients(null);
            setFoodDetailsWeight(100);
        }
    };

    const logFoodFromDetails = async () => {
        if (!selectedFoodDetails) return;
        await logFood(selectedFoodDetails, foodDetailsServings);
        setShowFoodDetailsModal(false);
        setSelectedFoodDetails(null);
        setFoodDetailsNutrients(null);
        setFoodDetailsServings(1);
    };

    const handleSearchResults = useCallback((results: FoodItem[], query: string) => {
        const uniqueResults = Array.from(
            new Map(results.map(item => [`${item.foodId}-${item.label}`, item])).values()
        );

        const filteredResults = uniqueResults.filter(item => {
            const hasNutrients = Object.values(item.nutrients).some(value => value !== undefined && value > 0);
            const defaultMeasure = item.measures?.find(measure => measure.label === 'Serving') || item.measures?.[0];
            const baseWeightGrams = defaultMeasure ? defaultMeasure.weight : 100;
            return hasNutrients && baseWeightGrams > 0;
        });

        if (filteredResults.length === 0) {
            if (!query.trim()) {
                setEdamamError('Please enter a food to search.');
            } else if (query.trim().length < 3) {
                setEdamamError('Query too short. Enter at least 3 characters to search Edamam.');
            } else {
                setEdamamError('No foods found in Edamam. Check spelling or try a different term.');
            }
        } else {
            setEdamamError(null);
        }

        const convertedResults = filteredResults.map((item: FoodItem) => {
            const defaultMeasure = item.measures?.find(measure => measure.label === 'Serving') || item.measures?.[0];
            const baseWeightGrams = defaultMeasure ? defaultMeasure.weight : 100;
            const baseOunces = baseWeightGrams * 0.035274;
            const { unit, amount } = parseQuery(query);

            let targetAmount: number, targetUnit: string, targetGrams: number, scaleFactor: number, displayLabel: string;

            if (unit === 'oz' && amount) {
                targetAmount = amount;
                targetUnit = 'oz';
                targetGrams = amount / 0.035274;
                scaleFactor = targetGrams / baseWeightGrams;
                displayLabel = `${item.label} (${amount} oz)`;
            } else if (unit === 'cup' && amount) {
                targetAmount = amount;
                targetUnit = 'cup';
                targetGrams = amount * 240;
                scaleFactor = targetGrams / baseWeightGrams;
                displayLabel = `${item.label} (${amount} cup, ${(targetGrams * 0.035274).toFixed(1)} oz)`;
            } else {
                targetAmount = 1;
                targetUnit = 'serving';
                targetGrams = baseWeightGrams;
                scaleFactor = 1;
                displayLabel = `${item.label} (1 serving, ${(baseWeightGrams * 0.035274).toFixed(1)} oz)`;
            }

            const scaledNutrients = {
                calories: (item.nutrients.calories || 0) * scaleFactor,
                protein: (item.nutrients.protein || 0) * scaleFactor,
                carbs: (item.nutrients.carbs || 0) * scaleFactor,
                fats: (item.nutrients.fats || 0) * scaleFactor,
                sugars: item.nutrients.sugars ? item.nutrients.sugars * scaleFactor : undefined,
                water_intake: item.nutrients.water_intake ? item.nutrients.water_intake * scaleFactor : undefined,
                sodium: item.nutrients.sodium ? item.nutrients.sodium * scaleFactor : undefined,
                cholesterol: item.nutrients.cholesterol ? item.nutrients.cholesterol * scaleFactor : undefined,
                potassium: item.nutrients.potassium ? item.nutrients.potassium * scaleFactor : undefined,
                calcium: item.nutrients.calcium ? item.nutrients.calcium * scaleFactor : undefined,
                caffeine: item.nutrients.caffeine ? item.nutrients.caffeine * scaleFactor : undefined,
            };

            let preparationState = '';
            if (item.category?.toLowerCase().includes('cooked') || query.toLowerCase().includes('cooked')) {
                preparationState = 'Cooked';
            } else if (item.category?.toLowerCase().includes('raw') || item.category?.toLowerCase().includes('uncooked')) {
                preparationState = 'Uncooked';
            } else if (scaledNutrients.calories > 300 && targetGrams <= 113.398) {
                preparationState = 'Uncooked';
            } else {
                preparationState = 'Cooked';
            }

            return {
                ...item,
                label: preparationState ? `${item.label} (${preparationState})` : item.label,
                serving_size: `${targetAmount} ${targetUnit}`,
                weight: targetGrams,
                nutrients: scaledNutrients,
                displayLabel: preparationState ? `${displayLabel} (${preparationState})` : displayLabel,
            };
        });

        setSearchResults(convertedResults as FoodItem[]);
    }, []);

    const memoizedUserFoods = useMemo(() => {
        return foods.map(food => {
            const mappedFood = {
                foodId: food.id.toString(),
                label: food.name,
                category: food.category,
                nutrients: {
                    calories: food.macros.find(m => m.macro_name === 'calories')?.value || 0,
                    protein: food.macros.find(m => m.macro_name === 'protein')?.value || 0,
                    carbs: food.macros.find(m => m.macro_name === 'carbs')?.value || 0,
                    fats: food.macros.find(m => m.macro_name === 'fats')?.value || 0,
                    sugars: food.macros.find(m => m.macro_name === 'sugars')?.value || 0,
                    water_intake: food.macros.find(m => m.macro_name === 'water_intake')?.value || 0,
                    sodium: food.macros.find(m => m.macro_name === 'sodium')?.value || 0,
                    cholesterol: food.macros.find(m => m.macro_name === 'cholesterol')?.value || 0,
                    potassium: food.macros.find(m => m.macro_name === 'potassium')?.value || 0,
                    calcium: food.macros.find(m => m.macro_name === 'calcium')?.value || 0,
                    caffeine: food.macros.find(m => m.macro_name === 'caffeine')?.value || 0,
                },
                serving_size: food.serving_size,
                custom: true,
            };
            return mappedFood;
        });
    }, [foods]);

    const filteredLocalFoods = useMemo(() => {
        if (!foodQuery.trim()) {
            return memoizedUserFoods.map(food => ({
                ...food,
                source: 'local' as const,
            }));
        }
        return memoizedUserFoods
            .filter(food => food.label.toLowerCase().includes(foodQuery.toLowerCase()))
            .map(food => ({
                ...food,
                source: 'local' as const,
            }));
    }, [foodQuery, memoizedUserFoods]);

    const handleFoodSelect = async (data: FoodItem) => {
        console.log('handleFoodSelect called with data:', data);
        const { foodId, label, category, custom, source, serving_size, measures } = data;
        if (!userId) {
            console.error('No userId available for selecting food');
            setError('User not authenticated. Please log in again.');
            return;
        }

        try {
            const existingFood = foods.find(f => f.user_id === userId && f.name === `${label} (Edamam)`);
            let selected: Food;

            if (existingFood) {
                console.log('Food already exists in user\'s foods:', existingFood);
                selected = existingFood;
            } else {
                const isLocalFood = source === 'local';

                if (isLocalFood) {
                    const response = await axiosInstance.get(`/api/food_logs/foods`, {
                        params: { user_id: userId },
                    });
                    const localFood = response.data.find((f: Food) => f.id === parseInt(foodId));
                    if (!localFood) {
                        throw new Error('Local food not found in database');
                    }

                    selected = {
                        id: localFood.id,
                        user_id: userId,
                        name: localFood.name,
                        serving_size: localFood.serving_size,
                        category: localFood.category,
                        macros: localFood.macros || [],
                        custom: true,
                        foodId,
                    };
                } else {
                    const { unit, amount } = parseQuery(label);
                    let targetQuantity = 1;
                    let targetMeasure = 'serving';

                    const defaultMeasure = measures?.find(measure => measure.label === 'Serving') || measures?.[0];
                    const defaultWeightGrams = defaultMeasure ? defaultMeasure.weight : 100;

                    if (unit === 'oz' && amount) {
                        targetQuantity = amount;
                        targetMeasure = 'ounce';
                    } else if (unit === 'cup' && amount) {
                        targetQuantity = amount;
                        targetMeasure = 'cup';
                    } else {
                        targetQuantity = 1;
                        targetMeasure = 'serving';
                    }

                    const nutrientsResponse = await axiosInstance.post<{
                        foodId: string;
                        name: string;
                        serving_size: string;
                        category: string;
                        macros: FoodMacro[];
                        totalWeight: number;
                    }>('/api/premium_1/food-nutrients', {
                        foodId,
                        quantity: targetQuantity,
                        measure: targetMeasure,
                        userId,
                    });

                    const { name, category: fetchedCategory, macros } = nutrientsResponse.data;

                    selected = {
                        id: -1,
                        user_id: userId,
                        name: `${label} (Edamam)`,
                        serving_size: serving_size || '1 serving',
                        category: fetchedCategory || category || 'Generic',
                        macros: macros.map((macro: FoodMacro) => ({
                            macro_name: macro.macro_name.toLowerCase().replace(/\s+/g, '_'),
                            value: macro.value,
                            unit: macro.unit,
                        })),
                        custom: custom || false,
                        foodId,
                    };
                }
            }

            setSelectedFood(selected);
            console.log('Selected food set to:', selected);
        } catch (err) {
            const error = err as AxiosError<ErrorResponse>;
            console.error('Error selecting food:', error.response?.data || error.message);
            setError(error.response?.data?.error || 'Failed to select food.');
        }
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

    const hasNoEntries = dailySummary && Object.keys(dailySummary).length > 0
        ? Object.values(dailySummary).every(val => val === 0 || val === undefined)
        : true;



    if (!userId && !error) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div>
            <h1>MacroZapp</h1>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                            type="text"
                            value={dashboardSearchQuery}
                            onChange={(e) => setDashboardSearchQuery(e.target.value)}
                            onFocus={() => navigate("/app/add-food", { state: { logDate } })}
                            placeholder="Search for a food..."
                            style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                        />
                        <button type="button" onClick={() => navigate("/app/add-food", { state: { logDate } })}>Add Food</button>
                        {stableUser?.isPaid && <button type="button" onClick={() => setShowLogModal(true)}>Edamam lookup</button>}
                    </div>
                    <div>
                        <button className="button-with-icon" onClick={() => setShowLogWeightModal(true)}>
                            <FitnessCenterIcon className="icon" />
                            Log Weight
                        </button>
                    </div>
                </div>
            </div>
            {(() => {
                if (!dailySummary || Object.keys(dailySummary).length === 0 || hasNoEntries) {
                    return <p className="prompt">Start logging your food for today!</p>;
                }
                return (
                    <div className="card">
                        <h2>Daily Totals ({logDate})</h2>
                        {goals.map(goal => {
                            const macroKey = goal.macro_name.toLowerCase().replace(/\s+/g, '_');
                            const currentValue = dailySummary[`total_${macroKey}`] ?? 0;
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
                );
            })()}

            <div>
                {userStatus === 'free' && (
                    <div className="ad-container" style={{ margin: '20px 0' }}>
                        <ins
                            className="adsbygoogle"
                            style={{ display: 'block' }}
                            data-ad-client="ca-pub-6187653588497423"
                            data-ad-slot="2864511065"
                            data-ad-format="auto"
                        />
                    </div>
                )}

                {userStatus === 'free' && showUpgradePrompt && (
                    <div className="upgrade-prompt">
                        <p>Remove ads and unlock premium features!</p>
                        <Link to="/payment-onetime">One-Time Payment ($8.99)</Link>
                        <Link to="/payment">Subscribe ($4.99/mo)</Link>
                        <button onClick={() => setShowUpgradePrompt(false)}>Dismiss</button>
                    </div>
                )}

                {showLogModal && (
                    <>
                        <div className="modal-backdrop" onClick={() => setShowLogModal(false)} />
                        <div className="modal" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '10px' }}>
                            <h3 style={{ marginBottom: '10px' }}>Log Food</h3>
                            <div style={{ flex: '0 0 auto', marginBottom: '10px' }}>
                                {stableUser?.isPaid ? (
                                    <FoodLookup
                                        ref={foodLookupRef}
                                        onSearchResults={handleSearchResults}
                                        userFoods={memoizedUserFoods}
                                        query={foodQuery}
                                        setQuery={setFoodQuery}
                                        error={error}
                                        setError={setError}
                                    />
                                ) : stableUser?.isPaidOneTime ? (
                                    <div className="food-lookup-local">
                                        <input
                                            type="text"
                                            placeholder="Search your local foods..."
                                            value={foodQuery}
                                            onChange={(e) => setFoodQuery(e.target.value)}
                                        />
                                    </div>
                                ) : (
                                    <div className="food-lookup-placeholder">
                                        <input type="text" placeholder="Search for a food (e.g., avocado)" disabled />
                                        <p>Upgrade to Premium for $4.99 to unlock food lookup! <Link to="/payment">Upgrade Now</Link></p>
                                    </div>
                                )}
                            </div>

                            <div style={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {stableUser?.isPaid && (
                                    <div style={{ flex: '0 0 50%', maxHeight: '40vh', overflowY: 'auto', margin: '0' }}>
                                        <h4 style={{ margin: '0 0 10px 0' }}>
                                            {foodQuery.trim() ? `Search Results for "${foodQuery}"` : 'Search Results'}
                                        </h4>
                                        {edamamError ? (
                                            <p style={{ color: '#666' }}>{edamamError}</p>
                                        ) : searchResults.length > 0 ? (
                                            <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                                                {searchResults.map((food) => (
                                                    <li
                                                        key={food.foodId}
                                                        style={{
                                                            padding: '12px',
                                                            borderBottom: '1px solid #eee',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            cursor: 'pointer',
                                                            backgroundColor: selectedFood?.foodId === food.foodId ? '#e0f7fa' : 'transparent',
                                                            transition: 'background-color 0.2s',
                                                        }}
                                                    >
                                                        <div
                                                            style={{ flex: 1 }}
                                                            onClick={() => handleFoodSelect(food)}
                                                        >
                                                            <strong>{food.displayLabel || food.label}</strong> ({food.serving_size || 'Unknown serving size'})
                                                            <div style={{ marginTop: '5px' }}>
                                                                <span style={{ color: 'purple', marginRight: '10px' }}>CLs {food.nutrients.calories.toFixed(1)}</span>
                                                                <span style={{ color: 'pink', marginRight: '10px' }}>P {food.nutrients.protein.toFixed(1)}</span>
                                                                <span style={{ color: 'blue', marginRight: '10px' }}>C {food.nutrients.carbs.toFixed(1)}</span>
                                                                <span style={{ color: 'green', marginRight: '10px' }}>F {food.nutrients.fats.toFixed(1)}</span>
                                                            </div>
                                                        </div>
                                                        <InfoIcon
                                                            style={{ color: '#4a5568', cursor: 'pointer', marginLeft: '10px' }}
                                                            onClick={() => fetchFoodDetails(food)}
                                                        />
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p style={{ color: '#666' }}>
                                                {foodQuery.trim() ? 'Press Enter or click the search icon to search Edamam' : 'Enter a food to search'}
                                            </p>
                                        )}
                                    </div>
                                )}

                                <div style={{ flex: '0 0 50%', maxHeight: '40vh', overflowY: 'auto', margin: '0' }}>
                                    <h4 style={{ margin: '0 0 10px 0' }}>
                                        {foodQuery.trim() ? `Local Foods Matching "${foodQuery}"` : 'Your Local Foods'}
                                    </h4>
                                    {filteredLocalFoods.length > 0 ? (
                                        <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                                            {filteredLocalFoods.map((food) => (
                                                <li
                                                    key={food.foodId}
                                                    style={{
                                                        padding: '12px',
                                                        borderBottom: '1px solid #eee',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        cursor: 'pointer',
                                                        backgroundColor: selectedFood?.foodId === food.foodId ? '#e0f7fa' : 'transparent',
                                                        transition: 'background-color 0.2s',
                                                    }}
                                                    onClick={() => handleFoodSelect(food)}
                                                >
                                                    <div>
                                                        <strong>{food.label}</strong> ({food.serving_size || 'Unknown serving size'})
                                                        <div style={{ marginTop: '5px' }}>
                                                            <span style={{ color: 'purple', marginRight: '10px' }}>CLs {food.nutrients.calories.toFixed(1)}</span>
                                                            <span style={{ color: 'pink', marginRight: '10px' }}>P {food.nutrients.protein.toFixed(1)}</span>
                                                            <span style={{ color: 'blue', marginRight: '10px' }}>C {food.nutrients.carbs.toFixed(1)}</span>
                                                            <span style={{ color: 'green', marginRight: '10px' }}>F {food.nutrients.fats.toFixed(1)}</span>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p style={{ color: '#666' }}>No local foods match your search query.</p>
                                    )}
                                </div>
                            </div>

                            {selectedFood && (
                                <div style={{ margin: '10px 0' }}>
                                    <label>
                                        Number of Servings (1 = {selectedFood.serving_size}):
                                        <input
                                            type="number"
                                            value={servings}
                                            onChange={(e) => {
                                                const newValue = e.target.value;
                                                setServings(newValue === '' ? 0 : Math.max(0.1, parseFloat(newValue) || 0.1));
                                            }}
                                            onFocus={(e) => {
                                                e.target.value = '';
                                                setServings(0);
                                            }}
                                            onBlur={() => {
                                                if (servings === 0) {
                                                    setServings(0.1);
                                                }
                                            }}
                                            step="0.1"
                                            style={{ marginLeft: '10px', padding: '5px', width: '100px' }}
                                        />
                                    </label>
                                </div>
                            )}
                            <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'space-between', paddingTop: '10px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <button
                                        className="button-with-icon"
                                        onClick={() => setShowAddFoodModal(true)}
                                        style={{ backgroundColor: '#26a69a', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px' }}
                                    >
                                        <AddCircleOutlineIcon className="icon" />
                                        Add New Food
                                    </button>
                                    <button
                                        className="button-with-icon"
                                        onClick={() => selectedFood && logFood(selectedFood, servings)}
                                        disabled={!selectedFood}
                                        style={{
                                            backgroundColor: selectedFood ? '#26a69a' : '#bdbdbd',
                                            color: 'white',
                                            border: 'none',
                                            padding: '10px 20px',
                                            borderRadius: '4px',
                                            cursor: selectedFood ? 'pointer' : 'not-allowed',
                                        }}
                                    >
                                        <RestaurantIcon className="icon" />
                                        Log Food
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowLogModal(false);
                                        setFoodQuery('');
                                        setSearchResults([]);
                                        setSelectedFood(null);
                                        setServings(1);
                                        setEdamamError(null);
                                    }}
                                    style={{ backgroundColor: '#bdbdbd', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {showFoodDetailsModal && selectedFoodDetails && (
                    <>
                        <div className="modal-backdrop" onClick={() => {
                            setShowFoodDetailsModal(false);
                            setSelectedFoodDetails(null);
                            setFoodDetailsNutrients(null);
                            setFoodDetailsServings(1);
                            setFoodDetailsWeight(100);
                        }} />
                        <div className="modal" style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '10px' }}>
                            <h3 style={{ marginBottom: '10px' }}>
                                Nutrition Facts: {isFoodItem(selectedFoodDetails) ? (selectedFoodDetails.displayLabel || selectedFoodDetails.label) : selectedFoodDetails.name}
                            </h3>
                            <div style={{ flex: '1 1 auto', overflowY: 'auto', marginBottom: '10px' }}>
                                <p>
                                    <strong>Serving Size:</strong> {isFoodItem(selectedFoodDetails) ? (selectedFoodDetails.serving_size || 'Unknown serving size') : selectedFoodDetails.serving_size} ({(isFoodItem(selectedFoodDetails) ? (selectedFoodDetails.weight ?? foodDetailsWeight) : foodDetailsWeight).toFixed(1)} g)
                                </p>
                                {foodDetailsNutrients ? (
                                    <div>
                                        {Object.entries(foodDetailsNutrients).map(([key, nutrient]: [string, any]) => (
                                            <p key={key}>
                                                <strong>{nutrient.label}:</strong> {nutrient.quantity.toFixed(2)} {nutrient.unit}
                                            </p>
                                        ))}
                                    </div>
                                ) : (
                                    <p>Loading nutrients...</p>
                                )}
                            </div>
                            <div style={{ margin: '10px 0' }}>
                                <label>
                                    Number of Servings (1 = {isFoodItem(selectedFoodDetails) ? (selectedFoodDetails.serving_size || 'Unknown serving size') : selectedFoodDetails.serving_size}):
                                    <input
                                        type="number"
                                        value={foodDetailsServings}
                                        onChange={(e) => {
                                            const newValue = e.target.value;
                                            setFoodDetailsServings(newValue === '' ? 0 : Math.max(0.1, parseFloat(newValue) || 0.1));
                                        }}
                                        onFocus={(e) => {
                                            e.target.value = '';
                                            setFoodDetailsServings(0);
                                        }}
                                        onBlur={() => {
                                            if (foodDetailsServings === 0) {
                                                setFoodDetailsServings(0.1);
                                            }
                                        }}
                                        step="0.1"
                                        style={{ marginLeft: '10px', padding: '5px', width: '100px' }}
                                    />
                                </label>
                            </div>
                            <div style={{ flex: '0 0 auto', display: 'flex', justifyContent: 'space-between', paddingTop: '10px' }}>
                                <button
                                    className="button-with-icon"
                                    onClick={logFoodFromDetails}
                                    style={{
                                        backgroundColor: '#26a69a',
                                        color: 'white',
                                        border: 'none',
                                        padding: '10px 20px',
                                        borderRadius: '4px',
                                    }}
                                >
                                    <RestaurantIcon className="icon" />
                                    Log Food
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowFoodDetailsModal(false);
                                        setSelectedFoodDetails(null);
                                        setFoodDetailsNutrients(null);
                                        setFoodDetailsServings(1);
                                        setFoodDetailsWeight(100);
                                    }}
                                    style={{ backgroundColor: '#bdbdbd', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px' }}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

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
                                    min="0"
                                    onFocus={(e) => {
                                        if (e.target.value === '0') {
                                            e.target.value = '';
                                        }
                                    }}
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
                                        step="0.1"
                                        value={customFoodMacros[goal.macro_name] || 0}
                                        onChange={e => handleMacroChange(goal.macro_name, parseFloat(e.target.value) || 0)}
                                        min="0"
                                        onFocus={(e) => {
                                            if (e.target.value === '0') {
                                                e.target.value = '';
                                            }
                                        }}
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
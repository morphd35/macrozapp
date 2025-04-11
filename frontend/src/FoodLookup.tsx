import React, { useCallback } from 'react';
import axiosInstance from './utils/axiosConfig';
import { AxiosError } from 'axios';
import SearchIcon from '@mui/icons-material/Search';

interface Measure {
    uri: string;
    label: string;
    weight: number;
}

interface FoodItem {
    foodId: string;
    label: string;
    category: string;
    nutrients: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    };
    serving_size?: string;
    source?: 'local' | 'edamam';
    measures?: Measure[];
}

interface FoodLookupProps {
    onSearchResults: (results: FoodItem[], query: string) => void;
    userFoods: FoodItem[];
    query: string;
    setQuery: (query: string) => void;
    error: string | null;
    setError: (error: string | null) => void;
}

const FoodLookup: React.FC<FoodLookupProps> = ({
    onSearchResults,
    userFoods,
    query,
    setQuery,
    error,
    setError,
}) => {
    const fetchEdamamResults = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            onSearchResults([], searchQuery);
            return;
        }
        if (searchQuery.trim().length < 3) {
            onSearchResults([], searchQuery);
            return;
        }

        try {
            setError(null);
            const response = await axiosInstance.get<FoodItem[]>('/api/premium_1/food-lookup', {
                params: { query: searchQuery },
            });
            const apiResults = response.data.map((food: FoodItem) => {
                const isVegetable = food.category?.toLowerCase().includes('vegetable') || food.label?.toLowerCase().includes('bean');
                const isMeat = food.category?.toLowerCase().includes('protein') || food.label?.toLowerCase().includes('chicken') || food.label?.toLowerCase().includes('beef');
                const preferredMeasure = isVegetable
                    ? food.measures?.find(measure => measure.label === 'Cup')
                    : isMeat
                        ? food.measures?.find(measure => measure.label === 'Ounce')
                        : food.measures?.find(measure => measure.label === 'Serving') || food.measures?.[0];
                const servingSize = preferredMeasure ? `${preferredMeasure.weight}g (${preferredMeasure.label})` : '1 serving';

                const defaultWeight = 100;
                const selectedWeight = preferredMeasure ? preferredMeasure.weight : defaultWeight;
                const scalingFactor = selectedWeight / defaultWeight;

                const scaledNutrients = {
                    calories: (food.nutrients?.calories || 0) * scalingFactor,
                    protein: (food.nutrients?.protein || 0) * scalingFactor,
                    carbs: (food.nutrients?.carbs || 0) * scalingFactor,
                    fats: (food.nutrients?.fats || 0) * scalingFactor,
                };

                return {
                    ...food,
                    serving_size: servingSize,
                    nutrients: scaledNutrients,
                    source: 'edamam' as const,
                };
            });

            const uniqueResults = Array.from(
                new Map<string, FoodItem>(apiResults.map(item => [`${item.foodId}-${item.source}`, item])).values()
            ) as FoodItem[];
            onSearchResults(uniqueResults, searchQuery);
        } catch (err) {
            const axiosError = err as AxiosError<{ message?: string }>;
            console.error('Edamam fetch error:', axiosError.response?.data || axiosError.message);
            onSearchResults([], searchQuery);
        }
    }, [onSearchResults, setError]);

    const handleSearch = () => {
        fetchEdamamResults(query); // Trigger search on icon click
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            fetchEdamamResults(query); // Trigger search on Enter
        }
    };

    return (
        <div className="food-lookup">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                    type="text"
                    placeholder="Search for a food (e.g., avocado)..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                />
                <SearchIcon
                    style={{ cursor: 'pointer', color: '#4a5568' }}
                    onClick={handleSearch}
                />
            </div>
        </div>
    );
};

export default FoodLookup;
import React, { useCallback, useState, useEffect } from 'react';
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
    error: string;
    setError: (error: string) => void;
}

const FoodLookup: React.FC<FoodLookupProps> = ({
    onSearchResults,
    userFoods,
    query,
    setQuery,
    error,
    setError,
}) => {
    const [searchQuery, setSearchQuery] = useState<string>(query);

    // Sync local state with prop changes
    useEffect(() => {
        setSearchQuery(query);
    }, [query]);

    const handleSearch = useCallback(async () => {
        console.log('handleSearch triggered with query:', searchQuery);
        if (!searchQuery.trim()) {
            console.log('Skipping search: empty query');
            setError('');
            onSearchResults([], searchQuery);
            return;
        }

        try {
            setError('');
            console.log('Making API call to /api/premium_1/food-lookup');
            const response = await axiosInstance.get<FoodItem[]>('/api/premium_1/food-lookup', {
                params: { query: searchQuery },
            });
            console.log('Raw response from /api/premium_1/food-lookup:', response.data);
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
            console.log('Unique API results:', uniqueResults);
            onSearchResults(uniqueResults, searchQuery);
        } catch (err) {
            const axiosError = err as AxiosError<{ message?: string }>;
            const errorMessage = axiosError.response?.data?.message || 'Failed to fetch food data.';
            setError(errorMessage);
            console.error('Error fetching food data:', axiosError.response?.data || axiosError.message);
            onSearchResults([], searchQuery);
        }
    }, [onSearchResults, searchQuery, setError]);

    return (
        <div className="food-lookup">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                    type="text"
                    placeholder="Search for a food (e.g., avocado)"
                    value={searchQuery}
                    onChange={(e) => {
                        const newQuery = e.target.value;
                        setSearchQuery(newQuery);
                        setQuery(newQuery); // Update Dashboard's query
                    }}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            handleSearch();
                        }
                    }}
                />
                <SearchIcon
                    style={{ cursor: 'pointer', color: '#4a5568' }}
                    onClick={handleSearch}
                />
            </div>
            {error && <div style={{ color: 'red' }}>{error}</div>}
        </div>
    );
};

export default FoodLookup;
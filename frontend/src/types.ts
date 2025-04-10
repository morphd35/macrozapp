export interface FoodItem {
    foodId: string;
    label: string;
    category: string;
    nutrients: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
        sugars?: number;
        water_intake?: number;
        sodium?: number;
        cholesterol?: number;
        potassium?: number;
        calcium?: number;
        caffeine?: number;
        [key: string]: number | undefined; // Allow dynamic macros
    };
    serving_size?: string; // Add serving_size for local foods
    source?: 'local' | 'edamam'; // Add source to distinguish origin
    custom?: boolean; // Add custom flag for user-added foods

}
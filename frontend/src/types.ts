// Measure type for Edamam API measures
export interface Measure {
    uri: string;
    label: string;
    weight: number;
}

export interface FoodMacro {
    macro_name: string;
    value: number;
    unit: string;
}

export interface FoodItem {
    foodId: string;
    label: string;
    category?: string;
    serving_size?: string; // Add this if not present
    weight?: number; // Add for internal gram tracking
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
        [key: string]: number | undefined; // Allow dynamic keys
    };
    custom?: boolean;
    source?: 'local' | 'edamam'; // Add source if used
    measures?: Measure[];
}

export interface Food {
    id: number;
    user_id: number;
    name: string;
    serving_size: string;
    category: string;
    macros: FoodMacro[];
    custom?: boolean;
    foodId?: string;
}
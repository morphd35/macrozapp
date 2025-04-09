const express = require('express');
const router = express.Router();
const axios = require('axios');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
require('dotenv').config();
const jwt = require('jsonwebtoken');

// Set FRONTEND_BASE_URL based on NODE_ENV
const isProduction = process.env.NODE_ENV === 'production';
process.env.FRONTEND_BASE_URL = isProduction ? 'https://macrozapp.com' : 'http://localhost:3001';
console.log('payment.js - FRONTEND_BASE_URL set to:', process.env.FRONTEND_BASE_URL);

// Middleware to check if user is authenticated
const checkAuth = async (req, res, next) => {
    try {
        console.log('checkAuth middleware - Authorization header:', req.headers.authorization);
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided.' });
        }
        console.log('checkAuth middleware - Token:', token); // Debug log
        const decoded = jwt.decode(token);
        console.log('checkAuth middleware - Decoded token:', decoded); // Debug log
        if (!decoded || !decoded.id) {
            return res.status(401).json({ message: 'Invalid token.' });
        }
        const userId = decoded.id;
        const db = req.app.get('db'); // Use Knex instance
        if (!db) {
            return res.status(500).json({ message: 'Database not initialized.' });
        }
        const result = await db('users').where({ id: userId }).first();
        console.log('checkAuth middleware - User data from database:', result); // Debug log
        if (!result) {
            return res.status(401).json({ message: 'User not found.' });
        }
        req.user = result;

        next();
    } catch (error) {
        console.error('Error checking authentication:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Middleware to check if user is paid
const checkPaidUser = async (req, res, next) => {
    try {
        if (!req.user || !req.user.is_paid) {
            return res.status(403).json({ message: 'This feature requires a paid account.' });
        }
        next();
    } catch (error) {
        console.error('Error checking paid status:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Middleware to check if user is an admin
const checkAdmin = async (req, res, next) => {
    try {
        console.log('checkAdmin middleware - Authorization header:', req.headers.authorization);
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided.' });
        }
        console.log('checkAdmin middleware - Token in checkAdmin:', token); // Debug log
        const decoded = jwt.decode(token);
        console.log('checkAdmin middleware - Decoded token in checkAdmin:', decoded); // Debug log
        if (!decoded || !decoded.id) {
            return res.status(401).json({ message: 'Invalid token.' });
        }
        const userId = decoded.id;
        const db = req.app.get('db');
        if (!db) {
            return res.status(500).json({ message: 'Database not initialized.' });
        }
        const result = await db('users').where({ id: userId }).select('is_admin').first();
        console.log('checkAdmin middleware -User data from database in checkAdmin:', result); // Debug log
        if (!result || !result.is_admin) {
            return res.status(403).json({ message: 'Admin access required.' });
        }
        req.user = result;
        next();
    } catch (error) {
        console.error('Error checking admin status:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Function to retry a request with exponential backoff
const retryRequest = async (fn, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries - 1) throw error; // Last retry, throw the error
            console.log(`Retry ${i + 1}/${retries} after ${delay}ms due to error: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Exponential backoff
        }
    }
};

// Get user data
router.get('/me', checkAuth, (req, res) => {
    console.log('GET /me route handler reached'); // Debug log
    console.log('Raw user data from database:', req.user); // Debug log
    res.json({
        id: req.user.id,
        email: req.user.email,
        isPaid: req.user.is_paid, // Use is_paid from PostgreSQL
    });
});

// Food lookup endpoint (moved from food-lookup.js)
router.get('/food-lookup', checkAuth, checkPaidUser, async (req, res) => {
    console.log('GET /food-lookup route handler reached');
    const { query } = req.query;
    if (!query) {
        return res.status(400).json({ message: 'Query parameter is required.' });
    }

    try {
        console.log('Edamam Food Database API credentials:', {
            app_id: process.env.EDAMAM_FOOD_DATABASE_APP_ID,
            app_key: process.env.EDAMAM_FOOD_DATABASE_APP_KEY,
        });
        console.log('Query sent to Edamam API:', query);

        const parserResponse = await retryRequest(async () => {
            return await axios.get('https://api.edamam.com/api/food-database/v2/parser', {
                params: {
                    app_id: process.env.EDAMAM_FOOD_DATABASE_APP_ID,
                    app_key: process.env.EDAMAM_FOOD_DATABASE_APP_KEY,
                    ingr: query,
                },
                timeout: 5000,
            });
        });

        console.log('Edamam /parser API response:', parserResponse.data);
        const foods = parserResponse.data.hints.map(hint => {
            const food = hint.food;
            console.log(`Processing food: ${food.label}, Measures:`, hint.measures); // Debug log
            console.log(`Nutrients for ${food.label}:`, food.nutrients); // Debug log
            return {
                foodId: food.foodId,
                label: food.label,
                category: food.category,
                nutrients: {
                    calories: food.nutrients?.ENERC_KCAL || 0,
                    protein: food.nutrients?.PROCNT || 0,
                    carbs: food.nutrients?.CHOCDF || 0,
                    fats: food.nutrients?.FAT || 0,
                },
                measures: hint.measures,
            };
        });

        if (!foods || foods.length === 0) {
            return res.status(404).json({ message: 'No food items found for this query.' });
        }

        res.json(foods);
    } catch (error) {
        console.error('Error fetching food data:', error.message);
        console.error('Error details:', error.response ? error.response.data : error);
        res.status(500).json({ message: 'Error fetching food data.', details: error.message });
    }
});

// Add this after the /food-lookup endpoint in payment.js

router.post('/food-nutrients', checkAuth, checkPaidUser, async (req, res) => {
    console.log('POST /food-nutrients endpoint reached');
    const { foodId, quantity, measure, userId } = req.body;
    console.log('Request body:', { foodId, quantity, measure, userId });

    if (!foodId || !quantity || !measure || !userId) {
        console.log('Missing required parameters');
        return res.status(400).json({ message: 'Missing required parameters.' });
    }

    try {
        const db = req.app.get('db');
        console.log('Fetching user goals from user_macro_goals table'); // Updated log message
        const goals = await db('user_macro_goals') // Updated table name
            .where({ user_id: userId })
            .select('macro_name', 'unit');
        console.log('User goals:', goals);

        if (!goals.length) {
            console.log('No goals found for user');
            return res.status(400).json({ message: 'No goals set for this user.' });
        }

        // Map goals to Edamam nutrient codes
        const nutrientMap = {
            calories: 'ENERC_KCAL',
            protein: 'PROCNT',
            carbs: 'CHOCDF',
            fats: 'FAT',
            potassium: 'K',
            sodium: 'NA',
            cholesterol: 'CHOLE',
            sugars: 'SUGAR',
            calcium: 'CA',
            caffeine: 'CAFFEINE',
            water_intake: null, // Not supported by Edamam
        };
        console.log('Nutrient map:', nutrientMap);

        const nutrientKeys = goals.map(goal => nutrientMap[goal.macro_name.toLowerCase()]).filter(Boolean);
        console.log('Nutrient keys to fetch:', nutrientKeys);

        // Call Edamam /nutrients endpoint
        const payload = {
            ingredients: [
                {
                    quantity,
                    measure,
                    foodId,
                },
            ],
        };
        console.log('Edamam /nutrients payload:', payload);
        console.log('Edamam API credentials:', {
            app_id: process.env.EDAMAM_FOOD_DATABASE_APP_ID,
            app_key: process.env.EDAMAM_FOOD_DATABASE_APP_KEY,
        });

        const nutrientsResponse = await retryRequest(async () => {
            return await axios.post(
                'https://api.edamam.com/api/food-database/v2/nutrients',
                payload,
                {
                    params: {
                        app_id: process.env.EDAMAM_FOOD_DATABASE_APP_ID,
                        app_key: process.env.EDAMAM_FOOD_DATABASE_APP_KEY,
                    },
                    timeout: 5000,
                }
            );
        });

        console.log('Edamam /nutrients API response:', nutrientsResponse.data);

        if (!nutrientsResponse.data.ingredients || !nutrientsResponse.data.ingredients[0] || !nutrientsResponse.data.ingredients[0].parsed || !nutrientsResponse.data.ingredients[0].parsed[0]) {
            console.log('Invalid Edamam response structure:', nutrientsResponse.data);
            return res.status(400).json({ message: 'Invalid response from Edamam API.' });
        }

        const totalNutrients = nutrientsResponse.data.totalNutrients;
        const parsedFood = nutrientsResponse.data.ingredients[0].parsed[0];
        const foodName = parsedFood.food;
        console.log('Parsed food name:', foodName);

        // Filter nutrients based on user goals
        const nutrients = {};
        goals.forEach(goal => {
            const nutrientKey = nutrientMap[goal.macro_name.toLowerCase()];
            if (nutrientKey && totalNutrients[nutrientKey]) {
                nutrients[goal.macro_name] = {
                    value: totalNutrients[nutrientKey].quantity,
                    unit: totalNutrients[nutrientKey].unit,
                };
            } else {
                nutrients[goal.macro_name] = { value: 0, unit: goal.unit }; // Default to 0 if not found
            }
        });
        console.log('Filtered nutrients:', nutrients);

        // Prepare response
        const responseData = {
            foodId,
            name: `${foodName} (Edamam)`,
            serving_size: `${quantity} ${measure}`,
            category: parsedFood.category || 'Generic',
            macros: Object.entries(nutrients).map(([macro_name, { value, unit }]) => ({
                macro_name,
                value,
                unit,
            })),
        };
        console.log('Response data:', responseData);

        res.json(responseData);
    } catch (error) {
        console.error('Error in /food-nutrients endpoint:', error.message);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Error fetching food nutrients.', details: error.message });
    }
});

// Create a Stripe checkout session for a subscription
router.post('/create-checkout-session', checkAuth, async (req, res) => {
    try {
        console.log('POST /create-checkout-session route handler reached');
        console.log('User:', req.user);
        console.log('FRONTEND_BASE_URL:', process.env.FRONTEND_BASE_URL);

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: 'price_1RC4gGBa8HVRsYMjx9oFqDU3', // Price ID from Stripe Dashboard
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            ui_mode: 'embedded',
            return_url: `${process.env.FRONTEND_BASE_URL}/payment?session_id={CHECKOUT_SESSION_ID}`,
            metadata: {
                userId: req.user.id.toString(), // Store userId in metadata for later use
            },
        });

        res.json({ clientSecret: session.client_secret });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ message: 'Error creating checkout session.', details: error.message });
    }
});

// Verify payment and update user status
router.get('/verify-payment', checkAuth, async (req, res) => {
    const { session_id } = req.query;
    try {
        console.log('GET /verify-payment route handler reached');
        console.log('Session ID:', session_id);
        console.log('User:', req.user);

        const session = await stripe.checkout.sessions.retrieve(session_id);
        console.log('Stripe session:', session);

        if (session.payment_status === 'paid' && session.subscription) {
            // Update user to paid status
            const db = req.app.get('db');
            await db('users')
                .where({ id: req.user.id })
                .update({ is_paid: true });
            res.json({ success: true });
        } else {
            res.status(400).json({ message: 'Payment not completed or subscription not created.' });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ message: 'Error verifying payment.', details: error.message });
    }
});

// Endpoint to toggle isPaid status (for admin use)
router.post('/admin/set-paid', checkAdmin, async (req, res) => {
    const { userId, isPaid } = req.body;
    try {
        console.log('POST /admin/set-paid route handler reached');
        const db = req.app.get('db');
        const result = await db('users')
            .where({ id: userId })
            .update({ is_paid: isPaid })
            .returning('*');
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found.' });
        }
        res.json({ message: `User ${userId} isPaid set to ${isPaid}` });
    } catch (error) {
        console.error('Error setting isPaid:', error);
        res.status(500).json({ message: 'Error setting isPaid.' });
    }
});

module.exports = router;
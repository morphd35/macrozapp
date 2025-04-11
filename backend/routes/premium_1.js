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
        is_admin: req.user.is_admin,
        isPaidOneTime: req.user.is_paid_one_time || false, // Adjust based on your schema
        subscription_status: req.user.subscription_status,
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
            app_id: process.env.EDAMAM_FOOD_DATABASE_APP_ID ? 'Set' : 'Not Set',
            app_key: process.env.EDAMAM_FOOD_DATABASE_APP_KEY ? 'Set' : 'Not Set',
        });
        console.log('Query sent to Edamam API:', query);

        const parserResponse = await retryRequest(async () => {
            return await axios.get('https://api.edamam.com/api/food-database/v2/parser', {
                params: {
                    app_id: process.env.EDAMAM_FOOD_DATABASE_APP_ID,
                    app_key: process.env.EDAMAM_FOOD_DATABASE_APP_KEY,
                    ingr: query,
                },
                timeout: 10000,
            });
        });

        if (!parserResponse.data || !parserResponse.data.hints) {
            console.error('Unexpected Edamam response structure:', parserResponse.data);
            return res.status(502).json({ message: 'Invalid response from Edamam API.' });
        }

        console.log('Edamam /parser API response:', parserResponse.data);
        const nutrientMap = {
            calories: 'ENERC_KCAL',
            protein: 'PROCNT',
            carbs: 'CHOCDF',
            fats: 'FAT',
            sugars: 'SUGAR',
            sodium: 'NA',
            cholesterol: 'CHOLE',
            potassium: 'K',
            calcium: 'CA',
            caffeine: 'CAFFEINE',
        };

        const foods = parserResponse.data.hints
            .map(hint => {
                const food = hint.food;
                console.log(`Processing food: ${food.label}, Measures:`, hint.measures);
                console.log(`Nutrients for ${food.label}:`, food.nutrients);

                // Check if food.nutrients exists; if not, log and return a default
                if (!food.nutrients) {
                    console.warn(`Food item "${food.label}" (foodId: ${food.foodId}) is missing nutrients. Skipping this item.`);
                    return null; // Skip this food item
                }

                const nutrients = {};
                Object.keys(nutrientMap).forEach(key => {
                    nutrients[key] = food.nutrients[nutrientMap[key]] || 0;
                });

                return {
                    foodId: food.foodId,
                    label: food.label,
                    category: food.category,
                    nutrients,
                    measures: hint.measures,
                };
            })
            .filter(item => item !== null); // Remove null entries

        if (!foods || foods.length === 0) {
            return res.status(404).json({ message: 'No food items found with valid nutrient data for this query.' });
        }

        res.json(foods);
    } catch (error) {
        console.error('Error fetching food data:', error.message, error.stack);
        console.error('Error details:', error.response ? error.response.data : error);
        res.status(500).json({ message: 'Error fetching food data.', details: error.message });
    }
});

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
        console.log('Fetching user goals from user_macro_goals table');
        const goals = await db('user_macro_goals')
            .where({ user_id: userId })
            .select('macro_name', 'unit');
        console.log('User goals:', goals);

        if (!goals.length) {
            console.log('No goals found for user');
            return res.status(400).json({ message: 'No goals set for this user.' });
        }

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
            water_intake: null,
        };
        console.log('Nutrient map:', nutrientMap);

        const nutrientKeys = goals.map(goal => nutrientMap[goal.macro_name.toLowerCase()]).filter(Boolean);
        console.log('Nutrient keys to fetch:', nutrientKeys);

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

        // Calculate the total weight of the requested serving
        const totalWeight = nutrientsResponse.data.totalWeight || 0;
        console.log('Total weight for quantity:', quantity, measure, '=', totalWeight, 'grams');

        // Filter nutrients based on user goals
        const nutrients = {};
        goals.forEach(goal => {
            const normalizedMacroKey = goal.macro_name.toLowerCase().replace(/\s+/g, '_');
            const nutrientKey = nutrientMap[normalizedMacroKey];
            if (nutrientKey && totalNutrients[nutrientKey]) {
                nutrients[goal.macro_name] = {
                    value: totalNutrients[nutrientKey].quantity,
                    unit: totalNutrients[nutrientKey].unit,
                };
            } else {
                nutrients[goal.macro_name] = { value: 0, unit: goal.unit };
            }
        });
        console.log('Filtered nutrients:', nutrients);

        const responseData = {
            foodId,
            name: `${foodName} (Edamam)`,
            serving_size: `${quantity} ${measure}`,
            category: parsedFood.category || 'Generic',
            macros: Object.entries(nutrients).map(([macro_name, { value, unit }]) => ({
                macro_name: macro_name.toLowerCase().replace(/\s+/g, '_'),
                value,
                unit,
            })),
            totalWeight,
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
                .update({
                    is_paid: true,
                    stripe_subscription_id: session.subscription,
                    subscription_status: 'active', // Set initial status
                });
            res.json({ success: true, stripe_subscription_id: session.subscription });
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

// Cancel subscription endpoint
router.post('/cancel-subscription', checkAuth, async (req, res) => {
    try {
        console.log('POST /cancel-subscription route handler reached');
        const db = req.app.get('db');
        const userId = req.user.id;

        // Fetch the user's subscription ID
        const user = await db('users')
            .where({ id: userId })
            .select('stripe_subscription_id', 'is_paid')
            .first();

        if (!user || !user.stripe_subscription_id) {
            return res.status(404).json({ message: 'No active subscription found.' });
        }

        if (!user.is_paid) {
            return res.status(400).json({ message: 'You are not currently subscribed.' });
        }

        // Cancel subscription at period end
        const subscription = await stripe.subscriptions.update(user.stripe_subscription_id, {
            cancel_at_period_end: true,
        });

        // Update DB to reflect cancellation intent
        await db('users')
            .where({ id: userId })
            .update({ subscription_status: 'cancel_pending' });

        res.json({
            message: 'Subscription set to cancel at the end of the billing period.',
            subscription: {
                id: subscription.id,
                status: subscription.status,
                cancel_at: subscription.cancel_at,
            },
        });
    } catch (error) {
        console.error('Error canceling subscription:', error);
        res.status(500).json({ message: 'Error canceling subscription.', details: error.message });
    }
});

// Webhook to handle subscription updates
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    const db = req.app.get('db');

    if (event.type === 'customer.subscription.updated') {
        const subscription = event.data.object;
        const user = await db('users')
            .where({ stripe_subscription_id: subscription.id })
            .first();

        if (user && subscription.cancel_at_period_end && subscription.status === 'active') {
            // Subscription is still active but set to cancel at period end
            await db('users')
                .where({ id: user.id })
                .update({ subscription_status: 'cancel_pending' });
        } else if (user && subscription.status === 'canceled') {
            // Subscription has fully ended
            await db('users')
                .where({ id: user.id })
                .update({ is_paid: false, subscription_status: 'canceled' });
        }
    } else if (event.type === 'customer.subscription.deleted') {
        const subscription = event.data.object;
        const user = await db('users')
            .where({ stripe_subscription_id: subscription.id })
            .first();

        if (user) {
            await db('users')
                .where({ id: user.id })
                .update({ is_paid: false, subscription_status: 'canceled' });
        }
    }

    res.json({ received: true });
});

module.exports = router;
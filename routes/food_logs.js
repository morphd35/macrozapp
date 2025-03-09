const express = require('express');
const router = express.Router();
const db = require('../db');

// Get goals for a user
router.get('/goals/:user_id', async (req, res) => {
    const { user_id } = req.params;
    const parsedUserId = parseInt(user_id);
    if (isNaN(parsedUserId)) {
        return res.status(400).json({ error: 'user_id must be a valid integer' });
    }
    try {
        const goals = await db('user_goals').where('user_id', parsedUserId).first();
        res.json(goals || {});
    } catch (err) {
        console.error('Error in GET /goals/:user_id:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to fetch goals' });
    }
});

// Update goals (POST endpoint)
// Update goals (POST endpoint)
router.post('/goals', async (req, res) => {
    const { user_id, action, ...goalData } = req.body;
    const parsedUserId = parseInt(user_id);
    if (isNaN(parsedUserId)) {
        return res.status(400).json({ error: 'user_id must be a valid integer' });
    }
    try {
        const existingGoal = await db('user_goals').where('user_id', parsedUserId).first();
        let updatedGoals = existingGoal ? { ...existingGoal } : {};

        if (action === 'update') {
            // Update existing goals
            updatedGoals = { ...updatedGoals, ...goalData };
        } else if (action === 'add') {
            // Add a new custom goal
            const newGoalName = goalData.name;
            if (!newGoalName) {
                return res.status(400).json({ error: 'Goal name is required for adding a new goal' });
            }
            if (updatedGoals[newGoalName] !== undefined) {
                return res.status(400).json({ error: 'Goal already exists' });
            }
            updatedGoals[newGoalName] = goalData.target || 0;
        } else if (action === 'remove') {
            // Remove an existing goal
            const goalToRemove = goalData.name;
            if (!goalToRemove) {
                return res.status(400).json({ error: 'Goal name is required for removal' });
            }
            if (updatedGoals[goalToRemove] === undefined) {
                return res.status(400).json({ error: 'Goal does not exist' });
            }
            delete updatedGoals[goalToRemove];
        }

        if (existingGoal) {
            await db('user_goals').where('user_id', parsedUserId).update(updatedGoals);
        } else {
            await db('user_goals').insert({ user_id: parsedUserId, ...updatedGoals });
        }
        res.json({ success: true, goals: updatedGoals });
    } catch (err) {
        console.error('Error in POST /goals:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to update goals' });
    }
});

// Get daily summary for a user and date
router.get('/:user_id/:date', async (req, res) => {
    const { user_id, date } = req.params;
    const parsedUserId = parseInt(user_id);
    if (isNaN(parsedUserId)) {
        return res.status(400).json({ error: 'user_id must be a valid integer' });
    }
    try {
        const summary = await db('food_logs')
            .join('foods', 'food_logs.food_id', 'foods.id')
            .select(
                db.raw('SUM(foods.calories * food_logs.servings) as total_calories'),
                db.raw('SUM(foods.protein_g * food_logs.servings) as total_protein'),
                db.raw('SUM(foods.carbs_g * food_logs.servings) as total_carbs'),
                db.raw('SUM(foods.fats_g * food_logs.servings) as total_fats'),
                db.raw('SUM(foods.sugars_g * food_logs.servings) as total_sugars'),
                db.raw('SUM(COALESCE(foods.sodium_mg, 0) * food_logs.servings) as total_sodium'),
                db.raw('SUM(COALESCE(foods.cholesterol_mg, 0) * food_logs.servings) as total_cholesterol')
            )
            .where('food_logs.user_id', parsedUserId)
            .where('food_logs.log_date', date)
            .groupBy('food_logs.user_id', 'food_logs.log_date')
            .first();
        res.json(summary || { total_protein: 0, total_carbs: 0, total_fats: 0, total_sugars: 0, total_calories: 0 });
    } catch (err) {
        console.error('Error in GET /:user_id/:date:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to fetch daily summary' });
    }
});

// Get detailed food logs for a user and date
router.get('/detailed/:user_id/:date', async (req, res) => {
    const { user_id, date } = req.params;
    const parsedUserId = parseInt(user_id);
    if (isNaN(parsedUserId)) {
        return res.status(400).json({ error: 'user_id must be a valid integer' });
    }
    try {
        console.log('Querying detailed logs for user_id:', parsedUserId, 'date:', date);
        const detailedLogs = await db('food_logs')
            .join('foods', 'food_logs.food_id', 'foods.id')
            .select(
                'foods.name',
                'foods.serving_size',
                'food_logs.servings',
                'foods.protein_g',
                'foods.carbs_g',
                'foods.fats_g',
                'foods.sugars_g',
                'foods.calories',
                'foods.sodium_mg',
                'foods.cholesterol_mg',
                'food_logs.log_date'
            )
            .where('food_logs.user_id', parsedUserId)
            .andWhere('food_logs.log_date', date);
        console.log('Detailed logs result:', detailedLogs);
        res.json(detailedLogs);
    } catch (err) {
        console.error('Error in GET /detailed/:user_id/:date:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to fetch detailed logs' });
    }
});

// Get food logs for a range of dates
router.get('/range/:user_id/:start_date/:end_date', async (req, res) => {
    const { user_id, start_date, end_date } = req.params;
    const parsedUserId = parseInt(user_id);
    if (isNaN(parsedUserId)) {
        return res.status(400).json({ error: 'user_id must be a valid integer' });
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
        return res.status(400).json({ error: 'dates must be in YYYY-MM-DD format' });
    }
    try {
        const foodLogs = await db('food_logs')
            .join('foods', 'food_logs.food_id', 'foods.id')
            .select(
                'foods.name',
                'foods.serving_size',
                'food_logs.servings',
                db.raw('foods.protein_g * food_logs.servings as protein_g'),
                db.raw('foods.carbs_g * food_logs.servings as carbs_g'),
                db.raw('foods.fats_g * food_logs.servings as fats_g'),
                db.raw('foods.sugars_g * food_logs.servings as sugars_g'),
                db.raw('foods.calories * food_logs.servings as calories'),
                db.raw('COALESCE(foods.sodium_mg * food_logs.servings, 0) as sodium_mg'),
                db.raw('COALESCE(foods.cholesterol_mg * food_logs.servings, 0) as cholesterol_mg'),
                'food_logs.log_date'
            )
            .where('food_logs.user_id', parsedUserId)
            .whereBetween('food_logs.log_date', [start_date, end_date])
            .orderBy('food_logs.log_date');
        res.json(foodLogs);
    } catch (err) {
        console.error('Error in GET /range/:user_id/:start_date/:end_date:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to fetch detailed food logs' });
    }
});

// Post food log
router.post('/', async (req, res) => {
    const { user_id, food_id, servings, log_date } = req.body;
    try {
        console.log('Received POST data:', { user_id, food_id, servings, log_date });
        const food = await db('foods')
            .where('id', food_id)
            .select(
                'protein_g',
                'carbs_g',
                'fats_g',
                'sugars_g',
                'calories',
                'sodium_mg',
                'cholesterol_mg'
            )
            .first();
        console.log('Fetched food data:', food);

        if (!food) {
            return res.status(404).json({ error: 'Food not found' });
        }

        const [newLog] = await db('food_logs')
            .insert({
                user_id,
                food_id,
                servings,
                log_date,
                protein_g: food.protein_g || 0,
                carbs_g: food.carbs_g || 0,
                fats_g: food.fats_g || 0,
                sugars_g: food.sugars_g || 0,
                calories: food.calories || 0,
                sodium_mg: food.sodium_mg || null,
                cholesterol_mg: food.cholesterol_mg || null,
            })
            .returning('*');
        console.log('Inserted log:', newLog);
        res.status(201).json(newLog);
    } catch (err) {
        console.error('Error logging food:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to log food' });
    }
});

// Log weight
router.post('/weight_logs', async (req, res) => {
    const { user_id, weight_lb, log_date } = req.body;
    const parsedUserId = parseInt(user_id);
    if (isNaN(parsedUserId) || !weight_lb || !log_date) {
        return res.status(400).json({ error: 'user_id, weight_lb, and log_date are required' });
    }
    try {
        await db('weight_logs').insert({
            user_id: parsedUserId,
            weight_lb,
            log_date,
        });
        res.json({ success: true, message: 'Weight logged successfully' });
    } catch (err) {
        console.error('Error in POST /weight_logs:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to log weight' });
    }
});

module.exports = router;
// backend/routes/food_logs.js
const express = require('express');
const router = express.Router();

console.log('food_logs.js loaded - version 2025-04-15-v12');
console.log('Updated for version 2025-04-15-v12');

// Get goals for a user
router.get('/goals/:user_id', async (req, res) => {
    const { user_id } = req.params;
    const parsedUserId = parseInt(user_id);

    if (isNaN(parsedUserId)) {
        return res.status(400).json({ error: 'user_id must be a valid integer' });
    }

    try {
        const db = req.app.get('db');
        const goals = await db('user_macro_goals').where('user_id', parsedUserId);
        res.json(goals);
    } catch (err) {
        console.error('Error in GET /goals/:user_id:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to fetch goals' });
    }
});

// Add a new macro goal
router.post('/goals', async (req, res) => {
    const { user_id, macro_name, target_value, unit, goal_type } = req.body;
    const parsedUserId = parseInt(user_id);

    if (isNaN(parsedUserId) || !macro_name || target_value === undefined || !unit || !goal_type) {
        return res.status(400).json({ error: 'user_id, macro_name, target_value, unit, and goal_type are required' });
    }

    try {
        const db = req.app.get('db');
        const result = await db('user_macro_goals')
            .insert({
                user_id: parsedUserId,
                macro_name,
                target_value,
                unit,
                goal_type,
                updated_at: db.fn.now(),
            })
            .onConflict(['user_id', 'macro_name'])
            .merge({
                target_value,
                unit,
                goal_type,
                updated_at: db.fn.now(),
            })
            .returning('*');

        res.json({ success: true, goal: result[0] });
    } catch (err) {
        console.error('Error in POST /goals:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to save macro goal' });
    }
});

// Add custom food
router.post('/foods', async (req, res) => {
    const { user_id, name, serving_size, category, macros } = req.body;

    if (!user_id || !name || !serving_size || !category || !macros || !Array.isArray(macros)) {
        return res.status(400).json({ error: 'user_id, name, serving_size, category, and macros are required' });
    }

    const parsedUserId = parseInt(user_id);
    if (isNaN(parsedUserId)) {
        return res.status(400).json({ error: 'user_id must be a valid integer' });
    }

    try {
        const db = req.app.get('db');
        const existingFood = await db('foods')
            .where({ user_id: parsedUserId, name })
            .first();

        let newFood;

        if (existingFood) {
            [newFood] = await db('foods')
                .where({ id: existingFood.id })
                .update({
                    serving_size,
                    category,
                })
                .returning(['id', 'user_id', 'name', 'serving_size', 'category']);

            await db('food_macros').where('food_id', existingFood.id).del();

            const macroEntries = macros.map(macro => ({
                food_id: existingFood.id,
                macro_name: macro.macro_name,
                value: parseFloat(macro.value) || 0,
                unit: macro.unit,
            }));

            await db('food_macros').insert(macroEntries);
        } else {
            [newFood] = await db('foods')
                .insert({
                    user_id: parsedUserId,
                    name,
                    serving_size,
                    category,
                })
                .returning(['id', 'user_id', 'name', 'serving_size', 'category']);

            const macroEntries = macros.map(macro => ({
                food_id: newFood.id,
                macro_name: macro.macro_name,
                value: parseFloat(macro.value) || 0,
                unit: macro.unit,
            }));

            await db('food_macros').insert(macroEntries);
        }

        const insertedMacros = await db('food_macros').where('food_id', newFood.id);
        res.status(201).json({ ...newFood, macros: insertedMacros, custom: true });
    } catch (err) {
        console.error('Error adding custom food:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to add food', details: err.message });
    }
});

// Get all foods with their macros for a specific user
router.get('/foods', async (req, res) => {
    try {
        const db = req.app.get('db');
        const userId = parseInt(req.query.user_id);
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'user_id must be a valid integer' });
        }

        const foods = await db('foods')
            .where({ user_id: userId })
            .select('*');

        const foodMacros = await db('food_macros')
            .whereIn('food_id', foods.map(food => food.id))
            .select('*');

        const foodsWithMacros = foods.map(food => {
            const macros = foodMacros.filter(m => m.food_id === food.id);
            return { ...food, macros };
        });

        res.json(foodsWithMacros);
    } catch (err) {
        console.error('Error fetching foods:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to fetch foods', details: err.message });
    }
});

// Delete a goal
router.delete('/goals/:user_id/:macro_name', async (req, res) => {
    const { user_id, macro_name } = req.params;
    const parsedUserId = parseInt(user_id);

    if (isNaN(parsedUserId) || !macro_name) {
        return res.status(400).json({ error: 'user_id and macro_name are required' });
    }

    try {
        const db = req.app.get('db');
        const deletedCount = await db('user_macro_goals')
            .where({ user_id: parsedUserId, macro_name })
            .del();

        if (deletedCount === 0) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        res.json({ success: true, message: 'Goal deleted' });
    } catch (err) {
        console.error('Error in DELETE /goals/:user_id/:macro_name:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to delete goal' });
    }
});

// Update a goal
router.put('/goals/:user_id/:macro_name', async (req, res) => {
    const { user_id, macro_name } = req.params;
    const { target_value, unit, goal_type } = req.body;
    const parsedUserId = parseInt(user_id);

    if (isNaN(parsedUserId) || !macro_name || target_value === undefined || !unit || !goal_type) {
        return res.status(400).json({ error: 'user_id, macro_name, target_value, unit, and goal_type are required' });
    }

    try {
        const db = req.app.get('db');
        const result = await db('user_macro_goals')
            .where({ user_id: parsedUserId, macro_name })
            .update({
                target_value,
                unit,
                goal_type,
                updated_at: db.fn.now(),
            })
            .returning('*');

        if (result.length === 0) {
            return res.status(404).json({ error: 'Goal not found' });
        }

        res.json({ success: true, goal: result[0] });
    } catch (err) {
        console.error('Error in PUT /goals/:user_id/:macro_name:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to update goal' });
    }
});

// Get daily summary for a user and date
router.post('/:user_id/:date', async (req, res) => {
    const { user_id, date } = req.params;
    const parsedUserId = parseInt(user_id);
    console.log('POST /food_logs/:user_id/:date endpoint reached');
    console.log('Request params:', { user_id, date });

    if (isNaN(parsedUserId)) {
        console.log('Invalid user_id:', user_id);
        return res.status(400).json({ error: 'user_id must be a valid integer' });
    }

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');

    try {
        const db = req.app.get('db');
        const trackedMacrosRaw = await db('user_macro_goals')
            .where('user_id', parsedUserId)
            .pluck('macro_name')
            .then(macros => macros.map(macro => macro.toLowerCase().replace(/\s+/g, '_')));

        let trackedMacros = [];
        if (Array.isArray(trackedMacrosRaw)) {
            trackedMacros = trackedMacrosRaw.map(macro => macro.toLowerCase());
        } else {
            console.warn('Unexpected result from pluck, treating as empty array:', trackedMacrosRaw);
            trackedMacros = [];
        }
        console.log('Processed tracked macros:', trackedMacros);

        const summary = {};

        const foodLogs = await db('food_logs')
            .join('foods', 'food_logs.food_id', 'foods.id')
            .where('food_logs.user_id', parsedUserId)
            .andWhere(db.raw('DATE(food_logs.log_date) = ?', [date]))
            .select('food_logs.id', 'food_logs.servings', 'food_logs.log_date', 'foods.name');

        console.log('Food logs for user', parsedUserId, 'on', date, ':', foodLogs.map(log => ({
            ...log,
            log_date: log.log_date.toISOString(),
        })));

        if (!foodLogs.length) {
            console.log('No food logs found for user', parsedUserId, 'on', date);
            return res.json(summary);
        }

        const logIds = foodLogs.map(log => log.id);
        console.log('Log IDs:', logIds);

        let macroTotals;
        if (trackedMacros.length) {
            macroTotals = await db('food_log_macros')
                .whereIn('food_log_id', logIds)
                .whereIn(db.raw('LOWER(macro_name)'), trackedMacros)
                .groupBy('macro_name')
                .select(db.raw('LOWER(macro_name) as macro_name'), db.raw('SUM(total_value) as total'));
        } else {
            macroTotals = await db('food_log_macros')
                .whereIn('food_log_id', logIds)
                .groupBy('macro_name')
                .select(db.raw('LOWER(macro_name) as macro_name'), db.raw('SUM(total_value) as total'));
        }

        console.log('Macro totals:', macroTotals);

        macroTotals.forEach(row => {
            summary[`total_${row.macro_name.toLowerCase()}`] = row.total || 0;
        });

        console.log('Daily summary for user', parsedUserId, 'on', date, ':', summary);
        res.json(summary);
    } catch (err) {
        console.error('Error in POST /:user_id/:date:', err.message, err.stack);
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
        const db = req.app.get('db');
        const detailedLogs = await db('food_logs')
            .join('foods', 'food_logs.food_id', 'foods.id')
            .join('food_log_macros', 'food_logs.id', 'food_log_macros.food_log_id')
            .select(
                'food_logs.id as log_id',
                'foods.name',
                'foods.serving_size',
                'food_logs.servings',
                'food_log_macros.macro_name',
                'food_log_macros.total_value',
                'food_log_macros.unit',
                'food_logs.log_date'
            )
            .where('food_logs.user_id', parsedUserId)
            .andWhere('food_logs.log_date', date)
            .andWhere('foods.user_id', parsedUserId);
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
        const db = req.app.get('db');
        const foodLogs = await db('food_logs')
            .join('foods', 'food_logs.food_id', 'foods.id')
            .join('food_log_macros', 'food_logs.id', 'food_log_macros.food_log_id')
            .select(
                'foods.name',
                'foods.serving_size',
                'food_logs.servings',
                'food_log_macros.macro_name',
                'food_log_macros.total_value',
                'food_log_macros.unit',
                'food_logs.log_date'
            )
            .where('food_logs.user_id', parsedUserId)
            .whereBetween('food_logs.log_date', [start_date, end_date])
            .andWhere('foods.user_id', parsedUserId)
            .orderBy('food_logs.log_date');
        res.json(foodLogs);
    } catch (err) {
        console.error('Error in GET /range/:user_id/:start_date/:end_date:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to fetch detailed food logs' });
    }
});

// Log food consumption
router.post('/food_logs', async (req, res) => {
    const { user_id, food_id, servings, log_date } = req.body;
    const parsedUserId = parseInt(user_id);
    if (isNaN(parsedUserId) || !food_id || !servings || !log_date) {
        return res.status(400).json({ error: 'user_id, food_id, servings, and log_date are required' });
    }

    try {
        const db = req.app.get('db');
        const food = await db('foods')
            .where({ id: food_id, user_id: parsedUserId })
            .first();
        if (!food) {
            return res.status(404).json({ error: 'Food not found or not owned by user' });
        }

        const foodMacros = await db('food_macros')
            .where('food_id', food_id)
            .select('macro_name', 'value', 'unit');

        if (!foodMacros.length) {
            return res.status(404).json({ error: 'Food macros not found' });
        }

        const [newLog] = await db('food_logs')
            .insert({
                user_id: parsedUserId,
                food_id,
                servings,
                log_date,
            })
            .returning('*');

        const macroTotals = foodMacros.map(macro => ({
            food_log_id: newLog.id,
            macro_name: macro.macro_name.toLowerCase(),
            total_value: macro.value * servings,
            unit: macro.unit,
        }));

        await db('food_log_macros').insert(macroTotals);

        const fullLog = await db('food_logs')
            .where('id', newLog.id)
            .first();

        res.status(201).json(fullLog);
    } catch (err) {
        console.error('Error logging food:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to log food', details: err.message });
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
        const db = req.app.get('db');
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
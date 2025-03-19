const express = require('express');
const router = express.Router();

const db = req.app.get('db');
// Get goals for a user  
router.get('/goals/:user_id', async (req, res) => {
    const { user_id } = req.params;
    const parsedUserId = parseInt(user_id);

    if (isNaN(parsedUserId)) {
        return res.status(400).json({ error: 'user_id must be a valid integer' });
    }

    try {
        const goals = await db('user_macro_goals').where('user_id', parsedUserId);
        res.json(goals); // Array of goals
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

        console.log('Saved macro goal:', result[0]);
        res.json({ success: true, goal: result[0] });
    } catch (err) {
        console.error('Error in POST /goals:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to save macro goal' });
    }
});

// Add custom food
router.post('/foods', async (req, res) => {
    const { name, serving_size, category, macros } = req.body; // macros is an array: [{ macro_name, value, unit }, ...]

    if (!name || !serving_size || !category || !macros || !Array.isArray(macros)) {
        return res.status(400).json({ error: 'name, serving_size, category, and macros are required' });
    }

    try {
        // Insert the food (only base details)
        const [newFood] = await db('foods')
            .insert({
                name,
                serving_size,
                category,
            })
            .returning(['id']);

        console.log('Inserted food:', newFood);

        // Insert all macros into food_macros (no fixed macros)
        const macroEntries = macros.map(macro => ({
            food_id: newFood.id,
            macro_name: macro.macro_name.toLowerCase(), // Standardize to lowercase
            value: macro.value,
            unit: macro.unit,
        }));

        await db('food_macros').insert(macroEntries);

        console.log('Inserted food macros:', macroEntries);

        const insertedMacros = await db('food_macros').where('food_id', newFood.id);
        res.status(201).json({ ...newFood, macros: insertedMacros, custom: true });
    } catch (err) {
        console.error('Error adding custom food:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to add food' });
    }
});

// Get all foods with their macros
router.get('/foods', async (req, res) => {
    try {
        const foods = await db('foods').select('*');
        console.log('Fetched foods from database:', foods);

        const foodMacros = await db('food_macros').select('*');
        console.log('Fetched food macros from database:', foodMacros);

        const foodsWithMacros = foods.map(food => {
            const macros = foodMacros.filter(m => m.food_id === food.id);
            return { ...food, macros };
        });

        console.log('Foods with macros to return:', foodsWithMacros);
        res.json(foodsWithMacros);
    } catch (err) {
        console.error('Error fetching foods:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to fetch foods' });
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
router.get('/:user_id/:date', async (req, res) => {
    const { user_id, date } = req.params;
    const parsedUserId = parseInt(user_id);
    if (isNaN(parsedUserId)) {
        return res.status(400).json({ error: 'user_id must be a valid integer' });
    }

    try {
        // Get the macros the user is tracking
        const trackedMacrosRaw = await db('user_macro_goals')
            .where('user_id', parsedUserId)
            .pluck('macro_name');

        console.log('Raw tracked macros result:', trackedMacrosRaw);

        let trackedMacros = [];
        if (Array.isArray(trackedMacrosRaw)) {
            trackedMacros = trackedMacrosRaw.map(macro => macro.toLowerCase());
        } else {
            console.warn('Unexpected result from pluck, treating as empty array:', trackedMacrosRaw);
            trackedMacros = [];
        }

        console.log('Processed tracked macros:', trackedMacros);

        const summary = {};

        if (!trackedMacros.length) {
            console.log('No tracked macros found for user', parsedUserId);
            return res.json(summary); // Return empty summary if no macros are tracked
        }

        // Get all food logs for the user and date
        const foodLogs = await db('food_logs')
            .where('user_id', parsedUserId)
            .where('log_date', date)
            .select('id');

        console.log('Food log IDs for user', parsedUserId, 'on', date, ':', foodLogs);

        if (!foodLogs.length) {
            console.log('No food logs found for user', parsedUserId, 'on', date);
            return res.json(summary); // Return empty summary if no food logs
        }

        const logIds = foodLogs.map(log => log.id);

        // Fetch and sum macro totals from food_log_macros
        const macroTotals = await db('food_log_macros')
            .whereIn('food_log_id', logIds)
            .whereIn(db.raw('LOWER(macro_name)'), trackedMacros)
            .groupBy('macro_name')
            .select('macro_name', db.raw('SUM(total_value) as total'));

        console.log('Macro totals:', macroTotals);

        // Build the summary
        macroTotals.forEach(row => {
            summary[`total_${row.macro_name.toLowerCase()}`] = row.total || 0;
        });

        console.log('Daily summary for user', parsedUserId, 'on', date, ':', summary);
        res.json(summary);
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
    try {
        console.log('Received POST data:', { user_id, food_id, servings, log_date });

        // Fetch the food's macros dynamically
        const foodMacros = await db('food_macros')
            .where('food_id', food_id)
            .select('macro_name', 'value', 'unit');

        console.log('Fetched food macros:', foodMacros);

        if (!foodMacros.length) {
            return res.status(404).json({ error: 'Food macros not found' });
        }

        // Insert the base log entry
        const [newLog] = await db('food_logs')
            .insert({
                user_id,
                food_id,
                servings,
                log_date,
            })
            .returning('*');

        console.log('Inserted base log:', newLog);

        // Calculate and insert macro totals
        const macroTotals = foodMacros.map(macro => ({
            food_log_id: newLog.id,
            macro_name: macro.macro_name.toLowerCase(),
            total_value: macro.value * servings,
            unit: macro.unit,
        }));

        await db('food_log_macros').insert(macroTotals);

        console.log('Inserted macro totals:', macroTotals);

        // Fetch the full log entry with macros for the response
        const fullLog = await db('food_logs')
            .where('id', newLog.id)
            .first();

        res.status(201).json(fullLog);
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
const express = require('express');
const router = express.Router();


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

        console.log('Saved macro goal:', result[0]);
        res.json({ success: true, goal: result[0] });
    } catch (err) {
        console.error('Error in POST /goals:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to save macro goal' });
    }
});

// Add custom food
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
    console.log('Parsed user_id for insert:', parsedUserId);

    try {
        const db = req.app.get('db');
        // Check if a food with the same name already exists for this user
        const existingFood = await db('foods')
            .where({ user_id: parsedUserId, name })
            .first();
        if (existingFood) {
            return res.status(400).json({ error: 'A food with this name already exists for this user. Please use a unique name.' });
        }

        const insertPayload = {
            user_id: Number(parsedUserId), // Explicitly convert to number
            name,
            serving_size,
            category,
        };
        console.log('Insert payload:', insertPayload); // Add this log

        // Insert the food with user_id
        const [newFood] = await db('foods')
            .insert(insertPayload)
            .returning(['id', 'user_id', 'name', 'serving_size', 'category']);

        console.log('Inserted food for user_id:', parsedUserId, newFood);

        // Insert all macros into food_macros
        const macroEntries = macros.map(macro => ({
            food_id: newFood.id,
            macro_name: macro.macro_name.toLowerCase(),
            value: macro.value,
            unit: macro.unit,
        }));

        await db('food_macros').insert(macroEntries);

        console.log('Inserted food macros for food_id:', newFood.id, macroEntries);

        const insertedMacros = await db('food_macros').where('food_id', newFood.id);
        res.status(201).json({ ...newFood, macros: insertedMacros, custom: true });
    } catch (err) {
        console.error('Error adding custom food:', err.message, err.stack);
        if (err.code === '23505') { // PostgreSQL duplicate key error
            res.status(400).json({ error: 'A food with this name already exists for this user. Please use a unique name.' });
        } else {
            res.status(500).json({ error: 'Failed to add food', details: err.message });
        }
    }
});

// Get all foods with their macros
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
        // console.log('Fetched foods for user_id:', userId, foods);

        const foodMacros = await db('food_macros')
            .whereIn('food_id', foods.map(food => food.id))
            .select('*');
        // console.log('Fetched food macros for user_id:', userId, foodMacros);

        const foodsWithMacros = foods.map(food => {
            const macros = foodMacros.filter(m => m.food_id === food.id);
            return { ...food, macros };
        });

        // console.log('Foods with macros to return for user_id:', userId, foodsWithMacros);
        res.json(foodsWithMacros);
    } catch (err) {
        console.error('Error fetching foods:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to fetch foods', details: err.message });
    }
});

// Update a food item
// Update a food item
router.put('/foods/:id', async (req, res) => {
    const { id } = req.params;
    const { user_id, name, serving_size, category, macros } = req.body;
    const parsedId = parseInt(id);
    const parsedUserId = parseInt(user_id);

    if (isNaN(parsedId)) {
        return res.status(400).json({ error: 'Food ID must be a valid integer' });
    }

    if (isNaN(parsedUserId)) {
        return res.status(400).json({ error: 'user_id must be a valid integer' });
    }

    if (!name || !serving_size || !category || !macros || !Array.isArray(macros)) {
        return res.status(400).json({ error: 'name, serving_size, category, and macros are required' });
    }

    try {
        const db = req.app.get('db');
        console.log('Checking for existing food with id:', parsedId, 'and user_id:', parsedUserId);
        const query = db('foods')
            .where({ id: parsedId, user_id: parsedUserId })
            .first();
        console.log('Raw query:', query.toSQL().toNative()); // Log the raw SQL query
        const existingFood = await query;
        console.log('Existing food:', existingFood);
        if (!existingFood) {
            return res.status(404).json({ error: 'Food not found or not owned by user' });
        }

        const duplicateFood = await db('foods')
            .where({ user_id: parsedUserId, name })
            .whereNot('id', parsedId)
            .first();
        if (duplicateFood) {
            return res.status(400).json({ error: 'A food with this name already exists for this user' });
        }

        console.log('Updating food with id:', parsedId, 'and user_id:', parsedUserId);
        const [updatedFood] = await db('foods')
            .where({ id: parsedId, user_id: parsedUserId })
            .update({
                name,
                serving_size,
                category,
            })
            .returning('*');
        console.log('Updated food:', updatedFood);
        if (!updatedFood) {
            return res.status(404).json({ error: 'Food not found' });
        }

        console.log('Updated food:', updatedFood);

        await db('food_macros').where('food_id', parsedId).del();

        const macroEntries = macros.map(macro => ({
            food_id: parsedId,
            macro_name: macro.macro_name.toLowerCase(),
            value: macro.value,
            unit: macro.unit,
        }));

        await db('food_macros').insert(macroEntries);

        console.log('Updated food macros:', macroEntries);

        const updatedMacros = await db('food_macros').where('food_id', parsedId);
        res.json({ ...updatedFood, macros: updatedMacros });
    } catch (err) {
        console.error('Error updating food:', err.message, err.stack);
        if (err.code === '23505') {
            res.status(400).json({ error: 'A food with this name already exists for this user' });
        } else {
            res.status(500).json({ error: 'Failed to update food', details: err.message });
        }
    }
});

// Delete a food item
// In routes/foods.js
router.delete('/foods/:id', async (req, res) => {
    const { id } = req.params;
    const userId = parseInt(req.query.user_id);
    const parsedId = parseInt(id);

    console.log('Attempting to delete food with id:', parsedId, 'for user_id:', userId);

    if (isNaN(parsedId)) {
        console.log('Invalid food ID:', id);
        return res.status(400).json({ error: 'Food ID must be a valid integer' });
    }

    if (isNaN(userId)) {
        console.log('Invalid user_id:', req.query.user_id);
        return res.status(400).json({ error: 'user_id must be a valid integer' });
    }

    try {
        const db = req.app.get('db');

        // Check if the food exists and belongs to the user
        console.log('Checking for existing food with id:', parsedId, 'and user_id:', userId);
        const query = db('foods')
            .where({ id: parsedId, user_id: userId })
            .first();
        console.log('Raw query:', query.toSQL().toNative());
        const existingFood = await query;
        console.log('Existing food:', existingFood);
        if (!existingFood) {
            return res.status(404).json({ error: 'Food not found or not owned by user' });
        }

        // Check if the food has associated food_logs entries
        console.log('Checking for associated food_logs entries for food id:', parsedId);
        const logCount = await db('food_logs')
            .where({ food_id: parsedId, user_id: userId })
            .count('id as count')
            .first();
        console.log('Food logs count:', logCount.count);

        if (logCount.count > 0) {
            return res.status(400).json({
                error: 'Cannot delete food',
                message: 'This food cannot be deleted because it is referenced in your food logs. Deleting it would alter your historical data.',
            });
        }

        // If no food_logs entries exist, proceed with deletion
        console.log('Deleting associated food_macros for food id:', parsedId);
        await db('food_macros').where('food_id', parsedId).del();

        console.log('Deleting food with id:', parsedId, 'and user_id:', userId);
        const deletedCount = await db('foods')
            .where({ id: parsedId, user_id: userId })
            .del();
        console.log('Deleted count:', deletedCount);

        if (deletedCount === 0) {
            return res.status(404).json({ error: 'Food not found' });
        }

        res.status(204).send();
    } catch (err) {
        console.error('Error deleting food:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to delete food', details: err.message });
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
router.get('/:user_id/:date', async (req, res) => {
    const { user_id, date } = req.params;
    const parsedUserId = parseInt(user_id);
    if (isNaN(parsedUserId)) {
        return res.status(400).json({ error: 'user_id must be a valid integer' });
    }

    try {
        const db = req.app.get('db');
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
            return res.json(summary);
        }

        const foodLogs = await db('food_logs')
            .where('user_id', parsedUserId)
            .where('log_date', date)
            .select('id');

        console.log('Food log IDs for user', parsedUserId, 'on', date, ':', foodLogs);

        if (!foodLogs.length) {
            console.log('No food logs found for user', parsedUserId, 'on', date);
            return res.json(summary);
        }

        const logIds = foodLogs.map(log => log.id);

        const macroTotals = await db('food_log_macros')
            .whereIn('food_log_id', logIds)
            .whereIn(db.raw('LOWER(macro_name)'), trackedMacros)
            .groupBy('macro_name')
            .select('macro_name', db.raw('SUM(total_value) as total'));

        console.log('Macro totals:', macroTotals);

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
        const db = req.app.get('db');
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
        const db = req.app.get('db');
        console.log('Received POST data:', { user_id, food_id, servings, log_date });

        const foodMacros = await db('food_macros')
            .where('food_id', food_id)
            .select('macro_name', 'value', 'unit');

        console.log('Fetched food macros:', foodMacros);

        if (!foodMacros.length) {
            return res.status(404).json({ error: 'Food macros not found' });
        }

        const [newLog] = await db('food_logs')
            .insert({
                user_id,
                food_id,
                servings,
                log_date,
            })
            .returning('*');

        console.log('Inserted base log:', newLog);

        const macroTotals = foodMacros.map(macro => ({
            food_log_id: newLog.id,
            macro_name: macro.macro_name.toLowerCase(),
            total_value: macro.value * servings,
            unit: macro.unit,
        }));

        await db('food_log_macros').insert(macroTotals);

        console.log('Inserted macro totals:', macroTotals);

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
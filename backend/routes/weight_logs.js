// backend/routes/weight_logs.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Add a weight log
router.post('/', async (req, res) => {
    const { user_id, weight_lb, log_date } = req.body;
    try {
        const [weightLog] = await db('weight_logs')
            .insert({ user_id, weight_lb, log_date })
            .returning('*');
        res.json(weightLog);
    } catch (err) {
        console.error('Error in POST /weight_logs:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to add weight log' });
    }
});

// Get weight logs
router.get('/', async (req, res) => {
    const { user_id, date } = req.query;
    try {
        const weightLogs = await db('weight_logs')
            .select('id', 'weight_lb', 'log_date')
            .where('user_id', user_id)
            .where('log_date', date);
        res.json(weightLogs);
    } catch (err) {
        console.error('Error in GET /weight_logs:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to fetch weight logs' });
    }
});

// Get weight logs for a date range
router.get('/range', async (req, res) => {
    const { user_id, start_date, end_date } = req.query;
    const parsedUserId = parseInt(user_id); // Remove `as string`
    if (isNaN(parsedUserId)) {
        return res.status(400).json({ error: 'user_id must be a valid integer' });
    }
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(start_date) || !dateRegex.test(end_date)) {
        return res.status(400).json({ error: 'dates must be in YYYY-MM-DD format' });
    }
    try {
        const weightLogs = await db('weight_logs')
            .select('id', 'weight_lb', 'log_date')
            .where('user_id', parsedUserId)
            .whereBetween('log_date', [start_date, end_date])
            .orderBy('log_date');
        res.json(weightLogs);
    } catch (err) {
        console.error('Error in GET /range:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to fetch weight logs' });
    }
});

module.exports = router;
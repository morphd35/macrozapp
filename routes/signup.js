// backend/routes/signup.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const router = express.Router();

router.post('/', async (req, res) => {
    const { username, password } = req.body;


    try {
        const db = req.app.get('db'); // Retrieve db from Express app
        if (!db) {
            console.error('Database not initialized in signup route');
            return res.status(500).json({ error: 'Database not initialized' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const [newUser] = await db('users')
            .insert({ username, password: hashedPassword })
            .returning(['id', 'username']);

        // Add default macro goals
        const defaultGoals = [
            { macro_name: 'calories', target_value: 2000, unit: 'kcal', goal_type: 'stay_under' },
            { macro_name: 'protein', target_value: 150, unit: 'g', goal_type: 'reach_or_exceed' },
            { macro_name: 'carbs', target_value: 250, unit: 'g', goal_type: 'stay_under' },
            { macro_name: 'fats', target_value: 70, unit: 'g', goal_type: 'stay_under' },
        ];

        await db('user_macro_goals').insert(
            defaultGoals.map(goal => ({
                user_id: newUser.id,
                macro_name: goal.macro_name,
                target_value: goal.target_value,
                unit: goal.unit,
                goal_type: goal.goal_type,
            }))
        );

        const token = jwt.sign({ id: newUser.id, username: newUser.username }, process.env.JWT_SECRET || 'your_secret_key', { expiresIn: '1h' });
        res.status(201).json({ token });
    } catch (err) {
        console.error('Error in POST /signup:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

module.exports = router;
// backend/routes/signup.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const router = express.Router();

router.post('/', async (req, res) => {
    try {
        const db = req.app.get('db');
        if (!db) {
            console.error('DEBUG: Database not initialized in POST /signup');
            return res.status(500).json({ error: 'Database not initialized' });
        }

        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        // Check if username or email already exists
        const existingUser = await db('users')
            .where({ username })
            .orWhere({ email: email.toLowerCase() })
            .first();
        if (existingUser) {
            if (existingUser.username === username) {
                return res.status(409).json({ error: 'Username already exists' });
            }
            if (existingUser.email === email.toLowerCase()) {
                return res.status(409).json({ error: 'Email already exists' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('DEBUG: Hashed password for user:', username);

        const [newUser] = await db('users')
            .insert({
                username,
                email: email.toLowerCase(),
                password: hashedPassword,
            })
            .returning(['id', 'username', 'email']);

        console.log('DEBUG: Inserted new user:', newUser);

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

        console.log('DEBUG: Inserted default macro goals for user_id:', newUser.id);

        // Copy foods from master_foods for the new user
        const masterFoods = await db('master_foods').select('*');
        if (masterFoods.length > 0) {
            // Create a mapping of master_foods.id to the new foods.id
            const foodMapping = new Map();

            // Insert foods and capture the new IDs
            const newFoods = await db('foods')
                .insert(
                    masterFoods.map(food => ({
                        user_id: newUser.id,
                        name: food.name,
                        serving_size: food.serving_size,
                        category: food.category,
                    }))
                )
                .returning(['id', 'name', 'serving_size', 'category']);

            // Build the mapping: master_foods.id -> foods.id
            for (const newFood of newFoods) {
                const masterFood = masterFoods.find(
                    mf => mf.name === newFood.name && mf.serving_size === newFood.serving_size
                );
                if (masterFood) {
                    foodMapping.set(masterFood.id, newFood.id);
                }
            }

            console.log('DEBUG: Copied master foods for user_id:', newUser.id, newFoods);
            console.log('DEBUG: Food mapping (master_foods.id -> foods.id):', Array.from(foodMapping.entries()));

            // Copy macros for each new food using the mapping
            const masterMacros = await db('master_food_macros')
                .whereIn('food_id', Array.from(foodMapping.keys()));

            if (masterMacros.length > 0) {
                const macrosToInsert = masterMacros.map(macro => ({
                    food_id: foodMapping.get(macro.food_id), // Use the new foods.id
                    macro_name: macro.macro_name,
                    value: macro.value,
                    unit: macro.unit,
                }));

                await db('food_macros').insert(macrosToInsert);
            }

            console.log('DEBUG: Copied master food macros for user_id:', newUser.id);
        }

        const token = jwt.sign(
            { id: newUser.id, username: newUser.username },
            process.env.JWT_SECRET || 'your_secret_key',
            { expiresIn: '1h' }
        );

        console.log('DEBUG: Generated JWT token for user:', newUser.username);
        res.status(201).json({ token });
    } catch (err) {
        console.error('DEBUG: Error in POST /signup:', err.message, err.stack);
        if (err.message.includes('duplicate key value violates unique constraint')) {
            if (err.message.includes('users_username_unique')) {
                return res.status(409).json({ error: 'Username already exists' });
            }
            if (err.message.includes('users_email_unique')) {
                return res.status(409).json({ error: 'Email already exists' });
            }
        }
        res.status(500).json({ error: 'Failed to create user', details: err.message });
    }
});

module.exports = router;
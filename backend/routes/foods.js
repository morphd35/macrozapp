// backend/routes/foods.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all foods
router.get('/', async (req, res) => {
    try {
        const foods = await db('foods').select('*');
        res.json(foods);
    } catch (err) {
        console.error('Error fetching foods:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to fetch foods' });
    }
});

// Add a new food
router.post('/', async (req, res) => {
    const { name, protein_g, carbs_g, fats_g, sugars_g, calories, serving_size, category, sodium_mg, cholesterol_mg } = req.body;
    try {
        const [newFood] = await db('foods')
            .insert({
                name,
                protein_g,
                carbs_g,
                fats_g,
                sugars_g,
                calories,
                serving_size,
                category,
                sodium_mg: sodium_mg || null,
                cholesterol_mg: cholesterol_mg || null,
            })
            .returning('*');
        res.status(201).json(newFood);
    } catch (err) {
        console.error('Error adding food:', err.message, err.stack);
        if (err.code === '23505') { // PostgreSQL duplicate key error
            res.status(400).json({ error: 'Food with this name already exists. Please use a unique name.' });
        } else {
            res.status(500).json({ error: 'Failed to add food' });
        }
    }
});

// Update a food
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, protein_g, carbs_g, fats_g, sugars_g, calories, serving_size, category, sodium_mg, cholesterol_mg } = req.body;
    try {
        const [food] = await db('foods')
            .where('id', id)
            .update({
                name,
                protein_g,
                carbs_g,
                fats_g,
                sugars_g,
                calories,
                serving_size,
                category: category || 'custom',
                sodium_mg: sodium_mg || null,
                cholesterol_mg: cholesterol_mg || null,
            })
            .returning('*');
        if (!food) {
            return res.status(404).json({ error: 'Food not found' });
        }
        console.log('Updated food:', food);
        res.json(food);
    } catch (err) {
        console.error('Error in PUT /foods/:id:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to update food' });
    }
});

// Delete a food
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // Delete associated food logs
        await db('food_logs').where('food_id', id).del();

        // Delete the food
        const [food] = await db('foods')
            .where('id', id)
            .del()
            .returning('*');
        if (!food) {
            return res.status(404).json({ error: 'Food not found' });
        }
        console.log('Deleted food and logs:', food);
        res.json(food);
    } catch (err) {
        console.error('Error in DELETE /foods/:id:', err.message, err.stack);
        res.status(500).json({ error: 'Failed to delete food' });
    }
});

module.exports = router;
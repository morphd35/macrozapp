const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', async (req, res) => {
    try {
        const categories = await db('categories').select('*');
        res.json(categories);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        const [newCategory] = await db('categories').insert({ name }).returning('*');
        res.status(201).json(newCategory);
    } catch (err) {
        res.status(500).json({ error: 'Failed to add category' });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const [updatedCategory] = await db('categories').where({ id }).update({ name }).returning('*');
        res.json(updatedCategory);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update category' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db('categories').where({ id }).del();
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete category' });
    }
});

module.exports = router;
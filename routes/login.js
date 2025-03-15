// backend/routes/login.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const router = express.Router();

console.log('Loading login route'); // Debug log on file load

router.post('/', async (req, res) => {
    console.log('Handling login request with body:', req.body); // Debug log
    const { username, password } = req.body;
    const db = req.app.get('db');
    const user = await db('users').where({ username }).first();

    if (user) {
        console.log('Found user:', user);
        console.log('Stored hashed password:', user.password);
        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match result:', isMatch);
        if (isMatch) {
            const token = jwt.sign({ id: user.id, username }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.json({ token });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

module.exports = router;
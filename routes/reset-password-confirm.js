// backend/routes/reset-password-confirm.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const router = express.Router();

router.post('/', async (req, res) => {
    const { token, newPassword } = req.body;
    const db = req.app.get('db');

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        const user = await db('users').where({ id: userId }).first();
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 8);
        await db('users').where({ id: userId }).update({ password: hashedNewPassword });

        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error('Reset password confirm error:', err);
        res.status(400).json({ error: 'Invalid or expired token' });
    }
});

module.exports = router;
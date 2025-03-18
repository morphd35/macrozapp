// backend/routes/reset-password.js
const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const router = express.Router();

// Dynamically determine the frontend base URL for production or development
const getFrontendBaseUrl = () => {
    console.log('NODE_ENV:', process.env.NODE_ENV); // Debug log
    console.log('HEROKU_APP_NAME:', process.env.HEROKU_APP_NAME); // Heroku-specific env
    if (process.env.FRONTEND_BASE_URL) {
        return process.env.FRONTEND_BASE_URL; // Use env var if set
    }
    if (process.env.NODE_ENV === 'production' || process.env.HEROKU_APP_NAME) {
        return 'https://macrozapp.com';
    }
    return 'http://localhost:3001';
};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

router.post('/', async (req, res) => {
    const { email } = req.body;
    console.log('Received email for reset:', email);
    const db = req.app.get('db');
    const user = await db('users').where({ email: email.toLowerCase() }).first();
    console.log('Queried user:', user);

    if (user) {
        const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const resetLink = `${getFrontendBaseUrl()}/reset-password-confirm?token=${resetToken}`;

        const mailOptions = {
            from: '"Macrozapp Support" <support@macrozapp.com>',
            to: email,
            subject: 'Password Reset Request for Macrozapp',
            text: `You requested a password reset for Macrozapp. Click the link below to reset your password:\n\n${resetLink}\n\nThis link expires in 1 hour. If you did not request this, please ignore this email.`,
            html: `
        <h2>Password Reset Request for Macrozapp</h2>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetLink}" style="background-color: #1abc9c; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link expires in 1 hour. If you did not request this, please ignore this email.</p>
      `,
        };

        try {
            await transporter.sendMail(mailOptions);
            res.json({ message: 'A reset link has been sent to your email.' });
        } catch (err) {
            console.error('Error sending email:', err);
            res.status(500).json({ error: 'Failed to send reset email. Please try again later.', details: err.message });
        }
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

module.exports = router;
// backend/routes/reset-password.js
const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const router = express.Router();


// backend/routes/reset-password.js
console.log('DEBUG: reset-password.js loaded with marker 2025-03-19-00:30');

// Override console.log to force immediate output
console.log = (...args) => {
    process.stdout.write('DEBUG: ' + args.join(' ') + '\n');
    process.stdout.write('\n'); // Ensure flush
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
    console.log('DEBUG: Received email for reset:', email);
    const db = req.app.get('db');
    const user = await db('users').where({ email: email.toLowerCase() }).first();
    console.log('DEBUG: Queried user:', user);

    if (user) {
        const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        const baseUrl = process.env.FRONTEND_BASE_URL;
        console.log('DEBUG: Sending Link in email:', baseUrl);
        const resetLink = `https://macrozapp.com/reset-password-confirm?token=${resetToken}`;
        console.log('DEBUG: Link Created for email:', resetLink);

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
            console.log('DEBUG: Attempting to send email with link:', resetLink);
            await transporter.sendMail(mailOptions);
            console.log('DEBUG: Email sent successfully for reset link:', resetLink);
            res.json({ message: 'A reset link has been sent to your email.' });
        } catch (err) {
            console.error('DEBUG: Error sending email:', err);
            res.status(500).json({ error: 'Failed to send reset email. Please try again later.', details: err.message });
        }
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

module.exports = router;
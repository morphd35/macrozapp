const express = require('express');
const router = express.Router();
const axios = require('axios');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
require('dotenv').config();
const jwt = require('jsonwebtoken');

const isProduction = process.env.NODE_ENV === 'production';
process.env.FRONTEND_BASE_URL = isProduction ? 'https://macrozapp.com' : 'http://localhost:3001';
console.log('payment.js - FRONTEND_BASE_URL set to:', process.env.FRONTEND_BASE_URL);

// Middleware to check if user is authenticated
const checkAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token provided.' });
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.id) return res.status(401).json({ message: 'Invalid token.' });
        const userId = decoded.id;
        const db = req.app.get('db');
        if (!db) return res.status(500).json({ message: 'Database not initialized.' });
        const result = await db('users').where({ id: userId }).first();
        if (!result) return res.status(401).json({ message: 'User not found.' });
        req.user = result;
        next();
    } catch (error) {
        console.error('Error checking authentication:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Middleware to check if user is paid (subscription or one-time)
const checkPaidUser = async (req, res, next) => {
    try {
        if (!req.user || (!req.user.is_paid && !req.user.is_paid_onetime)) {
            return res.status(403).json({ message: 'This feature requires a paid account (subscription or one-time).' });
        }
        next();
    } catch (error) {
        console.error('Error checking paid status:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Middleware to check if user is an admin (unchanged)
const checkAdmin = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).json({ message: 'No token provided.' });
        const decoded = jwt.decode(token);
        if (!decoded || !decoded.id) return res.status(401).json({ message: 'Invalid token.' });
        const userId = decoded.id;
        const db = req.app.get('db');
        if (!db) return res.status(500).json({ message: 'Database not initialized.' });
        const result = await db('users').where({ id: userId }).select('is_admin').first();
        if (!result || !result.is_admin) return res.status(403).json({ message: 'Admin access required.' });
        req.user = result;
        next();
    } catch (error) {
        console.error('Error checking admin status:', error);
        res.status(500).json({ message: 'Server error.' });
    }
};

// Get user data (updated to include is_paid_onetime)
router.get('/me', checkAuth, (req, res) => {
    console.log('GET /me route handler reached');
    res.json({
        id: req.user.id,
        email: req.user.email,
        isPaid: req.user.is_paid,
        isPaidOneTime: req.user.is_paid_onetime, // Add this
    });
});

// Create a Stripe checkout session for one-time payment
router.post('/create-checkout-session', checkAuth, async (req, res) => {
    try {
        console.log('Creating checkout session for one-time payment');
        console.log('Stripe Price ID:', 'price_1RC4eDBa8HVRsYMjwAaWfBHI'); // Log the Price ID for debugging
        console.log('FRONTEND_BASE_URL:', process.env.FRONTEND_BASE_URL); // Confirm the URL
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: 'price_1R5m8LBQIfCheXjYffWYhT57', // Replace with your Stripe Price ID
                    quantity: 1,
                },
            ],
            mode: 'payment', // One-time payment
            success_url: `${process.env.FRONTEND_BASE_URL}/payment-success-onetime?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_BASE_URL}/payment-cancel`,
            metadata: { userId: req.user.id.toString() },
        });
        console.log('Success URL set to:', session.success_url);
        res.json({ sessionId: session.id });
    } catch (error) {
        console.error('Error creating checkout session:', error);
        res.status(500).json({ message: 'Error creating checkout session.', details: error.message });
    }
});
// Verify payment and update user status for one-time payment
router.get('/verify-payment', checkAuth, async (req, res) => {
    const { session_id } = req.query;
    try {
        console.log('Verifying payment for session:', session_id);
        if (!session_id) {
            console.log('No session_id provided in query');
            return res.status(400).json({ message: 'Session ID is required.' });
        }

        const session = await stripe.checkout.sessions.retrieve(session_id);
        console.log('Retrieved Stripe session:', session);
        console.log('Session payment status:', session.payment_status);

        if (session.payment_status === 'paid') {
            console.log('Payment status is paid, updating user...');
            const db = req.app.get('db');
            if (!db) {
                console.log('Database not initialized');
                return res.status(500).json({ message: 'Database not initialized.' });
            }

            const userBeforeUpdate = await db('users').where({ id: req.user.id }).first();
            console.log('User before update:', userBeforeUpdate);

            const updateResult = await db('users')
                .where({ id: req.user.id })
                .update({ is_paid_onetime: true })
                .returning('*');
            console.log(`Updated user ${req.user.id} to is_paid_onetime: true`, updateResult);

            const userAfterUpdate = await db('users').where({ id: req.user.id }).first();
            console.log('User after update:', userAfterUpdate);

            res.json({ success: true });
        } else {
            console.log('Payment not completed, status:', session.payment_status);
            res.status(400).json({ message: 'Payment not completed.' });
        }
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ message: 'Error verifying payment.', details: error.message });
    }
});

// Existing endpoints (e.g., /food-lookup, /food-nutrients) remain unchanged
// They’ll work for both is_paid and is_paid_onetime users due to updated checkPaidUser

module.exports = router;
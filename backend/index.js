// backend/index.js

const express = require('express');
const cors = require('cors');
const app = express(); // Initialize app first

// Enable CORS for localhost:3001
app.use(cors({
    origin: 'http://localhost:3001',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'content-type']
}));

// Middleware

app.use(express.json());

require('dotenv').config();

const foodLogsRoutes = require('./routes/food_logs');
const foodRoutes = require('./routes/foods');
app.use('/api/foods', foodRoutes);
const weightLogsRoutes = require('./routes/weight_logs');

// Mount the routes
app.use('/api/food_logs', foodLogsRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/weight_logs', weightLogsRoutes);
app.use('/api/categories', require('./routes/categories'));

// Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
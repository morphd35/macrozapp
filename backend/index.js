const express = require('express');
const cors = require('cors');
const knex = require('knex');
const app = express();

//backend/inded.js
const allowedOrigins = [
    'http://localhost:3000', // Default React port (just in case)
    'http://localhost:3001', // Your current frontend port
    'https://macrozapp.com',
    'https://www.macrozapp.com',
    'https://macrozapp.vercel.app',

];

const corsOptions = {
    origin: (origin, callback) => {
        console.log('CORS check - Origin:', origin);
        if (!origin || allowedOrigins.includes(origin)) {
            console.log('CORS allowed for:', origin);
            callback(null, true);
        } else {
            console.log('CORS rejected:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Apply CORS to all OPTIONS requests

app.use(express.json());

// Add this right after app.use(express.json())
app.use((req, res, next) => {
    console.log(`Received ${req.method} request to ${req.url} with headers:`, req.headers);
    next();
});



app.use((req, res, next) => {
    console.log(`Incoming ${req.method} request to ${req.url} with body:`, req.body);
    next();
});

app.use((req, res, next) => {
    if (req.path === '/login' && req.method === 'POST') {
        console.log('Redirecting /login to /api/login');
        req.url = '/api/login'; // Replace, don’t append
    }
    next();
});

// Serve static files with cache control (add after app.use(express.json()))
app.use(express.static('frontend/build', {
    setHeaders: (res, path) => {
        if (path.endsWith('.js') || path.endsWith('.css') || path.endsWith('.png') || path.endsWith('.jpg')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
    },
}));
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
});
app.use((req, res, next) => {
    // Add Content-Security-Policy
    res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
    next();
});

// backend/index.js
app.use((req, res, next) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    next();
});

require('dotenv').config();
console.log('JWT_SECRET:', process.env.JWT_SECRET);

const isProduction = process.env.NODE_ENV === 'production';
const dbConfig = isProduction ? 'production' : 'development';
const db = knex(require('./knexfile')[dbConfig]);
app.set('db', db);

const foodLogsRoutes = require('./routes/food_logs');
const foodRoutes = require('./routes/foods');
const weightLogsRoutes = require('./routes/weight_logs');
const categoriesRoutes = require('./routes/categories');

try {
    const loginRoutes = require('./routes/login'); // Define here
    app.use('/api/login', (req, res, next) => {
        console.log(`API Login ${req.method} request received:`, {
            url: req.url,
            headers: req.headers,
            body: req.body,
        });
        next();
    });
    app.use('/api/login', loginRoutes);
    console.log('Login route mounted at /api/login');
} catch (err) {
    console.error('Error loading login route:', err);
}

const signupRoutes = require('./routes/signup');
app.use('/api/signup', signupRoutes);
console.log('Signup route mounted at /api/signup');

// backend/index.js (modify the reset-password route mounting) 
console.log('DEBUG: Clearing module cache for reset-password.js');
delete require.cache[require.resolve('./routes/reset-password')];
const resetPasswordRoutes = require('./routes/reset-password');
app.use('/api/reset-password', resetPasswordRoutes);
console.log('Reset password route mounted at /api/reset-password');

const resetPasswordConfirmRoutes = require('./routes/reset-password-confirm');
app.use('/api/reset-password-confirm', resetPasswordConfirmRoutes);
console.log('Reset password confirm route mounted at /api/reset-password-confirm');

app.all('/api/login/test', (req, res) => {
    res.json({ method: req.method, url: req.url });
});

app.use('/api/food_logs', foodLogsRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/weight_logs', weightLogsRoutes);
app.use('/api/categories', categoriesRoutes);
// backend/index.js
app.use((req, res, next) => {
    console.log(`Incoming ${req.method} request to ${req.url} with headers:`, req.headers, 'body:', req.body);
    next();
});

// app.get('/', (req, res) => {
//     res.json({ message: 'Macrozapp Backend API' });
// });

// Add this after all app.use() calls
console.log('Registered routes:');
app._router.stack.forEach((middleware) => {
    if (middleware.route) {
        const fullPath = middleware.route.path.startsWith('/')
            ? middleware.route.path
            : '/' + middleware.route.path;
        console.log(`${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${fullPath}`);
    } else if (middleware.name === 'router' && middleware.regexp) {
        middleware.handle.stack.forEach((handler) => {
            if (handler.route) {
                const basePath = middleware.regexp.toString().replace(/^\^|\$$/g, '').replace(/\\/g, '');
                const routePath = handler.route.path.startsWith('/')
                    ? handler.route.path
                    : '/' + handler.route.path;
                const fullPath = basePath + routePath;
                console.log(`${Object.keys(handler.route.methods).join(', ').toUpperCase()} ${fullPath}`);
            }
        });
    }
});

app.get('/test', (req, res) => res.send('Test route working'));
app.post('/test-post', (req, res) => res.json({ message: 'POST test successful', body: req.body }));
app.all('*', (req, res) => {
    res.status(404).send(`Cannot ${req.method} ${req.path}`);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
// backend/knexfile.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

module.exports = {
    development: {
        client: 'pg',
        connection: {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD || 'Har(35)Ley!',
            database: process.env.DB_NAME || 'macro_tracker',
            port: process.env.DB_PORT || 5432,
        },
        migrations: {
            directory: './migrations',
        },
        seeds: {
            directory: './seeds',
        },
    },
    // Make sure this goes to Neon for Prod.
    production: {
        client: 'pg',
        connection: {
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false },
        },
        pool: { min: 2, max: 10 },
        migrations: {
            directory: './migrations',
        },
        seeds: {
            directory: './seeds',
        },
    },
};
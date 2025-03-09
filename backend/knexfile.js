// backend/knexfile.js
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
};
const path = require('path');
const { Client } = require('pg');

const dotenvPath = path.join(__dirname, '..', 'backend', '.env');
require('dotenv').config({ path: dotenvPath });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'macro_tracker',
};

const main = async () => {
    const client = new Client(dbConfig);
    await client.connect();
    const res = await client.query('SELECT id, username, email FROM users ORDER BY id');
    await client.end();

    if (res.rowCount === 0) {
        console.log('No users found in local DB.');
        return;
    }

    console.table(res.rows);
};

main().catch((err) => {
    console.error('List users failed:', err.message);
    process.exit(1);
});

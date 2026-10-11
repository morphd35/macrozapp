const path = require('path');
const { Client } = require('pg');
const bcrypt = require('bcrypt');

const dotenvPath = path.join(__dirname, '..', 'backend', '.env');
require('dotenv').config({ path: dotenvPath });

const args = process.argv.slice(2);
const getArg = (name) => {
    const idx = args.indexOf(name);
    if (idx === -1 || idx === args.length - 1) return null;
    return args[idx + 1];
};

const username = getArg('--username');
const email = getArg('--email');
const password = getArg('--password');

if (!password || (!username && !email)) {
    console.error('Usage: node scripts/reset-local-password.js --username <name> --password <newPassword>');
    console.error('   or: node scripts/reset-local-password.js --email <email> --password <newPassword>');
    process.exit(1);
}

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'macro_tracker',
};

const main = async () => {
    const hash = await bcrypt.hash(password, 10);
    const client = new Client(dbConfig);
    await client.connect();

    let res;
    if (username) {
        res = await client.query(
            'UPDATE users SET password = $1 WHERE username = $2 RETURNING id, username, email',
            [hash, username]
        );
    } else {
        res = await client.query(
            'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, username, email',
            [hash, email]
        );
    }

    await client.end();

    if (res.rowCount === 0) {
        console.error('No user found for that identifier.');
        process.exit(1);
    }

    console.log(`Password updated for user: ${res.rows[0].username}`);
};

main().catch((err) => {
    console.error('Reset failed:', err.message);
    process.exit(1);
});

const path = require('path');
const { spawnSync } = require('child_process');

const dotenvPath = path.join(__dirname, '..', 'backend', '.env');
require('dotenv').config({ path: dotenvPath });

if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed in production. Set NODE_ENV=development.');
    process.exit(1);
}

if (process.env.DATABASE_URL) {
    console.error('Refusing to seed with DATABASE_URL set. Unset it for local seeding.');
    process.exit(1);
}

const dbName = process.env.DB_NAME || 'macro_tracker';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '5432';
const dbUser = process.env.DB_USER || 'postgres';
const seedFile = path.join(__dirname, '..', 'db', 'seed.sql');

const env = process.env.DB_PASSWORD
    ? { ...process.env, PGPASSWORD: process.env.DB_PASSWORD }
    : process.env;

const result = spawnSync(
    'psql',
    ['-h', dbHost, '-p', dbPort, '-U', dbUser, '-d', dbName, '-f', seedFile],
    {
        stdio: 'inherit',
        shell: false,
        env,
    }
);

if (result.error) {
    console.error('Failed to run psql. Make sure Postgres CLI is installed and on PATH.');
    process.exit(1);
}

process.exit(result.status || 0);

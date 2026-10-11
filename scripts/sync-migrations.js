const fs = require('fs');
const path = require('path');
const knexFactory = require('knex');

const dotenvPath = path.join(__dirname, '..', 'backend', '.env');
require('dotenv').config({ path: dotenvPath });

if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to sync migrations with NODE_ENV=production.');
    process.exit(1);
}

if (process.env.DATABASE_URL) {
    console.error('Refusing to sync migrations with DATABASE_URL set. Unset it for local safety.');
    process.exit(1);
}

const knexConfig = require(path.join(__dirname, '..', 'backend', 'knexfile')).development;
const knex = knexFactory(knexConfig);

const ensureMigrationsTables = async () => {
    const hasMigrations = await knex.schema.hasTable('knex_migrations');
    if (!hasMigrations) {
        await knex.schema.createTable('knex_migrations', (table) => {
            table.increments('id').primary();
            table.string('name');
            table.integer('batch');
            table.timestamp('migration_time');
        });
    }

    const hasLock = await knex.schema.hasTable('knex_migrations_lock');
    if (!hasLock) {
        await knex.schema.createTable('knex_migrations_lock', (table) => {
            table.increments('index').primary();
            table.integer('is_locked');
        });
        await knex('knex_migrations_lock').insert({ is_locked: 0 });
    }
};

const main = async () => {
    try {
        await ensureMigrationsTables();

        const migrationsDir = path.join(__dirname, '..', 'backend', 'migrations');
        const files = fs
            .readdirSync(migrationsDir)
            .filter((file) => file.endsWith('.js'))
            .sort();

        const existing = await knex('knex_migrations').select('name');
        const existingSet = new Set(existing.map((row) => row.name));

        const pending = files.filter((file) => !existingSet.has(file));
        if (pending.length === 0) {
            console.log('All migrations are already marked as applied.');
            return;
        }

        const maxBatchRow = await knex('knex_migrations').max({ max: 'batch' }).first();
        const nextBatch = (maxBatchRow?.max || 0) + 1;

        const now = new Date();
        const rows = pending.map((name) => ({
            name,
            batch: nextBatch,
            migration_time: now,
        }));

        await knex('knex_migrations').insert(rows);
        console.log(`Marked ${rows.length} migrations as applied in batch ${nextBatch}.`);
    } finally {
        await knex.destroy();
    }
};

main().catch((err) => {
    console.error('Failed to sync migrations:', err.message);
    process.exit(1);
});

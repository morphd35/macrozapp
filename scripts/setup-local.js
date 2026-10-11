const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const args = new Set(process.argv.slice(2));
const wantsSeed = args.has('--seed');
const wantsRepairGoals = args.has('--repair-goals');
const wantsSyncMigrations = args.has('--sync-migrations');
const dotenvPath = path.join(__dirname, '..', 'backend', '.env');
const dotenvExamplePath = path.join(__dirname, '..', 'backend', '.env.example');

if (!fs.existsSync(dotenvPath)) {
    console.error('Missing backend/.env. Create it from backend/.env.example first.');
    console.error('Example path:', dotenvExamplePath);
    process.exit(1);
}

require('dotenv').config({ path: dotenvPath });

if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to run local setup with NODE_ENV=production.');
    process.exit(1);
}

if (process.env.DATABASE_URL) {
    console.error('Refusing to run local setup with DATABASE_URL set. Unset it for local safety.');
    process.exit(1);
}

const run = (command, argsList) => {
    const result = spawnSync(command, argsList, { stdio: 'inherit', shell: true });
    if (result.error) {
        console.error(`Failed to run ${command}.`);
        process.exit(1);
    }
    if (result.status !== 0) {
        process.exit(result.status || 1);
    }
};

const runCapture = (command, argsList) => {
    return spawnSync(command, argsList, {
        encoding: 'utf8',
        shell: true,
    });
};

if (wantsRepairGoals) {
    console.log('Repairing goals table...');
    run('node', ['scripts/repair-goals.js']);
} else if (wantsSyncMigrations) {
    console.log('Syncing migrations (mark as applied)...');
    run('node', ['scripts/sync-migrations.js']);
} else {
    console.log('Running migrations...');
    const result = runCapture('npx', ['knex', 'migrate:latest', '--knexfile', 'backend/knexfile.js']);
    if (result.error) {
        console.error('Failed to run migrations.');
        process.exit(1);
    }
    if (result.status !== 0) {
        const output = `${result.stdout || ''}${result.stderr || ''}`.toLowerCase();
        const alreadyExists = output.includes('already exists') && output.includes('relation');
        if (alreadyExists) {
            console.log('Detected existing tables. Syncing migrations instead...');
            run('node', ['scripts/sync-migrations.js']);
        } else {
            process.exit(result.status || 1);
        }
    }
}

if (wantsSeed) {
    console.log('Seeding local data...');
    run('node', ['scripts/seed-local.js']);
}

console.log('Starting dev servers...');
run('npm', ['run', 'dev']);

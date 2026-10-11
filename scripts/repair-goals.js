const path = require('path');
const { spawnSync } = require('child_process');

const dotenvPath = path.join(__dirname, '..', 'backend', '.env');
require('dotenv').config({ path: dotenvPath });

if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to repair goals with NODE_ENV=production.');
    process.exit(1);
}

if (process.env.DATABASE_URL) {
    console.error('Refusing to repair goals with DATABASE_URL set. Unset it for local safety.');
    process.exit(1);
}

const dbName = process.env.DB_NAME || 'macro_tracker';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '5432';
const dbUser = process.env.DB_USER || 'postgres';

const buildPsqlArgs = (extraArgs) => [
    '-h',
    dbHost,
    '-p',
    dbPort,
    '-U',
    dbUser,
    '-d',
    dbName,
    ...extraArgs,
];

const buildEnv = () => {
    if (process.env.DB_PASSWORD) {
        return { ...process.env, PGPASSWORD: process.env.DB_PASSWORD };
    }
    return process.env;
};

const runPsql = (sql) => {
    const result = spawnSync('psql', buildPsqlArgs(['-v', 'ON_ERROR_STOP=1', '-c', sql]), {
        stdio: 'inherit',
        shell: false,
        env: buildEnv(),
    });
    if (result.error) {
        console.error('Failed to run psql. Make sure Postgres CLI is installed and on PATH.');
        process.exit(1);
    }
    if (result.status !== 0) {
        process.exit(result.status || 1);
    }
};

const runPsqlCapture = (sql) => {
    const result = spawnSync('psql', buildPsqlArgs(['-t', '-A', '-c', sql]), {
        encoding: 'utf8',
        shell: false,
        env: buildEnv(),
    });
    if (result.error || result.status !== 0) {
        return '';
    }
    return (result.stdout || '').trim();
};

console.log('Backing up user_macro_goals...');
runPsql('ALTER TABLE user_macro_goals RENAME TO user_macro_goals_backup;');

console.log('Running migrations...');
const migrate = spawnSync('npx', ['knex', 'migrate:latest', '--knexfile', 'backend/knexfile.js'], {
    stdio: 'inherit',
    shell: true,
});
if (migrate.error || migrate.status !== 0) {
    process.exit(migrate.status || 1);
}

const goalsTableExists = runPsqlCapture(
    "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_macro_goals' LIMIT 1;"
) === '1';

if (!goalsTableExists) {
    console.log('Creating user_macro_goals table...');
    runPsql(
        "CREATE TABLE user_macro_goals (" +
        "id SERIAL PRIMARY KEY, " +
        "user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, " +
        "macro_name VARCHAR(50) NOT NULL, " +
        "target_value DOUBLE PRECISION NOT NULL, " +
        "unit VARCHAR(20) NOT NULL, " +
        "created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, " +
        "updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP, " +
        "goal_type VARCHAR(20) NOT NULL DEFAULT 'stay_under', " +
        "UNIQUE (user_id, macro_name)" +
        ");"
    );
    runPsql('CREATE INDEX IF NOT EXISTS user_macro_goals_user_id_idx ON user_macro_goals (user_id);');
}

const backupExists = runPsqlCapture(
    "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_macro_goals_backup' LIMIT 1;"
) === '1';

if (backupExists) {
    const hasGoalType = runPsqlCapture(
        "SELECT 1 FROM information_schema.columns WHERE table_name='user_macro_goals_backup' AND column_name='goal_type' LIMIT 1;"
    ) === '1';

    console.log('Restoring goals...');
    if (hasGoalType) {
        runPsql(
            "INSERT INTO user_macro_goals (user_id, macro_name, target_value, unit, created_at, updated_at, goal_type) " +
            "SELECT user_id, macro_name, target_value, unit, created_at, updated_at, COALESCE(goal_type, 'stay_under') " +
            'FROM user_macro_goals_backup;'
        );
    } else {
        runPsql(
            'INSERT INTO user_macro_goals (user_id, macro_name, target_value, unit, created_at, updated_at) ' +
            'SELECT user_id, macro_name, target_value, unit, created_at, updated_at FROM user_macro_goals_backup;'
        );
    }

    console.log('Dropping backup table...');
    runPsql('DROP TABLE user_macro_goals_backup;');
} else {
    console.log('No backup table found. Goals table is ready.');
}

console.log('Done.');

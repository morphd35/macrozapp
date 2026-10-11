const path = require('path');
const { Client } = require('pg');

const dotenvPath = path.join(__dirname, '..', 'backend', '.env');
require('dotenv').config({ path: dotenvPath });

if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to modify schema with NODE_ENV=production.');
    process.exit(1);
}

if (process.env.DATABASE_URL) {
    console.error('Refusing to modify schema with DATABASE_URL set. Unset it for local safety.');
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
    const client = new Client(dbConfig);
    await client.connect();

    const tableRes = await client.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_macro_goals' LIMIT 1;"
    );
    const tableExists = tableRes.rowCount > 0;

    if (!tableExists) {
        await client.query(
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
        await client.query('CREATE INDEX IF NOT EXISTS user_macro_goals_user_id_idx ON user_macro_goals (user_id);');
        console.log('Created user_macro_goals table.');
    }

    const colRes = await client.query(
        "SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='user_macro_goals' AND column_name='goal_type' LIMIT 1;"
    );
    const hasGoalType = colRes.rowCount > 0;
    if (!hasGoalType) {
        await client.query("ALTER TABLE user_macro_goals ADD COLUMN goal_type VARCHAR(20) NOT NULL DEFAULT 'stay_under';");
        console.log('Added goal_type column to user_macro_goals.');
    }

    await client.end();
    console.log('Goals table is ready.');
};

main().catch((err) => {
    console.error('Failed to ensure goals table:', err.message);
    process.exit(1);
});

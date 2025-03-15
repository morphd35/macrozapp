exports.up = async function (knex) {
    await knex.schema.dropTableIfExists('user_goals');
    await knex.schema.createTable('user_macro_goals', (table) => {
        table.increments('id').primary();
        table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.string('macro_name', 50).notNullable();
        table.double('target_value').notNullable();
        table.string('unit', 20).notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.unique(['user_id', 'macro_name']);
        table.index('user_id');
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTable('user_macro_goals');
    await knex.schema.createTable('user_goals', (table) => {
        table.increments('id').primary();
        table.integer('user_id').notNullable().references('id').inTable('users');
        table.double('calories_goal');
        table.double('protein_goal');
        table.double('carbs_goal');
        table.double('fats_goal');
        table.double('sugars_goal');
        table.double('sodium_goal');
        table.double('cholesterol_goal');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
        table.string('notes', 255);
    });
};

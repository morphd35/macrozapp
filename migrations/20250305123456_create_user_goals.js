// backend/migrations/20250305123456_create_user_goals.js
exports.up = function (knex) {
    return knex.schema.createTable('user_goals', table => {
        table.increments('id').primary();
        table.integer('user_id').notNullable().references('id').inTable('users');
        table.integer('calories_goal');
        table.integer('protein_goal');
        table.integer('carbs_goal');
        table.integer('fats_goal');
        table.integer('sugars_goal');
        table.integer('sodium_goal');
        table.integer('cholesterol_goal');
        table.timestamp('created_at').defaultTo(knex.fn.now());
        table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
};

exports.down = function (knex) {
    return knex.schema.dropTable('user_goals');
};
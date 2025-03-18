/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.schema.createTable('food_macros', (table) => {
        table.increments('id').primary();
        table.integer('food_id').notNullable().references('id').inTable('foods').onDelete('CASCADE');
        table.string('macro_name', 50).notNullable();
        table.double('value').notNullable();
        table.string('unit', 20).notNullable();
        table.unique(['food_id', 'macro_name']);
        table.index('food_id');
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTable('food_macros');
};


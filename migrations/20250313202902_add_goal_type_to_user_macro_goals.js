/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
    await knex.schema.alterTable('user_macro_goals', (table) => {
        table.string('goal_type', 20).notNullable().defaultTo('stay_under');
    });
};

exports.down = async function (knex) {
    await knex.schema.alterTable('user_macro_goals', (table) => {
        table.dropColumn('goal_type');
    });
};

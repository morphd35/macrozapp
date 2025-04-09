// migrations/20250404_add_is_paid_onetime.js
exports.up = function (knex) {
    return knex.schema.table('users', (table) => {
        table.boolean('is_paid_onetime').defaultTo(false);
    });
};

exports.down = function (knex) {
    return knex.schema.table('users', (table) => {
        table.dropColumn('is_paid_onetime');
    });
};
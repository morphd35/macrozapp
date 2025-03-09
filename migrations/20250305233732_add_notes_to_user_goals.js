// backend/migrations/YYYYMMDDHHMMSS_add_notes_to_user_goals.js
exports.up = function (knex) {
    return knex.schema.table('user_goals', table => {
        table.string('notes');
    });
};

exports.down = function (knex) {
    return knex.schema.table('user_goals', table => {
        table.dropColumn('notes');
    });
};

exports.up = function (knex) {
    return knex.schema.hasTable('users').then(exists => {
        if (!exists) {
            return knex.schema.createTable('users', table => {
                table.increments('id').primary();
                table.string('username', 50).notNullable().unique();
                table.string('password', 100).notNullable();
                table.string('email', 255).unique();
                table.timestamp('created_at').defaultTo(knex.fn.now());
            });
        } else {
            return knex.schema.table('users', table => {
                table.string('username', 50).notNullable().unique().alter(); // Ensure unique constraint
                table.string('password', 100).notNullable().alter();
                table.string('email', 255).unique().alter(); // Add if not exists
                table.timestamp('created_at').defaultTo(knex.fn.now()).alter(); // Add if not exists
            });
        }
    });
};

exports.down = function (knex) {
    return knex.schema.table('users', table => {
        table.dropColumn('username');
        table.dropColumn('password');
        table.dropColumn('email');
        table.dropColumn('created_at');
    });
};
/**
 * MoveZapp initial schema
 * Uses INTEGER user_id to match Macrozapp JWT payload (id=3)
 */

exports.up = async function (knex) {
    // training_sessions
    await knex.schema.createTable("training_sessions", (t) => {
        t.increments("id").primary();
        t.integer("user_id").notNullable().index();
        t.timestamp("started_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        t.text("note");
        t.timestamps(true, true);
    });

    // training_exercises
    await knex.schema.createTable("training_exercises", (t) => {
        t.increments("id").primary();
        t.integer("session_id").notNullable().index()
            .references("id").inTable("training_sessions")
            .onDelete("CASCADE");
        t.text("name").notNullable();
        t.integer("sort_order").notNullable().defaultTo(0);
        t.timestamps(true, true);
    });

    // training_sets
    await knex.schema.createTable("training_sets", (t) => {
        t.increments("id").primary();
        t.integer("exercise_id").notNullable().index()
            .references("id").inTable("training_exercises")
            .onDelete("CASCADE");
        t.integer("set_no").notNullable().defaultTo(1);
        t.decimal("weight", 6, 2).notNullable(); // supports 22.5 etc
        t.integer("reps").notNullable();
        t.text("set_type").notNullable().defaultTo("normal"); // warmup, activation, cluster, etc
        t.text("note");
        t.timestamps(true, true);
    });

    // activity_entries
    await knex.schema.createTable("activity_entries", (t) => {
        t.increments("id").primary();
        t.integer("user_id").notNullable().index();
        t.timestamp("occurred_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
        t.text("activity_type").notNullable(); // walk_dogs, bowling, golf_cart, etc
        t.integer("duration_minutes").notNullable();
        t.decimal("distance", 8, 2); // optional
        t.integer("steps");          // optional
        t.text("intensity");         // optional: easy/moderate/hard
        t.text("note");
        t.timestamps(true, true);
    });

    // Helpful composite indexes
    await knex.schema.alterTable("training_sessions", (t) => {
        t.index(["user_id", "started_at"], "idx_training_sessions_user_date");
    });

    await knex.schema.alterTable("activity_entries", (t) => {
        t.index(["user_id", "occurred_at"], "idx_activity_entries_user_date");
    });
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists("activity_entries");
    await knex.schema.dropTableIfExists("training_sets");
    await knex.schema.dropTableIfExists("training_exercises");
    await knex.schema.dropTableIfExists("training_sessions");
};

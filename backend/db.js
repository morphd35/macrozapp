const knex = require('knex');
const config = require('./knexfile');

// Use the 'development' configuration
const db = knex(config.development);

module.exports = db;
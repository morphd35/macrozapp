CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE foods (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    protein_g DECIMAL(5,2),
    carbs_g DECIMAL(5,2),
    fats_g DECIMAL(5,2),
    sugars_g DECIMAL(5,2),
    calories DECIMAL(5,2),
    serving_size VARCHAR(50),
    category VARCHAR(50)
);

CREATE TABLE food_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    food_id INT REFERENCES foods(id),
    custom_food_name VARCHAR(255),
    protein_g DECIMAL(5,2),
    carbs_g DECIMAL(5,2),
    fats_g DECIMAL(5,2),
    sugars_g DECIMAL(5,2),
    calories DECIMAL(5,2),
    servings DECIMAL(5,2),
    log_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE weight_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    weight_lb DECIMAL(5,2),
    log_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
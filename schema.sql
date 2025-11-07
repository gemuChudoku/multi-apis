-- 1) Create a dedicated schema for Users
CREATE SCHEMA IF NOT EXISTS users_schema AUTHORIZATION caldadmin;

-- 2) Create the Users table within the schema
CREATE TABLE IF NOT EXISTS users_schema.users (
    id SERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    role TEXT NOT NULL,
    company TEXT,
    status VARCHAR(10) CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
    password TEXT NOT NULL
);

-- 3) (Optional) Grant privileges to the admin user
GRANT ALL PRIVILEGES ON SCHEMA users_schema TO caldadmin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA users_schema TO caldadmin;



CREATE SCHEMA IF NOT EXISTS refunds_schema AUTHORIZATION caldadmin;
CREATE TABLE IF NOT EXISTS refunds_schema.refunds (
    id SERIAL PRIMARY KEY,
    sale_id VARCHAR NOT NULL,
    product_name VARCHAR NOT NULL,
    client_name VARCHAR NOT NULL,
    seller VARCHAR NOT NULL,
    refund_date DATE DEFAULT CURRENT_DATE,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending'
);

    Drop TABLE users_schema.users

    Drop TABLE refunds_schema.refunds

    TRUNCATE TABLE users_schema.users RESTART IDENTITY;






 -- esquema de products que ya no se usa

/*

    -- 1) Crear un esquema específico para Products
CREATE SCHEMA IF NOT EXISTS products_schema AUTHORIZATION caldadmin;

-- 2) Crear la tabla dentro del esquema
CREATE TABLE IF NOT EXISTS products_schema.products (
    id SERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    price       NUMERIC NOT NULL,
    stock       INT DEFAULT 0
);

-- 3) (Opcional) Dar privilegios al usuario administrador
GRANT ALL PRIVILEGES ON SCHEMA products_schema TO caldadmin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA products_schema TO caldadmin;

*/
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
};

async function repairDB() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        await connection.query('USE pharmcare_offline');
        console.log('Using pharmcare_offline database...');

        console.log('Dropping old sales tables...');
        await connection.query('SET FOREIGN_KEY_CHECKS = 0');
        await connection.query('DROP TABLE IF EXISTS transaction_items');
        await connection.query('DROP TABLE IF EXISTS sales_items');
        await connection.query('DROP TABLE IF EXISTS sales');
        await connection.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('Creating updated sales table...');
        await connection.query(`CREATE TABLE sales (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        business_name VARCHAR(255),
        business_address TEXT,
        total DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) DEFAULT 0,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        payment_method VARCHAR(50),
        status VARCHAR(50) DEFAULT 'completed',
        sale_type VARCHAR(50) DEFAULT 'retail',
        transaction_id VARCHAR(100),
        cashier_name VARCHAR(255),
        cashier_email VARCHAR(255),
        cashier_id VARCHAR(36),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

        console.log('Creating updated sales_items table...');
        await connection.query(`CREATE TABLE sales_items (
        id VARCHAR(36) PRIMARY KEY,
        sale_id VARCHAR(36),
        inventory_id VARCHAR(36),
        product_name VARCHAR(255),
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        is_wholesale BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (sale_id) REFERENCES sales(id),
        FOREIGN KEY (inventory_id) REFERENCES inventory(id)
    )`);

        console.log('✅ Database repair complete!');
    } catch (err) {
        console.error('❌ Repair failed:', err);
    } finally {
        await connection.end();
    }
}

repairDB();

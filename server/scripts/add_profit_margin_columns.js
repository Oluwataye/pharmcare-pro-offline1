
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'pharmcare_offline',
    port: process.env.DB_PORT || 3307
};

async function addProfitMarginColumns() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database...');

        // 1. Add cost_price to inventory
        try {
            await connection.query(`
                ALTER TABLE inventory 
                ADD COLUMN cost_price DECIMAL(10,2) DEFAULT 0 AFTER unit_price;
            `);
            console.log('✅ Added cost_price to inventory.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️  cost_price already exists in inventory.');
            } else {
                console.error('❌ Failed to update inventory table:', err.message);
            }
        }

        // 2. Add cost_price to sales_items (historical cost tracking)
        try {
            await connection.query(`
                ALTER TABLE sales_items 
                ADD COLUMN cost_price DECIMAL(10,2) DEFAULT 0 AFTER unit_price;
            `);
            console.log('✅ Added cost_price to sales_items.');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️  cost_price already exists in sales_items.');
            } else {
                console.error('❌ Failed to update sales_items table:', err.message);
            }
        }

        console.log('\n✅ Schema update complete!');

    } catch (err) {
        console.error('❌ Database connection failed:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

addProfitMarginColumns();

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function migrate() {
    const dbConfig = {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3307'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '#1Admin123',
        database: process.env.DB_NAME || 'pharmcare_offline'
    };

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // 1. Add cost_price to sales_items for snapshotting
        try {
            await connection.query('ALTER TABLE sales_items ADD COLUMN cost_price DECIMAL(10,2)');
            console.log('✅ Added cost_price to sales_items');
        } catch (e) {
            console.log('ℹ️ cost_price already exists in sales_items');
        }

        // 2. Backfill cost_price from inventory for existing sales_items (approximate)
        console.log('Backfilling cost_price from inventory...');
        await connection.query(`
            UPDATE sales_items si
            JOIN inventory i ON si.inventory_id = i.id
            SET si.cost_price = i.cost_price
            WHERE si.cost_price IS NULL
        `);
        console.log('✅ Backfill complete');

        await connection.end();
    } catch (err) {
        console.error('Migration failed:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'pharmcare_offline'
};

async function fixSchema() {
    console.log(`System Check: DB_PORT is ${process.env.DB_PORT || '3306 (default)'}`);

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL!');

        // Check missing columns
        const [columns] = await connection.query('SHOW COLUMNS FROM inventory');
        const existingColumns = columns.map(c => c.Field);

        const updates = [
            { name: 'sku', sql: 'ALTER TABLE inventory ADD COLUMN sku VARCHAR(50) AFTER name' },
            { name: 'unit', sql: 'ALTER TABLE inventory ADD COLUMN unit VARCHAR(50) AFTER quantity' },
            { name: 'reorder_level', sql: 'ALTER TABLE inventory ADD COLUMN reorder_level INTEGER DEFAULT 10 AFTER low_stock_threshold' },
            { name: 'manufacturer', sql: 'ALTER TABLE inventory ADD COLUMN manufacturer VARCHAR(255) AFTER expiry_date' },
            { name: 'last_updated_by', sql: 'ALTER TABLE inventory ADD COLUMN last_updated_by VARCHAR(36) AFTER batch_number' }
        ];

        for (const update of updates) {
            if (!existingColumns.includes(update.name)) {
                console.log(`Adding column: ${update.name}`);
                await connection.query(update.sql);
            } else {
                console.log(`Column ${update.name} already exists.`);
            }
        }

        console.log('✅ Inventory schema fixed successfully!');
    } catch (err) {
        console.error('❌ Schema fix failed:');
        console.error(err);
    } finally {
        if (connection) await connection.end();
    }
}

fixSchema();

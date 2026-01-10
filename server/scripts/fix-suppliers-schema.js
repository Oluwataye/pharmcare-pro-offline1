import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3307'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pharmcare_offline'
};

async function fixSuppliers() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database...');

        // Check columns
        const [rows] = await connection.query('DESCRIBE suppliers');
        const columnNames = rows.map(r => r.Field);

        if (!columnNames.includes('notes')) {
            console.log('Adding notes column to suppliers...');
            await connection.query('ALTER TABLE suppliers ADD COLUMN notes TEXT');
            console.log('✅ Added notes column.');
        } else {
            console.log('ℹ️ notes column already exists.');
        }

        console.log('✨ Suppliers table check complete.');
    } catch (error) {
        console.error('❌ Check failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

fixSuppliers();

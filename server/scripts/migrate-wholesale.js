import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
};

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL...');
        await connection.query('USE pharmcare_offline');

        console.log('Migrating inventory table...');

        // Add wholesale_price
        try {
            await connection.query('ALTER TABLE inventory ADD COLUMN wholesale_price DECIMAL(10,2) AFTER unit_price');
            console.log('✅ Added wholesale_price column');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ wholesale_price column already exists');
            } else {
                throw e;
            }
        }

        // Add min_wholesale_quantity
        try {
            await connection.query('ALTER TABLE inventory ADD COLUMN min_wholesale_quantity INTEGER DEFAULT 5 AFTER wholesale_price');
            console.log('✅ Added min_wholesale_quantity column');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ min_wholesale_quantity column already exists');
            } else {
                throw e;
            }
        }

        console.log('\nMigration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:');
        console.error(error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();

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

async function repairAnalyticsDB() {
    const connection = await mysql.createConnection(dbConfig);
    try {
        await connection.query('USE pharmcare_offline');
        console.log('Using pharmcare_offline database...');

        console.log('Dropping old print_analytics table...');
        await connection.query('DROP TABLE IF EXISTS print_analytics');

        console.log('Creating updated print_analytics table...');
        await connection.query(`CREATE TABLE print_analytics (
        id VARCHAR(36) PRIMARY KEY,
        sale_id VARCHAR(36),
        receipt_id VARCHAR(36),
        cashier_id VARCHAR(36),
        cashier_name VARCHAR(255),
        customer_name VARCHAR(255),
        print_status VARCHAR(50) NOT NULL,
        error_type VARCHAR(100),
        error_message TEXT,
        print_duration_ms INTEGER,
        is_reprint BOOLEAN DEFAULT FALSE,
        sale_type VARCHAR(50),
        total_amount DECIMAL(10,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

        console.log('✅ Analytics table repair complete!');
    } catch (err) {
        console.error('❌ Repair failed:', err);
    } finally {
        await connection.end();
    }
}

repairAnalyticsDB();

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3307'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '#1Admin123',
    database: process.env.DB_NAME || 'pharmcare_offline',
});

const dbName = process.env.DB_NAME || 'pharmcare_offline';

async function run() {
    // Check if user_agent column exists
    const [cols] = await pool.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'audit_logs' AND COLUMN_NAME = 'user_agent'`,
        [dbName]
    );

    if (cols.length === 0) {
        await pool.query('ALTER TABLE audit_logs ADD COLUMN user_agent varchar(500) DEFAULT NULL');
        console.log('✅ user_agent column added to audit_logs');
    } else {
        console.log('ℹ️  user_agent column already exists');
    }

    // Verify final schema
    const [rows] = await pool.query('DESCRIBE audit_logs');
    console.log('\nCurrent audit_logs columns:');
    rows.forEach(r => console.log(`  ${r.Field} (${r.Type})`));

    await pool.end();
}

run().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

async function fixAuditSchema() {
    console.log(`System Check: DB_PORT is ${process.env.DB_PORT || '3306 (default)'}`);

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Connected to MySQL!');

        // Check missing columns
        const [columns] = await connection.query('SHOW COLUMNS FROM audit_logs');
        const existingColumns = columns.map(c => c.Field);

        const updates = [
            { name: 'user_email', sql: 'ALTER TABLE audit_logs ADD COLUMN user_email VARCHAR(255) AFTER user_id' },
            { name: 'user_role', sql: 'ALTER TABLE audit_logs ADD COLUMN user_role VARCHAR(50) AFTER user_email' },
            { name: 'status', sql: "ALTER TABLE audit_logs ADD COLUMN status VARCHAR(20) DEFAULT 'success' AFTER action" },
            { name: 'resource_type', sql: 'ALTER TABLE audit_logs ADD COLUMN resource_type VARCHAR(100) AFTER status' },
            { name: 'resource_id', sql: 'ALTER TABLE audit_logs ADD COLUMN resource_id VARCHAR(36) AFTER resource_type' },
            { name: 'error_message', sql: 'ALTER TABLE audit_logs ADD COLUMN error_message TEXT AFTER resource_id' }
        ];

        for (const update of updates) {
            if (!existingColumns.includes(update.name)) {
                console.log(`Adding column: ${update.name}`);
                await connection.query(update.sql);
            } else {
                console.log(`Column ${update.name} already exists.`);
            }
        }

        console.log('✅ Audit logs schema fixed successfully!');
    } catch (err) {
        console.error('❌ Schema fix failed:');
        console.error(err);
    } finally {
        if (connection) await connection.end();
    }
}

fixAuditSchema();

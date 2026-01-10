import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'pharmcare_offline'
};

async function fixAuditLogs() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database...');

        // Add missing columns
        try {
            await connection.query('ALTER TABLE audit_logs ADD COLUMN user_email VARCHAR(255)');
            console.log('✅ Added user_email column');
        } catch (e) {
            console.log('ℹ️  user_email column already exists');
        }

        try {
            await connection.query('ALTER TABLE audit_logs ADD COLUMN status VARCHAR(50) DEFAULT "success"');
            console.log('✅ Added status column');
        } catch (e) {
            console.log('ℹ️  status column already exists');
        }

        // Check current count
        const [rows] = await connection.query('SELECT COUNT(*) as count FROM audit_logs');
        console.log(`Current audit logs: ${rows[0].count}`);

        // Add some sample audit logs if empty
        if (rows[0].count === 0) {
            console.log('Adding sample audit logs...');

            const sampleLogs = [
                {
                    id: crypto.randomUUID(),
                    user_id: 'admin-seed-id',
                    user_email: 'admin@pharmcarepro.com',
                    event_type: 'USER_LOGIN',
                    action: 'User logged into the system',
                    status: 'success',
                    ip_address: '127.0.0.1'
                },
                {
                    id: crypto.randomUUID(),
                    user_id: 'admin-seed-id',
                    user_email: 'admin@pharmcarepro.com',
                    event_type: 'SALE_CREATED',
                    action: 'Created new sale transaction',
                    status: 'success',
                    ip_address: '127.0.0.1'
                },
                {
                    id: crypto.randomUUID(),
                    user_id: 'admin-seed-id',
                    user_email: 'admin@pharmcarepro.com',
                    event_type: 'INVENTORY_UPDATE',
                    action: 'Updated inventory item',
                    status: 'success',
                    ip_address: '127.0.0.1'
                }
            ];

            for (const log of sampleLogs) {
                await connection.query(
                    'INSERT INTO audit_logs (id, user_id, user_email, event_type, action, status, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [log.id, log.user_id, log.user_email, log.event_type, log.action, log.status, log.ip_address]
                );
            }
            console.log('✅ Added sample audit logs');
        }

        console.log('\n✅ Audit logs table is ready!');

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        if (connection) await connection.end();
    }
}

fixAuditLogs();

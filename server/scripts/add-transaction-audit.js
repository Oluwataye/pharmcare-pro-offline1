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

async function addTransactionAuditColumns() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database...');

        // Add resource_type column
        try {
            await connection.query('ALTER TABLE audit_logs ADD COLUMN resource_type VARCHAR(50)');
            console.log('✅ Added resource_type column');
        } catch (e) {
            console.log('ℹ️  resource_type column already exists');
        }

        // Add resource_id column
        try {
            await connection.query('ALTER TABLE audit_logs ADD COLUMN resource_id VARCHAR(36)');
            console.log('✅ Added resource_id column');
        } catch (e) {
            console.log('ℹ️  resource_id column already exists');
        }

        // Add some sample transaction audit logs
        const [count] = await connection.query('SELECT COUNT(*) as count FROM audit_logs WHERE resource_type IS NOT NULL');

        if (count[0].count === 0) {
            console.log('Adding sample transaction audit logs...');

            const sampleLogs = [
                {
                    id: crypto.randomUUID(),
                    user_id: 'admin-seed-id',
                    user_email: 'admin@pharmcarepro.com',
                    event_type: 'SALE_CREATED',
                    action: 'Created new sale transaction',
                    resource_type: 'sales',
                    resource_id: crypto.randomUUID(),
                    status: 'success',
                    ip_address: '127.0.0.1'
                },
                {
                    id: crypto.randomUUID(),
                    user_id: 'admin-seed-id',
                    user_email: 'admin@pharmcarepro.com',
                    event_type: 'INVENTORY_UPDATED',
                    action: 'Updated inventory stock levels',
                    resource_type: 'inventory',
                    resource_id: crypto.randomUUID(),
                    status: 'success',
                    ip_address: '127.0.0.1'
                },
                {
                    id: crypto.randomUUID(),
                    user_id: 'admin-seed-id',
                    user_email: 'admin@pharmcarepro.com',
                    event_type: 'REFUND_INITIATED',
                    action: 'Initiated refund request',
                    resource_type: 'refunds',
                    resource_id: crypto.randomUUID(),
                    status: 'success',
                    ip_address: '127.0.0.1'
                }
            ];

            for (const log of sampleLogs) {
                await connection.query(
                    'INSERT INTO audit_logs (id, user_id, user_email, event_type, action, resource_type, resource_id, status, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [log.id, log.user_id, log.user_email, log.event_type, log.action, log.resource_type, log.resource_id, log.status, log.ip_address]
                );
            }
            console.log('✅ Added sample transaction audit logs');
        }

        console.log('\n✅ Transaction audit logging is ready!');

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        if (connection) await connection.end();
    }
}

addTransactionAuditColumns();

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkAuditLogs() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '#1Olorunsogo',
            database: 'pharmcare_offline'
        });

        console.log('--- AUDIT LOG SUMMARY ---');
        const [total] = await connection.query('SELECT COUNT(*) as count FROM audit_logs');
        console.log('Total Logs:', total[0].count);

        const [resTypes] = await connection.query('SELECT resource_type, COUNT(*) as count FROM audit_logs GROUP BY resource_type');
        console.log('Logs by Resource Type:', JSON.stringify(resTypes));

        const [recent] = await connection.query('SELECT event_type, resource_type, action FROM audit_logs ORDER BY created_at DESC LIMIT 5');
        console.log('Recent logs:', JSON.stringify(recent, null, 2));

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

checkAuditLogs();

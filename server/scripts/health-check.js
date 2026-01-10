import os from 'os';
import { execSync } from 'child_process';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function checkHealth() {
    console.log('--- PHARMCARE PRO SERVER DIAGNOSTICS ---');
    console.log('Local Time:', new Date().toLocaleString());

    // 1. Check Port 80
    console.log('\n1. Checking Port 80...');
    try {
        const netstat = execSync('netstat -ano | findstr :80').toString();
        console.log(netstat);
        const pid = netstat.trim().split(/\s+/).pop();
        if (pid) {
            console.log(`Port 80 is occupied by PID: ${pid}`);
            try {
                const tasklist = execSync(`tasklist /FI "PID eq ${pid}"`).toString();
                console.log(tasklist);
            } catch (e) { }
        }
    } catch (e) {
        console.log('Port 80 seems free or netstat failed.');
    }

    // 2. Check Database Connection
    console.log('\n2. Checking Database...');
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'pharmcare_pro'
        });
        console.log('Database Connected Successfully.');

        const [rows] = await connection.query('SELECT COUNT(*) as count FROM audit_logs');
        console.log('Total Audit Logs:', rows[0].count);

        const [latest] = await connection.query('SELECT created_at, user_email, event_type FROM audit_logs ORDER BY created_at DESC LIMIT 5');
        console.log('Latest 5 Logs:');
        console.table(latest);

        await connection.end();
    } catch (e) {
        console.error('Database Connection Failed:', e.message);
    }

    // 3. Check for .env variables
    console.log('\n3. Checking Configuration...');
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('VITE_APP_MODE:', process.env.VITE_APP_MODE);

    console.log('\n--- DIAGNOSTICS COMPLETE ---');
}

checkHealth();

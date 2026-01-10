import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3307'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
};

const DB_NAMES = ['pharmcare_offline', 'pharmcare_pro'];

async function fixSchemas() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL.');

        for (const dbName of DB_NAMES) {
            console.log(`\nChecking Database: ${dbName}...`);
            try {
                await connection.query(`USE ${dbName}`);

                const columnsToAdd = [
                    { name: 'user_email', type: 'VARCHAR(255)' },
                    { name: 'user_role', type: 'VARCHAR(50)' },
                    { name: 'status', type: 'VARCHAR(50) DEFAULT "success"' },
                    { name: 'resource_type', type: 'VARCHAR(100)' },
                    { name: 'resource_id', type: 'VARCHAR(100)' },
                    { name: 'error_message', type: 'TEXT' },
                    { name: 'ip_address', type: 'VARCHAR(50)' },
                    { name: 'user_agent', type: 'TEXT' }
                ];

                for (const col of columnsToAdd) {
                    try {
                        await connection.query(`ALTER TABLE audit_logs ADD COLUMN ${col.name} ${col.type}`);
                        console.log(`  [+] Added column: ${col.name}`);
                    } catch (e) {
                        if (e.code === 'ER_DUP_FIELDNAME') {
                            console.log(`  [ ] Column exists: ${col.name}`);
                        } else {
                            console.error(`  [!] Error adding ${col.name}:`, e.message);
                        }
                    }
                }
            } catch (e) {
                console.log(`  [!] Database ${dbName} does not exist or access denied.`);
            }
        }

    } catch (err) {
        console.error('CRITICAL ERROR:', err.message);
    } finally {
        if (connection) await connection.end();
    }
}

fixSchemas();

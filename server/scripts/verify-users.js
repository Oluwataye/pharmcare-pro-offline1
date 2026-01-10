import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function verifyUsers() {
    console.log('--- USER VERIFICATION ---');
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_PORT:', process.env.DB_PORT || '3306 (default)');

    const dbConfig = {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3307'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '#1Admin123',
        database: process.env.DB_NAME || 'pharmcare_offline'
    };

    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        const [users] = await connection.query('SELECT id, email, role, SUBSTRING(password_hash, 1, 15) as hash_start FROM users');
        console.log('\n--- USERS ---');
        console.table(users);

        for (const user of users) {
            const [profiles] = await connection.query('SELECT * FROM profiles WHERE user_id = ?', [user.id]);
            const [roles] = await connection.query('SELECT * FROM user_roles WHERE user_id = ?', [user.id]);
            console.log(`\nUser: ${user.email} (${user.id})`);
            console.log('Profiles:', profiles);
            console.log('Roles:', roles);
        }

        await connection.end();
    } catch (err) {
        console.error('Verification failed:', err.message);
    }
}

verifyUsers();

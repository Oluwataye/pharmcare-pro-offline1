import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'pharmcare_offline'
};

async function repairDatabase() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL...');

        console.log('Step 1: Modernizing the database structure...');
        // This adds the new UPPERCASE roles to the database's "Allowed List"
        await connection.query(`ALTER TABLE users MODIFY COLUMN role ENUM('SUPER_ADMIN', 'PHARMACIST', 'CASHIER') DEFAULT 'CASHIER'`);

        console.log('Step 2: Assigning SUPER_ADMIN permissions...');
        await connection.query(`UPDATE users SET role = 'SUPER_ADMIN' WHERE email = 'admin@pharmcare.local'`);

        // Check if it worked
        const [rows] = await connection.execute('SELECT id, email, role FROM users WHERE email = ?', ['admin@pharmcare.local']);

        console.log('\n--- Final Account Status ---');
        console.table(rows);

        if (rows[0].role === 'SUPER_ADMIN') {
            console.log('✅ REPAIR SUCCESSFUL! Your role is now SUPER_ADMIN.');
        } else {
            console.log('❌ REPAIR FAILED. The role is still:', rows[0].role);
        }

        await connection.end();
    } catch (error) {
        console.error('❌ Database connection error:', error.message);
    }
}

repairDatabase();

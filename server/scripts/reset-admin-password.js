import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

async function resetPassword() {
    const email = 'admin@pharmcarepro.com';
    const newPassword = 'Admin@123!';

    console.log(`Resetting password for ${email}...`);

    const dbConfig = {
        host: process.env.DB_HOST || '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3307'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '#1Admin123',
        database: process.env.DB_NAME || 'pharmcare_offline'
    };

    try {
        const hash = await bcrypt.hash(newPassword, 10);
        const connection = await mysql.createConnection(dbConfig);

        const [result] = await connection.query('UPDATE users SET password_hash = ? WHERE email = ?', [hash, email]);

        if (result.affectedRows > 0) {
            console.log('SUCCESS: Admin password has been reset to: Admin@123!');
        } else {
            console.warn('FAILED: User not found.');
        }

        await connection.end();
    } catch (err) {
        console.error('Reset failed:', err.message);
    }
}

resetPassword();

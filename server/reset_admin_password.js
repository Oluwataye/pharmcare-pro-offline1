
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const config = {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '#1Olorunsogo',
    database: 'pharmcare_offline',
};

async function resetPassword() {
    const connection = await mysql.createConnection(config);
    const password = 'Admin123!';
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    await connection.query('UPDATE users SET password_hash = ? WHERE email = ?', [hash, 'admin@pharmcarepro.com']);
    console.log('Password reset successfully for admin@pharmcarepro.com');
    await connection.end();
}

resetPassword().catch(console.error);

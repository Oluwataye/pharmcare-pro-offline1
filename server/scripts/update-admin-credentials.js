
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
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

const newEmail = 'admin@pharmcarepro.com';
const newPassword = 'Admin123!';

async function updateAdmin() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL...');

        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update by ID 'admin-seed-id' (common in this codebase) OR by old email
        const [result] = await connection.query(
            `UPDATE users 
             SET email = ?, password_hash = ? 
             WHERE id = 'admin-seed-id' OR email = 'admin@pharmcare.local'`,
            [newEmail, passwordHash]
        );

        console.log('Update Result:', result);

        if (result.affectedRows > 0) {
            console.log(`✅ Admin credentials updated successfully to:\nEmail: ${newEmail}\nPassword: ${newPassword}`);
        } else {
            console.log('⚠ No admin user found to update (checked id="admin-seed-id" and old email).');
        }

    } catch (err) {
        console.error('❌ Update failed:', err);
    } finally {
        if (connection) await connection.end();
    }
}

updateAdmin();

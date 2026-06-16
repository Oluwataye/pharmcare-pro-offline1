import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'pharmcare_offline'
};

async function updateAdminName() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL...');

        // Update user first name and last name
        const [userResult] = await connection.query(
            "UPDATE users SET first_name = 'Oluwataye', last_name = 'Admin' WHERE email = 'admin@pharmcarepro.com'"
        );
        console.log(`Updated user table: ${userResult.affectedRows} row(s) modified.`);

        // Update profile name
        const [profileResult] = await connection.query(
            "UPDATE profiles p JOIN users u ON p.user_id = u.id SET p.name = 'Oluwataye Admin' WHERE u.email = 'admin@pharmcarepro.com'"
        );
        console.log(`Updated profiles table: ${profileResult.affectedRows} row(s) modified.`);

        console.log('Admin user name updated successfully.');
    } catch (err) {
        console.error('Update failed:', err);
    } finally {
        if (connection) await connection.end();
    }
}

updateAdminName();

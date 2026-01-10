
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

async function repairProfiles() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        // 1. Get all users
        const [users] = await connection.query('SELECT * FROM users');
        console.log(`Found ${users.length} users.`);

        // 2. Get all profiles
        const [profiles] = await connection.query('SELECT user_id FROM profiles');
        const profileUserIds = new Set(profiles.map(p => p.user_id));

        // 3. Get all roles
        const [roles] = await connection.query('SELECT user_id FROM user_roles');
        const roleUserIds = new Set(roles.map(r => r.user_id));

        for (const user of users) {
            // Fix Profile
            if (!profileUserIds.has(user.id)) {
                console.log(`Repairing Profile for User: ${user.email} (${user.id})`);
                await connection.query(
                    'INSERT INTO profiles (id, user_id, name, username, updated_at) VALUES (?, ?, ?, ?, NOW())',
                    [
                        crypto.randomUUID(),
                        user.id,
                        `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
                        user.email.split('@')[0]
                    ]
                );
            }

            // Fix Role
            if (!roleUserIds.has(user.id)) {
                console.log(`Repairing Role for User: ${user.email} (${user.id})`);
                await connection.query(
                    'INSERT INTO user_roles (id, user_id, role, updated_at) VALUES (?, ?, ?, NOW())',
                    [
                        crypto.randomUUID(),
                        user.id,
                        user.role || 'CASHIER'
                    ]
                );
            }
        }

        console.log(' Repair Complete!');

    } catch (err) {
        console.error('Repair failed:', err);
    } finally {
        if (connection) await connection.end();
    }
}

repairProfiles();

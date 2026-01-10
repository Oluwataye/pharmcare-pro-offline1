
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
    database: 'pharmcare_offline',
    multipleStatements: true
};

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL for migration...');

        // 1. Check/Add 'username' to profiles
        try {
            await connection.query("SELECT username FROM profiles LIMIT 1");
            console.log("✓ 'username' column exists in 'profiles'");
        } catch (err) {
            console.log("⚠ 'username' column missing in 'profiles'. Adding it...");
            await connection.query("ALTER TABLE profiles ADD COLUMN username VARCHAR(255)");
            console.log("✓ Added 'username' to 'profiles'");
        }

        // 2. Check/Add 'first_name' to users
        try {
            await connection.query("SELECT first_name FROM users LIMIT 1");
            console.log("✓ 'first_name' column exists in 'users'");
        } catch (err) {
            console.log("⚠ 'first_name' column missing in 'users'. Adding it...");
            await connection.query("ALTER TABLE users ADD COLUMN first_name VARCHAR(100)");
            console.log("✓ Added 'first_name' to 'users'");
        }

        // 3. Check/Add 'last_name' to users
        try {
            await connection.query("SELECT last_name FROM users LIMIT 1");
            console.log("✓ 'last_name' column exists in 'users'");
        } catch (err) {
            console.log("⚠ 'last_name' column missing in 'users'. Adding it...");
            await connection.query("ALTER TABLE users ADD COLUMN last_name VARCHAR(100)");
            console.log("✓ Added 'last_name' to 'users'");
        }

        console.log('Migration completed successfully.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();


import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manually read .env to bypass cache/path issues
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    console.log(`Loading .env from ${envPath}`);
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} else {
    console.log(`WARNING: .env not found at ${envPath}`);
}

const configsToTry = [
    {
        host: 'localhost',
        port: 3306,
        user: 'root',
        password: process.env.DB_PASSWORD,
    },
    {
        host: '127.0.0.1',
        port: 3306,
        user: 'root',
        password: process.env.DB_PASSWORD,
    }
];

async function verifyConnection() {
    console.log(`Testing password: "${process.env.DB_PASSWORD}"`);

    for (const config of configsToTry) {
        console.log(`\n--- Testing ${config.host} ---`);
        let connection;
        try {
            connection = await mysql.createConnection(config);
            console.log('SUCCESS: Connected to MySQL server!');

            const dbName = process.env.DB_NAME || 'pharmcare_offline';
            const [rows] = await connection.query(`SHOW DATABASES LIKE '${dbName}'`);

            if (rows.length > 0) {
                console.log(`SUCCESS: Database '${dbName}' exists.`);
            } else {
                console.log(`WARNING: Database '${dbName}' DOES NOT exist.`);
                console.log(`Creating database '${dbName}'...`);
                await connection.query(`CREATE DATABASE ${dbName}`);
                console.log('SUCCESS: Database created.');
            }

            await connection.end();
            console.log('Verification Complete.');
            process.exit(0); // Exit on first success
        } catch (error) {
            console.error('ERROR: Connection failed:', error.message);
            if (connection) await connection.end();
        }
    }

    // If we get here, all failed
    console.error('\nALL CONNECTIONS FAILED.');
    process.exit(1);
}

verifyConnection();


import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const configsToTry = [
    {
        host: 'localhost',
        port: parseInt(process.env.DB_PORT || '3307'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '#1Admin123',
        database: process.env.DB_NAME || 'pharmcare_offline',
    },
    {
        host: '127.0.0.1',
        port: parseInt(process.env.DB_PORT || '3307'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '#1Admin123',
        database: process.env.DB_NAME || 'pharmcare_offline',
    },
    {
        host: '127.0.0.1',
        port: 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '#1Admin123',
        database: process.env.DB_NAME || 'pharmcare_offline',
    },
    {
        socketPath: '\\\\.\\pipe\\MySQL',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '#1Admin123',
        database: process.env.DB_NAME || 'pharmcare_offline',
    }
];

async function debugLogin() {
    console.log('--- LOGIN DEBUGGER V3 ---');

    let connection;
    let successConfig = null;

    // Iterate through configs
    for (const config of configsToTry) {
        const desc = config.socketPath ? `Pipe: ${config.socketPath}` : `TCP: ${config.host}:${config.port}`;
        // console.log(`\nTrying connection via ${desc}...`);
        try {
            connection = await mysql.createConnection(config);
            console.log(`CONNECTED successfully via ${desc}!`);
            successConfig = config;
            break;
        } catch (error) {
            // console.log(`Failed via ${desc}: ${error.code}`);
        }
    }

    if (!connection) {
        console.error('\nCRITICAL: Could not connect to database via any method!');
        return;
    }

    try {
        const [users] = await connection.query('SELECT id, email, role, password_hash, first_name FROM users');
        console.log(`\nFound ${users.length} users:`);

        for (const user of users) {
            console.log(`\n--------------------------------------------------`);
            console.log(`User: ${user.email}`);
            console.log(`Role: ${user.role}`);
            console.log(`ID: ${user.id}`);

            if (!user.password_hash || !user.password_hash.startsWith('$2')) {
                console.warn('WARNING: Password hash does not look like a valid bcrypt hash!');
                console.log(`Hash value: "${user.password_hash}"`);
            } else {
                console.log(`Hash valid format: Yes`);
            }
        }
        console.log(`--------------------------------------------------`);

    } catch (error) {
        console.error('ERROR during query:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

debugLogin();


import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3307'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '#1Admin123',
    database: process.env.DB_NAME || 'pharmcare_offline'
};

const tableName = process.argv[2] || 'inventory';

async function dumpSchema() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query(`DESCRIBE ${tableName}`);
        fs.writeFileSync(path.join(__dirname, `${tableName}_schema.json`), JSON.stringify(rows, null, 2));
        console.log(`Schema dumped to ${tableName}_schema.json`);
    } catch (error) {
        console.error('Dump failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

dumpSchema();

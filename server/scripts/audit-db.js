import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '#1Olorunsogo',
    database: 'pharmcare_offline'
};

async function auditSchema() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL...');

        const [tables] = await connection.query("SHOW TABLES");
        console.log('\n--- EXISTING TABLES ---');
        console.log(tables.map(t => Object.values(t)[0]));

        const [columns] = await connection.query(`
      SELECT TABLE_NAME, COLUMN_NAME 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = 'pharmcare_offline'
    `);

        console.log('\n--- TABLE COLUMNS ---');
        const tableColumns = {};
        columns.forEach(c => {
            if (!tableColumns[c.TABLE_NAME]) tableColumns[c.TABLE_NAME] = [];
            tableColumns[c.TABLE_NAME].push(c.COLUMN_NAME);
        });
        console.log(JSON.stringify(tableColumns, null, 2));

    } catch (error) {
        console.error('❌ Audit failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

auditSchema();

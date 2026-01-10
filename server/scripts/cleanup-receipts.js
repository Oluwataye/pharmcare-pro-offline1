import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

async function cleanup() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: 'pharmcare_offline'
    };

    console.log('Connecting to DB...');
    const connection = await mysql.createConnection(config);

    try {
        // Check count first
        const [check] = await connection.query(`
            SELECT COUNT(*) as count FROM receipts 
            WHERE JSON_EXTRACT(receipt_data, '$.total') IS NULL
        `);
        console.log(`Found ${check[0].count} bad receipts (Total IS NULL).`);

        if (check[0].count > 0) {
            const [result] = await connection.query(`
                DELETE FROM receipts 
                WHERE JSON_EXTRACT(receipt_data, '$.total') IS NULL
            `);
            console.log(`✅ Deleted ${result.affectedRows} bad receipts.`);
        } else {
            console.log('No bad receipts found to delete.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await connection.end();
    }
}

cleanup();

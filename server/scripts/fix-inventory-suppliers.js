import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3307'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pharmcare_offline'
};

async function fixInventory() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database...');

        const columnsToAdd = [
            { name: 'cost_price', type: 'DECIMAL(10,2) DEFAULT 0' },
            { name: 'supplier_id', type: 'VARCHAR(36)' },
            { name: 'restock_invoice_number', type: 'VARCHAR(100)' }
        ];

        for (const col of columnsToAdd) {
            try {
                await connection.query(`ALTER TABLE inventory ADD COLUMN ${col.name} ${col.type}`);
                console.log(`✅ Added ${col.name} to inventory.`);
            } catch (e) {
                if (e.code === 'ER_DUP_FIELDNAME') console.log(`ℹ️ ${col.name} already exists.`);
                else throw e;
            }
        }

        console.log('✨ Inventory table check complete.');
    } catch (error) {
        console.error('❌ Check failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

fixInventory();

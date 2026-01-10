import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '#1Admin123',
    database: process.env.DB_NAME || 'pharmcare_offline',
    port: process.env.DB_PORT || 3307
};

const RESTORE_LIST = [
    { txId: 'TR-1767690836426-357', discount: 500, time: '10:13 AM' }
];

(async () => {
    console.log('=== DATA RECOVERY: MANUAL DISCOUNTS ===');
    const pool = mysql.createPool(dbConfig);
    try {
        for (const item of RESTORE_LIST) {
            console.log(`Checking Transaction ${item.txId} (${item.time})...`);

            // Check current value
            const [rows] = await pool.query('SELECT id, manual_discount, total FROM sales WHERE transaction_id = ?', [item.txId]);

            if (rows.length === 0) {
                console.log(`  XX Not Found in DB`);
                continue;
            }

            const sale = rows[0];
            console.log(`  Found Sale ID: ${sale.id}`);
            console.log(`  Current Manual Discount: ${sale.manual_discount}`);

            if (sale.manual_discount == 0) {
                console.log(`  !! DETECTED DATA LOSS. Restoring to ${item.discount}...`);
                const [res] = await pool.query('UPDATE sales SET manual_discount = ? WHERE id = ?', [item.discount, sale.id]);
                console.log(`  ✓ Restored. Rows affected: ${res.affectedRows}`);
            } else {
                console.log(`  ✓ Data seems correct (or already fixed).`);
            }
        }
        console.log('\nRecovery Complete.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
})();

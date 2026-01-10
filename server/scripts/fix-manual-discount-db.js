
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
    database: process.env.DB_NAME || 'pharmcare_offline',
    port: parseInt(process.env.DB_PORT) || 3306
};

async function migrate() {
    let connection;
    try {
        console.log('Connecting to database with config:', { ...dbConfig, password: '****' });
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected.');

        // 1. Add column if it doesn't exist
        try {
            await connection.query('ALTER TABLE store_settings ADD COLUMN discount_config JSON AFTER print_show_footer');
            console.log('✅ Added discount_config column.');
        } catch (err) {
            if (err.code === 'ER_DUP_COLUMN_NAME' || err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ Column discount_config already exists.');
            } else {
                throw err;
            }
        }

        // 2. Ensure at least one row exists with a default config
        const [rows] = await connection.query('SELECT id, discount_config FROM store_settings LIMIT 1');
        if (rows.length === 0) {
            console.log('Creating initial store settings...');
            const id = crypto.randomUUID();
            await connection.query(
                'INSERT INTO store_settings (id, name, discount_config) VALUES (?, ?, ?)',
                [id, 'PharmaCare Pro', JSON.stringify({ manualAmountEnabled: false, defaultDiscount: 0, maxDiscount: 20, enabled: true })]
            );
        } else if (!rows[0].discount_config) {
            console.log('Updating initial store settings with default discount config...');
            await connection.query(
                'UPDATE store_settings SET discount_config = ? WHERE id = ?',
                [JSON.stringify({ manualAmountEnabled: false, defaultDiscount: 0, maxDiscount: 20, enabled: true }), rows[0].id]
            );
        }

        console.log('✅ Migration completed successfully.');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();

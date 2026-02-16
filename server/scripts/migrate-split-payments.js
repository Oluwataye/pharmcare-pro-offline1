
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
    password: process.env.DB_PASSWORD || '#1Olorunsogo'
};

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL...');
        await connection.query('USE pharmcare_offline');

        console.log('Creating payment_records table...');
        await connection.query(`
            CREATE TABLE IF NOT EXISTS payment_records (
                id VARCHAR(36) PRIMARY KEY,
                sale_id VARCHAR(36) NOT NULL,
                payment_method VARCHAR(50) NOT NULL,
                amount DECIMAL(10,2) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
            )
        `);

        // Add index
        try {
            await connection.query('CREATE INDEX idx_payment_records_sale_id ON payment_records(sale_id)');
            console.log('✅ Created index on sale_id');
        } catch (e) {
            console.log('ℹ️ Index might already exist');
        }

        console.log('\nMigration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:');
        console.error(error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();

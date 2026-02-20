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

async function fixSchema() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL...');
        await connection.query("SET SESSION sql_mode = '';");

        // 1. Add cost_price to sales_items if missing
        console.log('Checking sales_items for cost_price column...');
        const [cols] = await connection.query("SHOW COLUMNS FROM sales_items LIKE 'cost_price'");
        if (cols.length === 0) {
            console.log('Adding cost_price to sales_items...');
            await connection.query("ALTER TABLE sales_items ADD COLUMN cost_price DECIMAL(10,2) DEFAULT 0.00 AFTER is_wholesale");
            console.log('✅ cost_price column added');
        } else {
            console.log('✅ cost_price column already exists');
        }

        // 2. Create payment_records table
        console.log('Ensuring payment_records table exists...');
        await connection.query(`
      CREATE TABLE IF NOT EXISTS payment_records (
        id VARCHAR(36) PRIMARY KEY,
        sale_id VARCHAR(36) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sale_id) REFERENCES sales(id)
      )
    `);
        console.log('✅ payment_records table ready');

        // 3. Create placeholder tables for other ALLOWED_TABLES
        const otherTables = [
            {
                name: 'purchases',
                sql: `CREATE TABLE IF NOT EXISTS purchases (
          id VARCHAR(36) PRIMARY KEY,
          supplier_id VARCHAR(36),
          total_amount DECIMAL(15,2) NOT NULL,
          status VARCHAR(50) DEFAULT 'completed',
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`
            },
            {
                name: 'purchase_items',
                sql: `CREATE TABLE IF NOT EXISTS purchase_items (
          id VARCHAR(36) PRIMARY KEY,
          purchase_id VARCHAR(36) NOT NULL,
          inventory_id VARCHAR(36) NOT NULL,
          quantity INTEGER NOT NULL,
          unit_cost DECIMAL(15,2) NOT NULL,
          total_cost DECIMAL(15,2) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (purchase_id) REFERENCES purchases(id)
        )`
            },
            {
                name: 'system_logs',
                sql: `CREATE TABLE IF NOT EXISTS system_logs (
          id VARCHAR(36) PRIMARY KEY,
          level VARCHAR(20),
          module VARCHAR(100),
          message TEXT,
          details JSON,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
            },
            {
                name: 'system_configs',
                sql: `CREATE TABLE IF NOT EXISTS system_configs (
          id VARCHAR(36) PRIMARY KEY,
          config_key VARCHAR(100) UNIQUE NOT NULL,
          config_value TEXT,
          description TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )`
            },
            {
                name: 'database_backups',
                sql: `CREATE TABLE IF NOT EXISTS database_backups (
          id VARCHAR(36) PRIMARY KEY,
          filename VARCHAR(255) NOT NULL,
          size_bytes BIGINT,
          status VARCHAR(50),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`
            }
        ];

        for (const table of otherTables) {
            console.log(`Ensuring ${table.name} table exists...`);
            await connection.query(table.sql);
            console.log(`✅ ${table.name} table ready`);
        }

        console.log('\n✨ Comprehensive schema migration applied successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

fixSchema();

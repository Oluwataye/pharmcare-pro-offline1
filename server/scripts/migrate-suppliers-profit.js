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
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pharmcare_offline'
};

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database...');

        // 1. Create Suppliers Table
        console.log('--- 1. Creating Suppliers Table ---');
        await connection.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
        console.log('✅ Suppliers table ready.');

        // 2. Update Inventory Table
        console.log('--- 2. Updating Inventory Table ---');
        try {
            await connection.query('ALTER TABLE inventory ADD COLUMN supplier_id VARCHAR(36)');
            await connection.query('ALTER TABLE inventory ADD CONSTRAINT fk_inventory_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id)');
            console.log('✅ Added supplier_id to inventory.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️ supplier_id already exists.');
            else console.error('Error adding supplier_id:', e.message);
        }

        try {
            await connection.query('ALTER TABLE inventory ADD COLUMN restock_invoice_number VARCHAR(100)');
            console.log('✅ Added restock_invoice_number to inventory.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️ restock_invoice_number already exists.');
        }

        // 3. Update Sales Items Table (Profit Tracking)
        console.log('--- 3. Updating Sales Items Table ---');
        try {
            await connection.query('ALTER TABLE sales_items ADD COLUMN cost_price DECIMAL(10,2) DEFAULT 0');
            console.log('✅ Added cost_price to sales_items.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️ cost_price already exists.');
        }

        // 4. Update Store Settings (Discount Cap)
        console.log('--- 4. Updating Store Settings ---');
        try {
            await connection.query('ALTER TABLE store_settings ADD COLUMN max_discount_value DECIMAL(10,2) DEFAULT 1000');
            console.log('✅ Added max_discount_value to store_settings.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('ℹ️ max_discount_value already exists.');
        }

        // 5. Role Renaming (Cashier -> Dispenser)
        console.log('--- 5. Migrating Roles (Cashier -> Dispenser) ---');

        // Update Users Table ENUM
        // Note: We expand the ENUM first, then migrate data. 
        // Ideally we would double check strict mode, but we disabled it in init-db.
        // We strictly redefine the column to include DISPENSER.
        try {
            await connection.query(`
        ALTER TABLE users 
        MODIFY COLUMN role ENUM('SUPER_ADMIN', 'ADMIN', 'PHARMACIST', 'CASHIER', 'DISPENSER') DEFAULT 'DISPENSER'
      `);
            console.log('✅ Updated users.role ENUM.');
        } catch (e) {
            console.error('Error updating users ENUM:', e.message);
        }

        // Update User Roles Table ENUM
        try {
            await connection.query(`
        ALTER TABLE user_roles 
        MODIFY COLUMN role ENUM('SUPER_ADMIN', 'ADMIN', 'PHARMACIST', 'CASHIER', 'DISPENSER') DEFAULT 'DISPENSER'
      `);
            console.log('✅ Updated user_roles.role ENUM.');
        } catch (e) {
            console.error('Error updating user_roles ENUM:', e.message);
        }

        // Migrate Data
        const [uResult] = await connection.query("UPDATE users SET role = 'DISPENSER' WHERE role = 'CASHIER'");
        console.log(`✅ Migrated ${uResult.affectedRows} users from CASHIER to DISPENSER.`);

        const [urResult] = await connection.query("UPDATE user_roles SET role = 'DISPENSER' WHERE role = 'CASHIER'");
        console.log(`✅ Migrated ${urResult.affectedRows} user_roles from CASHIER to DISPENSER.`);

        console.log('\n✨ Migration Complete!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();

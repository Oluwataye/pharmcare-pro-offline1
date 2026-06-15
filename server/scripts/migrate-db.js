
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
    database: 'pharmcare_offline',
    multipleStatements: true
};

async function migrate() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL for migration...');

        // 1. Check/Add 'username' to profiles
        try {
            await connection.query("SELECT username FROM profiles LIMIT 1");
            console.log("✓ 'username' column exists in 'profiles'");
        } catch (err) {
            console.log("⚠ 'username' column missing in 'profiles'. Adding it...");
            await connection.query("ALTER TABLE profiles ADD COLUMN username VARCHAR(255)");
            console.log("✓ Added 'username' to 'profiles'");
        }

        // 2. Check/Add 'first_name' to users
        try {
            await connection.query("SELECT first_name FROM users LIMIT 1");
            console.log("✓ 'first_name' column exists in 'users'");
        } catch (err) {
            console.log("⚠ 'first_name' column missing in 'users'. Adding it...");
            await connection.query("ALTER TABLE users ADD COLUMN first_name VARCHAR(100)");
            console.log("✓ Added 'first_name' to 'users'");
        }

        // 3. Check/Add 'last_name' to users
        try {
            await connection.query("SELECT last_name FROM users LIMIT 1");
            console.log("✓ 'last_name' column exists in 'users'");
        } catch (err) {
            console.log("⚠ 'last_name' column missing in 'users'. Adding it...");
            await connection.query("ALTER TABLE users ADD COLUMN last_name VARCHAR(100)");
            console.log("✓ Added 'last_name' to 'users'");
        }

        // 4. Update sales.user_id Foreign Key to ON DELETE SET NULL (M-06)
        try {
            const [fkRows] = await connection.query(`
                SELECT CONSTRAINT_NAME 
                FROM information_schema.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = DATABASE() 
                  AND TABLE_NAME = 'sales' 
                  AND COLUMN_NAME = 'user_id' 
                  AND REFERENCED_TABLE_NAME = 'users'
            `);
            if (fkRows.length > 0) {
                const constraintName = fkRows[0].CONSTRAINT_NAME;
                console.log(`Found FK constraint '${constraintName}'. Dropping and recreating with ON DELETE SET NULL...`);
                await connection.query(`ALTER TABLE sales DROP FOREIGN KEY ${constraintName}`);
            }
            await connection.query(`
                ALTER TABLE sales 
                ADD CONSTRAINT fk_sales_user_id 
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            `);
            console.log("✓ Updated 'sales.user_id' foreign key to ON DELETE SET NULL");
        } catch (err) {
            console.log("⚠ Failed to alter foreign key or it already exists with correct configuration:", err.message);
        }

        // 5. Update user and user_roles roles ENUM (H-04)
        try {
            await connection.query("ALTER TABLE users MODIFY COLUMN role ENUM('SUPER_ADMIN','ADMIN','PHARMACIST','CASHIER','DISPENSER') DEFAULT 'CASHIER'");
            await connection.query("ALTER TABLE user_roles MODIFY COLUMN role ENUM('SUPER_ADMIN','ADMIN','PHARMACIST','CASHIER','DISPENSER') DEFAULT 'CASHIER'");
            console.log("✓ Updated role ENUM to include 'DISPENSER' in 'users' and 'user_roles'");
        } catch (err) {
            console.log("⚠ Failed to update role ENUM:", err.message);
        }

        // 5.5. Create token_blacklist table if missing (M-08)
        try {
            await connection.query(`
                CREATE TABLE IF NOT EXISTS token_blacklist (
                    token VARCHAR(500) PRIMARY KEY,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);
            console.log("✓ 'token_blacklist' table is ready");
        } catch (err) {
            console.log("⚠ Failed to create 'token_blacklist' table:", err.message);
        }

        // 6. Add indexes for performance optimization (M-05)
        const indexesToCreate = [
            { table: 'sales', name: 'idx_sales_created_at', columns: 'created_at' },
            { table: 'sales', name: 'idx_sales_cashier_id', columns: 'cashier_id' },
            { table: 'sales', name: 'idx_sales_transaction_id', columns: 'transaction_id' },
            { table: 'inventory', name: 'idx_inventory_name', columns: 'name' },
            { table: 'inventory', name: 'idx_inventory_sku', columns: 'sku' },
            { table: 'audit_logs', name: 'idx_audit_logs_created_at', columns: 'created_at' }
        ];

        for (const idx of indexesToCreate) {
            try {
                const [rows] = await connection.query(`
                    SHOW INDEX FROM ${idx.table} WHERE Key_name = ?
                `, [idx.name]);
                if (rows.length === 0) {
                    console.log(`Adding index ${idx.name} on ${idx.table}(${idx.columns})...`);
                    await connection.query(`ALTER TABLE ${idx.table} ADD INDEX ${idx.name} (${idx.columns})`);
                    console.log(`✓ Added index ${idx.name}`);
                } else {
                    console.log(`✓ Index ${idx.name} already exists`);
                }
            } catch (err) {
                console.log(`⚠ Failed to add index ${idx.name}:`, err.message);
            }
        }

        console.log('Migration completed successfully.');

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();

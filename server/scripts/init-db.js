import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
};

const adminEmail = 'admin@pharmcarepro.com';
const adminPassword = 'Admin@123!';

const SECURITY_CODE = 'OMUOOKE-01-2025';

function askSecurityCode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('\n🔒 INSTALLATION SECURITY CHECK');
    console.log('-----------------------------');
    rl.question('>>> Enter Installation Security Code: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function initDB() {
  // --- SECURITY CHECK ---
  const inputCode = await askSecurityCode();
  if (inputCode !== SECURITY_CODE) {
    console.error('\n⛔ ACCESS DENIED: Incorrect Security Code.');
    console.error('   Installation aborted.');
    process.exit(1);
  }
  console.log('\n✅ Access Granted. Starting Installation...\n');
  // ----------------------

  let connection;
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('Connected to MySQL...');

    // Disable strict mode for compatibility
    await connection.query("SET SESSION sql_mode = '';");

    await connection.query('CREATE DATABASE IF NOT EXISTS pharmcare_offline');
    await connection.query('USE pharmcare_offline');
    console.log('Database "pharmcare_offline" is ready.');

    const tables = [
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role ENUM('SUPER_ADMIN', 'ADMIN', 'PHARMACIST', 'CASHIER') DEFAULT 'CASHIER',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      `CREATE TABLE IF NOT EXISTS profiles (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) UNIQUE,
        name VARCHAR(255),
        username VARCHAR(255),
        avatar_url TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`,

      `CREATE TABLE IF NOT EXISTS user_roles (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        role ENUM('SUPER_ADMIN', 'ADMIN', 'PHARMACIST', 'CASHIER') DEFAULT 'CASHIER',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );`,

      `CREATE TABLE IF NOT EXISTS inventory (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sku VARCHAR(50),
        quantity INTEGER DEFAULT 0,
        unit VARCHAR(50),
        unit_price DECIMAL(10,2) NOT NULL,
        cost_price DECIMAL(10,2),
        category VARCHAR(100),
        expiry_date DATE,
        manufacturer VARCHAR(255),
        batch_number VARCHAR(100),
        last_updated_by VARCHAR(36),
        low_stock_threshold INTEGER DEFAULT 10,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      `CREATE TABLE IF NOT EXISTS sales (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        business_name VARCHAR(255),
        business_address TEXT,
        total DECIMAL(10,2) NOT NULL,
        discount DECIMAL(10,2) DEFAULT 0,
        manual_discount DECIMAL(10,2) DEFAULT 0,
        tax_amount DECIMAL(10,2) DEFAULT 0,
        payment_method VARCHAR(50),
        status VARCHAR(50) DEFAULT 'completed',
        sale_type VARCHAR(50) DEFAULT 'retail',
        transaction_id VARCHAR(100),
        cashier_name VARCHAR(255),
        cashier_email VARCHAR(255),
        cashier_id VARCHAR(36),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );`,

      `CREATE TABLE IF NOT EXISTS sales_items (
        id VARCHAR(36) PRIMARY KEY,
        sale_id VARCHAR(36),
        inventory_id VARCHAR(36),
        product_name VARCHAR(255),
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        is_wholesale BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (sale_id) REFERENCES sales(id),
        FOREIGN KEY (inventory_id) REFERENCES inventory(id)
      );`,

      `CREATE TABLE IF NOT EXISTS refunds (
        id VARCHAR(36) PRIMARY KEY,
        sale_id VARCHAR(36) NOT NULL,
        transaction_id VARCHAR(36) NOT NULL,
        refund_amount DECIMAL(10,2) NOT NULL,
        refund_reason TEXT,
        refund_type ENUM('full', 'partial') NOT NULL,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        initiated_by VARCHAR(36),
        initiated_by_name VARCHAR(255),
        initiated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        approved_by VARCHAR(36),
        approved_by_name VARCHAR(255),
        approved_at DATETIME NULL DEFAULT NULL,
        rejection_reason TEXT,
        original_amount DECIMAL(10,2),
        customer_name VARCHAR(100),
        items JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (initiated_by) REFERENCES users(id)
      );`,

      `CREATE TABLE IF NOT EXISTS store_settings (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255) DEFAULT 'PharmCare Pharmacy',
        address TEXT,
        phone VARCHAR(50),
        email VARCHAR(255),
        logo_url TEXT,
        currency VARCHAR(10) DEFAULT 'NGN',
        receipt_footer TEXT,
        print_show_logo BOOLEAN DEFAULT TRUE,
        print_show_address BOOLEAN DEFAULT TRUE,
        print_show_email BOOLEAN DEFAULT TRUE,
        print_show_phone BOOLEAN DEFAULT TRUE,
        print_show_footer BOOLEAN DEFAULT TRUE,
        discount_config JSON DEFAULT NULL,
        updated_by VARCHAR(36),
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      );`,

      `CREATE TABLE IF NOT EXISTS receipts (
        id VARCHAR(36) PRIMARY KEY,
        sale_id VARCHAR(36),
        receipt_number VARCHAR(100),
        receipt_data JSON,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      `CREATE TABLE IF NOT EXISTS print_analytics (
        id VARCHAR(36) PRIMARY KEY,
        sale_id VARCHAR(36),
        receipt_id VARCHAR(36),
        cashier_id VARCHAR(36),
        cashier_name VARCHAR(255),
        customer_name VARCHAR(255),
        print_status VARCHAR(50),
        error_type VARCHAR(100),
        error_message TEXT,
        print_duration_ms INTEGER,
        is_reprint BOOLEAN DEFAULT FALSE,
        sale_type VARCHAR(50),
        total_amount DECIMAL(10,2),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`,

      `CREATE TABLE IF NOT EXISTS audit_logs (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36),
        user_email VARCHAR(255),
        user_role VARCHAR(50),
        event_type VARCHAR(100),
        action TEXT,
        status VARCHAR(20) DEFAULT 'success',
        resource_type VARCHAR(100),
        resource_id VARCHAR(36),
        error_message TEXT,
        details JSON,
        ip_address VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );`
    ];

    for (const sql of tables) {
      await connection.query(sql);
    }
    console.log('Tables are ready.');

    // Ensure receipts table has receipt_data column if it was created with 'content'
    try {
      await connection.query('ALTER TABLE receipts CHANGE COLUMN content receipt_data JSON');
    } catch (e) {
      // May already be JSON or not exist
    }

    // Ensure print_analytics table has sale_id column
    try {
      await connection.query('ALTER TABLE print_analytics ADD COLUMN sale_id VARCHAR(36)');
      console.log('✅ Added sale_id column to print_analytics');
    } catch (e) {
      // Column likely exists
    }

    const [users] = await connection.query('SELECT * FROM users WHERE email = ?', [adminEmail]);
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const adminId = crypto.randomUUID();

    if (users.length === 0) {
      console.log('Phase 3: Creating Admin Account...');
      await connection.query(
        'INSERT INTO users (id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)',
        [adminId, adminEmail, passwordHash, 'System', 'Admin', 'SUPER_ADMIN']
      );

      // Create profile
      await connection.query(
        'INSERT INTO profiles (id, user_id, name, username) VALUES (?, ?, ?, ?)',
        [crypto.randomUUID(), adminId, 'System Admin', 'admin']
      );

      // Create role
      await connection.query(
        'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
        [crypto.randomUUID(), adminId, 'SUPER_ADMIN']
      );

      console.log('✨ Account created!');
    } else {
      console.log('Phase 3: Syncing Admin Account...');
      const existingUser = users[0];
      await connection.query('UPDATE users SET password_hash = ?, role = ? WHERE email = ?', [passwordHash, 'SUPER_ADMIN', adminEmail]);

      // Sync profile
      const [profiles] = await connection.query('SELECT id FROM profiles WHERE user_id = ?', [existingUser.id]);
      if (profiles.length === 0) {
        await connection.query(
          'INSERT INTO profiles (id, user_id, name, username) VALUES (?, ?, ?, ?)',
          [crypto.randomUUID(), existingUser.id, 'System Admin', 'admin']
        );
      }

      // Sync user_roles
      const [roles] = await connection.query('SELECT id FROM user_roles WHERE user_id = ?', [existingUser.id]);
      if (roles.length === 0) {
        await connection.query(
          'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
          [crypto.randomUUID(), existingUser.id, 'SUPER_ADMIN']
        );
      } else {
        await connection.query('UPDATE user_roles SET role = ? WHERE user_id = ?', ['SUPER_ADMIN', existingUser.id]);
      }

      console.log('✨ Account synchronized!');
    }

    // Add default store settings if empty
    const [settings] = await connection.query('SELECT * FROM store_settings LIMIT 1');
    if (settings.length === 0) {
      console.log('Phase 4: Creating Default Store Settings...');
      await connection.query(`INSERT INTO store_settings (id, name, address, phone, email, currency) VALUES (?, ?, ?, ?, ?, ?)`,
        [crypto.randomUUID(), 'PharmCare Pharmacy', 'Hospital Road, Local City', '08000000000', 'info@pharmcare.local', 'NGN']);
      console.log('✨ Store settings created!');
    }

    // Add default items to inventory if empty
    const [invRows] = await connection.query('SELECT id FROM inventory LIMIT 1');
    if (invRows.length === 0) {
      console.log('Phase 5: Seeding Inventory with basic items...');
      const sampleItems = [
        [crypto.randomUUID(), 'Paracetamol 500mg', 500, 15.00, 10.00, 'Essential Medicine'],
        [crypto.randomUUID(), 'Amoxicillin 250mg', 200, 60.00, 45.00, 'Antibiotics'],
        [crypto.randomUUID(), 'Vitamin C 1000mg', 300, 25.00, 15.00, 'Supplements'],
        [crypto.randomUUID(), 'Cough Syrup (Adult)', 50, 350.00, 250.00, 'Cough & Cold']
      ];

      for (const item of sampleItems) {
        await connection.query(
          'INSERT INTO inventory (id, name, quantity, unit_price, cost_price, category) VALUES (?, ?, ?, ?, ?, ?)',
          item
        );
      }
      console.log('✨ Inventory seeded with 4 items!');
    }

    console.log(`\n---\nReady to Log In:\n📧 User: ${adminEmail}\n🔑 Pass: ${adminPassword}\n---\n`);

  } catch (error) {
    console.error('❌ Database installation failed:');
    console.error(error);
  } finally {
    if (connection) await connection.end();
  }
}

initDB();

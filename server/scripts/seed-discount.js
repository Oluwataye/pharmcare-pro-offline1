
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: 'pharmcare_offline'
};

async function seedDiscount() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database...');

        // Get a valid user - prefer admin with name, or fallback
        let [users] = await connection.query("SELECT id, first_name, last_name, email FROM users WHERE role = 'SUPER_ADMIN' AND first_name IS NOT NULL LIMIT 1");
        if (users.length === 0) {
            [users] = await connection.query("SELECT id, first_name, last_name, email FROM users LIMIT 1");
        }

        if (users.length === 0) {
            console.log('No users found.');
            return;
        }
        const user = users[0];
        const cashierName = (user.first_name && user.last_name)
            ? `${user.first_name} ${user.last_name}`
            : (user.email.split('@')[0] || "Test User");

        // Get a valid inventory item
        const [items] = await connection.query('SELECT id, name, unit_price FROM inventory LIMIT 1');
        if (items.length === 0) return;
        const item = items[0];

        // Create a discounted sale
        const saleId = crypto.randomUUID();
        const transactionId = `TEST-DISC-${Date.now()}`;
        const qty = 2;
        const price = Number(item.unit_price);
        const subtotal = qty * price;
        const discountPercent = 10;
        const discountAmount = subtotal * (discountPercent / 100);
        const total = subtotal - discountAmount;

        console.log(`Creating sale with discount: ${discountAmount} (Total: ${total})`);

        // Insert Sale
        await connection.query(
            `INSERT INTO sales (id, user_id, customer_name, total, discount, status, transaction_id, cashier_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [saleId, user.id, 'Test Discount Customer', total, discountPercent, 'completed', transactionId, cashierName]
        );

        // Insert Sale Item
        const itemId = crypto.randomUUID();
        await connection.query(
            `INSERT INTO sales_items (id, sale_id, inventory_id, product_name, quantity, unit_price, total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [itemId, saleId, item.id, item.name, qty, price, total] // Note: item total usually equals sale total for single item
        );

        console.log('✅ Test discounted sale created successfully.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        if (connection) await connection.end();
    }
}

seedDiscount();

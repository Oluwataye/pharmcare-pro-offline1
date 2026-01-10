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

async function addExpiringInventory() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database...');

        // Calculate dates
        const today = new Date();
        const addDays = (days) => {
            const date = new Date(today);
            date.setDate(date.getDate() + days);
            return date.toISOString().split('T')[0];
        };

        const sampleItems = [
            {
                id: crypto.randomUUID(),
                name: 'Paracetamol 500mg',
                quantity: 150,
                unit_price: 50.00,
                cost_price: 30.00,
                category: 'Analgesics',
                expiry_date: addDays(15), // Critical - expires in 15 days
                batch_number: 'PARA-2024-001',
                low_stock_threshold: 50
            },
            {
                id: crypto.randomUUID(),
                name: 'Amoxicillin 250mg',
                quantity: 80,
                unit_price: 120.00,
                cost_price: 80.00,
                category: 'Antibiotics',
                expiry_date: addDays(25), // Critical - expires in 25 days
                batch_number: 'AMOX-2024-002',
                low_stock_threshold: 30
            },
            {
                id: crypto.randomUUID(),
                name: 'Ibuprofen 400mg',
                quantity: 200,
                unit_price: 75.00,
                cost_price: 50.00,
                category: 'Anti-inflammatory',
                expiry_date: addDays(60), // Warning - expires in 60 days
                batch_number: 'IBU-2024-003',
                low_stock_threshold: 40
            },
            {
                id: crypto.randomUUID(),
                name: 'Vitamin C 1000mg',
                quantity: 120,
                unit_price: 150.00,
                cost_price: 100.00,
                category: 'Supplements',
                expiry_date: addDays(120), // Upcoming - expires in 120 days
                batch_number: 'VITC-2024-004',
                low_stock_threshold: 25
            },
            {
                id: crypto.randomUUID(),
                name: 'Cetirizine 10mg',
                quantity: 90,
                unit_price: 80.00,
                cost_price: 55.00,
                category: 'Antihistamines',
                expiry_date: addDays(45), // Warning - expires in 45 days
                batch_number: 'CET-2024-005',
                low_stock_threshold: 20
            },
            {
                id: crypto.randomUUID(),
                name: 'Metformin 500mg',
                quantity: 180,
                unit_price: 90.00,
                cost_price: 60.00,
                category: 'Antidiabetic',
                expiry_date: addDays(10), // Critical - expires in 10 days
                batch_number: 'MET-2024-006',
                low_stock_threshold: 50
            }
        ];

        console.log('Adding sample inventory items with expiry dates...');

        for (const item of sampleItems) {
            // Check if item already exists
            const [existing] = await connection.query('SELECT id FROM inventory WHERE name = ?', [item.name]);

            if (existing.length === 0) {
                await connection.query(
                    `INSERT INTO inventory (id, name, quantity, unit_price, cost_price, category, expiry_date, batch_number, low_stock_threshold) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [item.id, item.name, item.quantity, item.unit_price, item.cost_price, item.category, item.expiry_date, item.batch_number, item.low_stock_threshold]
                );
                console.log(`✅ Added: ${item.name} (expires in ${Math.ceil((new Date(item.expiry_date) - today) / (1000 * 60 * 60 * 24))} days)`);
            } else {
                console.log(`ℹ️  Skipped: ${item.name} (already exists)`);
            }
        }

        console.log('\n✅ Sample inventory with expiry dates is ready!');

    } catch (err) {
        console.error('❌ Failed to add inventory:', err);
    } finally {
        if (connection) await connection.end();
    }
}

addExpiringInventory();

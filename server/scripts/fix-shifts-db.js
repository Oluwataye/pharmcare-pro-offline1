
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '#1Olorunsogo',
    database: 'pharmcare_offline',
    multipleStatements: true
};

async function fixShiftsDB() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to MySQL for fixing shifts tables...');

        const tables = [
            `CREATE TABLE IF NOT EXISTS shifts (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL,
                start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                end_time DATETIME NULL,
                status ENUM('open', 'closed') DEFAULT 'open',
                opening_balance DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
                closing_balance DECIMAL(15, 2) NULL,
                total_sales DECIMAL(15, 2) DEFAULT 0.00,
                total_expenses DECIMAL(15, 2) DEFAULT 0.00,
                expected_cash DECIMAL(15, 2) DEFAULT 0.00,
                actual_cash DECIMAL(15, 2) NULL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );`,

            `CREATE TABLE IF NOT EXISTS cash_reconciliations (
                id VARCHAR(36) PRIMARY KEY,
                shift_id VARCHAR(36) NOT NULL,
                user_id VARCHAR(36) NOT NULL,
                reconciled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expected_amount DECIMAL(15, 2) NOT NULL,
                actual_amount DECIMAL(15, 2) NOT NULL,
                difference DECIMAL(15, 2) NOT NULL,
                status ENUM('pending', 'verified', 'discrepancy') DEFAULT 'pending',
                notes TEXT,
                verified_by VARCHAR(36),
                verified_at DATETIME NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (shift_id) REFERENCES shifts(id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (verified_by) REFERENCES users(id)
            );`,

            `CREATE TABLE IF NOT EXISTS expenses (
                id VARCHAR(36) PRIMARY KEY,
                amount DECIMAL(15, 2) NOT NULL,
                category VARCHAR(255) NOT NULL,
                description TEXT,
                user_id VARCHAR(36) NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            );`
        ];

        for (const sql of tables) {
            await connection.query(sql);
            console.log(`Executed: ${sql.substring(0, 50)}...`);
        }

        console.log('Shifts and related tables are ready.');

    } catch (err) {
        console.error('Failed to fix shifts tables:', err);
    } finally {
        if (connection) await connection.end();
    }
}

fixShiftsDB();

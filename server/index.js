import express from 'express';
import cors from 'cors';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import crypto from 'crypto';
import fs from 'fs';
import compression from 'compression';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logFile = path.join(__dirname, 'debug.log');

// --- ASYNC LOGGER (Performance Fix) ---
class AsyncLogger {
    constructor(filename) {
        this.logStream = fs.createWriteStream(filename, { flags: 'a' });
        this.logStream.on('error', (err) => console.error('[Logger] Stream error:', err));
    }

    log(msg) {
        const timestamp = new Date().toISOString();
        // Fire and forget - non-blocking
        this.logStream.write(`[${timestamp}] ${msg}\n`);
    }
}

const debugLogger = new AsyncLogger(path.join(__dirname, 'server_debug.log'));




// --- RESTART MARKER ---
// (Moved below logToFile)

// --- ROBUST HELPERS ---
const generateUUID = () => {
    try {
        return crypto.randomUUID();
    } catch (e) {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
};

const formatForMySQL = (val) => {
    if (!val) return val;
    if (typeof val !== 'string') return val;
    // Robustly handle ISO strings (2026-01-05T15:12:54.307Z -> 2026-01-05 15:12:54)
    if (val.includes('T') && (val.endsWith('Z') || val.includes('+'))) {
        return val.replace('T', ' ').replace('Z', '').split('.')[0].split('+')[0];
    }
    return val;
};

const logAuditEvent = async (connection, params) => {
    let {
        userId, userEmail, userRole, eventType, action,
        status = 'success', details = null, resourceType = null,
        resourceId = null, errorMessage = null, ipAddress = null, userAgent = null
    } = params;

    try {
        const id = generateUUID();

        // DEBUG: Log what we received
        logToFile(`AUDIT-DEBUG-RECEIVED: userId=${userId} email=${userEmail} role=${userRole} event=${eventType}`);

        // --- SIMPLIFIED IDENTITY RECOVERY (Avoiding Deadlocks) ---
        if (userId && userId !== 'system' && userId !== 'unknown' && (!userEmail || !userRole)) {
            try {
                // Just use a simple SELECT, no joins, for robustness
                const [uRows] = await connection.query('SELECT email, role FROM users WHERE id = ?', [userId]);
                if (uRows.length > 0) {
                    if (!userEmail) userEmail = uRows[0].email;
                    if (!userRole) userRole = uRows[0].role;
                }
            } catch (err) {
                logToFile(`AUDIT-LOG-USER-LOOKUP-ERROR: ${err.message}`);
            }
        }

        // Final fallbacks
        if (!userEmail) userEmail = userId === 'system' ? 'System' : 'Unknown';
        if (!userRole) userRole = userId === 'system' ? 'SYSTEM' : 'UNKNOWN';

        logToFile(`AUDIT-DEBUG-FINAL: email=${userEmail} role=${userRole}`);

        await connection.query(
            `INSERT INTO audit_logs (
                id, user_id, user_email, user_role, event_type, 
                action, status, resource_type, resource_id, 
                error_message, details, ip_address, user_agent, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                id, userId || 'system', userEmail, userRole, eventType,
                action, status, resourceType, resourceId,
                errorMessage, details ? (typeof details === 'object' ? JSON.stringify(details) : details) : null,
                ipAddress, userAgent
            ]
        );
        logToFile(`AUDIT-LOG-SUCCESS: Type=${eventType} User=${userEmail} Role=${userRole}`);
    } catch (err) {
        logToFile(`AUDIT-LOG-CRITICAL-FAILURE: ${err.message}`);
        console.error('[Server] Audit log failed:', err.message);
    }
};

const logToFile = (msg) => {
    // Non-blocking call to our stream
    debugLogger.log(msg);
};

// --- RESTART MARKER ---
logToFile(`[Server] index.js LOADED - Version 1.2.1-robust-patch`);
console.log(`[Server] index.js LOADED - Version 1.2.1-robust-patch`);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 80; // Default to 80 for pharmcarepro support

// --- CLEVER FIX: INSTANCE IDENTITY ---
const SERVER_INSTANCE_ID = generateUUID();
const SERVER_START_TIME = new Date().toISOString();
console.log(`[Server] STARTUP: Instance ${SERVER_INSTANCE_ID} at ${SERVER_START_TIME}`);
logToFile(`[Server] STARTUP: Instance ${SERVER_INSTANCE_ID} at ${SERVER_START_TIME}`);

// --- SECURITY GUARD (Clever Fix) ---
// Recursively rotate secret if default is found
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'offline_secret_key_change_me') {
    const newSecret = crypto.randomBytes(64).toString('hex');
    const envPath = path.join(__dirname, '../.env');
    try {
        let envContent = fs.readFileSync(envPath, 'utf8');
        // Replace or Append
        if (envContent.includes('JWT_SECRET=')) {
            envContent = envContent.replace(/JWT_SECRET=.*/g, `JWT_SECRET=${newSecret}`);
        } else {
            envContent += `\nJWT_SECRET=${newSecret}`;
        }
        fs.writeFileSync(envPath, envContent);
        process.env.JWT_SECRET = newSecret;
        console.warn(`[Security] 🛡️ NOTICE: JWT_SECRET was default/missing. Auto-rotated to a new secure value.`);
        logToFile(`[Security] Auto-rotated JWT_SECRET.`);
    } catch (e) {
        console.error(`[Security] ❌ CRITICAL: Failed to rotate insecure secret. Server stopped.`);
        process.exit(1);
    }
}

// Middleware
app.use(compression()); // Performance: GZIP
app.use(cors());
app.use((req, res, next) => {
    // Add Identity Headers to every response
    res.setHeader('X-Server-Instance-ID', SERVER_INSTANCE_ID);
    res.setHeader('X-Server-Start-Time', SERVER_START_TIME);
    next();
});
app.use(express.json());

// Global Request Logger (To File) - Placed after express.json() to capture parsed body
app.use((req, res, next) => {
    let logMsg = `[REQ] ${req.method} ${req.url}`;
    if (['POST', 'PATCH', 'PUT'].includes(req.method)) {
        logMsg += ` BODY: ${JSON.stringify(req.body)}`;
    }
    logToFile(logMsg);
    next();
});

// --- AUTHENTICATION MIDDLEWARE ---
const authenticateUser = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET || 'offline_secret_key_change_me', (err, user) => {
            if (err) {
                logToFile(`AUTH-ERROR: Invalid token - ${err.message}`);
            } else {
                req.user = user; // { id, email, role }
            }
            next();
        });
    } else {
        next();
    }
};

app.use(authenticateUser);

// --- HEALTH & VERSIONING ---
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        version: '1.2.0-identity-sync',
        mode: process.env.MODE || 'OFFLINE',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// Global Request Logger
app.use((req, res, next) => {
    if (req.url.startsWith('/api')) {
        console.log(`[Server] ${new Date().toLocaleTimeString()} | ${req.method} ${req.url}`);
    }
    next();
});

// Database Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '3307'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '#1Admin123',
    database: process.env.DB_NAME || 'pharmcare_offline',
    waitForConnections: true,
    connectionLimit: 50,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Forcing non-strict mode for every new connection and logging leaks
pool.on('connection', (connection) => {
    connection.query("SET SESSION sql_mode = '';");
    logToFile(`[DB] New connection established.`);
});

// Helper to wrap queries with error handling
const safeQuery = async (query, params) => {
    try {
        return await pool.query(query, params);
    } catch (err) {
        console.error(`[Server] Database Query Failed: ${err.message}`);
        throw err;
    }
};

// --- HELPER: Role Normalization ---
const normalizeRole = (r) => {
    if (!r.role) r.role = 'DISPENSER';
    r.role = r.role.toUpperCase();
    if (r.role === 'ADMIN') r.role = 'SUPER_ADMIN';
    return r;
};



// --- AUTH ROUTES ---

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        logToFile(`LOGIN ATTEMPT: Email="${email}" PasswordLength=${password ? password.length : 0}`);

        const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            logToFile(`LOGIN FAILED: User not found for email="${email}"`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = rows[0];
        logToFile(`LOGIN DEBUG: User found. ID="${user.id}" Role="${user.role}" Hash="${user.password_hash ? 'Present' : 'Missing'}"`);

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) {
            logToFile(`LOGIN FAILED: Password mismatch for email="${email}"`);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        logToFile(`LOGIN SUCCESS: email="${email}"`);
        const role = normalizeRole(user).role;
        const token = jwt.sign({ id: user.id, email: user.email, role }, process.env.JWT_SECRET || 'offline_secret_key_change_me', { expiresIn: '24h' });

        // Log successful login to audit
        const connection = await pool.getConnection();
        try {
            await logAuditEvent(connection, {
                userId: user.id,
                userEmail: user.email,
                userRole: user.role,
                eventType: 'USER_LOGIN',
                action: 'User logged in successfully',
                details: { ip: req.ip },
                ipAddress: req.ip,
                userAgent: req.headers['user-agent']
            });
        } finally {
            connection.release();
        }

        res.json({
            access_token: token,
            user: {
                id: user.id,
                email: user.email,
                full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
                role
            }
        });
    } catch (err) {
        logToFile(`LOGIN ERROR: ${err.message}`);
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// --- CORE FUNCTIONALITY (Before Generic Handlers) ---

// Inventory List (Explicit override for alphabetical sorting)
app.get('/api/inventory', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM inventory ORDER BY name ASC');
        const mappedRows = rows.map(r => ({
            ...r,
            price: Number(r.unit_price) || 0,
            reorderLevel: r.low_stock_threshold || 10,
            batchNumber: r.batch_number,
            expiryDate: r.expiry_date,
            sku: r.sku || `SKU-${r.id.slice(0, 8).toUpperCase()}`,
            unit: r.unit || 'pcs'
        }));
        res.json(mappedRows);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Specialized Sales Handling (Bulk Optimized)
const handleSaleCreation = async (body, connection) => {
    const {
        id, user_id, total, items, payment_method, customerName,
        discount, manualDiscount, tax_amount, saleType, transactionId,
        cashierName, cashierEmail, cashierId,
        customerPhone, businessName, businessAddress
    } = body;

    const saleId = id || generateUUID();
    const finalTransactionId = transactionId || `TR-${Date.now()}`;
    const start = Date.now();

    logToFile(`SALE START: ${finalTransactionId} Items=${items.length}`);

    // Verify User
    let finalUserId = user_id || 'admin-seed-id';

    // 1. Insert Header
    await connection.query(
        `INSERT INTO sales (
            id, user_id, total, discount, manual_discount, tax_amount, payment_method, 
            customer_name, customer_phone, business_name, business_address,
            sale_type, transaction_id, cashier_name, cashier_email, cashier_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            saleId, finalUserId, Number(total) || 0, Number(discount) || 0, Number(manualDiscount) || 0, Number(tax_amount) || 0, payment_method || 'Cash',
            customerName || 'Walk-in Customer', customerPhone, businessName, businessAddress,
            saleType || 'retail', finalTransactionId, cashierName || 'Admin', cashierEmail, cashierId
        ]
    );

    // 2. Batch Process Items (Vectorized)
    if (items.length > 0) {
        // A. Prepare Bulk Insert Data
        const itemValues = [];
        const updateIds = [];
        const updateCases = [];

        // Pre-fetch costs for all items in one go
        const prodIds = items.map(i => i.inventory_id || i.product_id || i.id);
        const [stockMap] = await connection.query(`SELECT id, cost_price, quantity FROM inventory WHERE id IN (?)`, [prodIds]);
        const costs = {};
        stockMap.forEach(r => costs[r.id] = Number(r.cost_price) || 0);

        for (const item of items) {
            const prodId = item.inventory_id || item.product_id || item.id;
            const itemId = generateUUID();
            const quantity = Number(item.quantity) || 0;
            const price = Number(item.price || item.unit_price) || 0;
            const itemTotal = Number(item.total) || (quantity * price);
            const cost = costs[prodId] || 0;

            itemValues.push([
                itemId, saleId, prodId, item.name || item.product_name,
                quantity, price, itemTotal, item.isWholesale || false, cost
            ]);

            // Prepare Update Case
            updateIds.push(prodId);
            updateCases.push(`WHEN '${prodId}' THEN quantity - ${quantity}`);
        }

        // B. Execute Bulk Insert (Single Query)
        await connection.query(
            `INSERT INTO sales_items (id, sale_id, inventory_id, product_name, quantity, unit_price, total, is_wholesale, cost_price) VALUES ?`,
            [itemValues]
        );

        // C. Execute Bulk Update (Single Query)
        // UPDATE inventory SET quantity = CASE id WHEN ... END, updated_at = NOW() WHERE id IN (...)
        if (updateIds.length > 0) {
            const updateSql = `UPDATE inventory SET quantity = CASE id ${updateCases.join(' ')} END, updated_at = NOW() WHERE id IN (?)`;
            await connection.query(updateSql, [updateIds]);
        }
    }

    // 3. Receipt Logic (Optimized)
    const receiptId = generateUUID();
    const receiptData = { /* ... minimal receipt data ... */
        saleId, transactionId: finalTransactionId, date: new Date().toISOString(),
        items: items, total, customerName, cashierName
    };
    // Optimization: saving less redundant data in giant JSON blobs if not needed, but keeping compat for now.
    // Actually, stick to compat for safety.

    await connection.query(
        'INSERT INTO receipts (id, sale_id, receipt_number, receipt_data) VALUES (?, ?, ?, ?)',
        [receiptId, saleId, finalTransactionId, JSON.stringify(body)] // Saving full body is safer for reprints
    );

    const duration = Date.now() - start;
    console.log(`[Server] SALE SUCCESS: ${finalTransactionId} processed in ${duration}ms (Rows: ${items.length})`);
    logToFile(`SALE SUCCESS: ${finalTransactionId} in ${duration}ms`);

    return { saleId, transactionId: finalTransactionId };
};

// Edge Function Bridge for Sales (Required by offline-client.ts invoke('complete-sale'))
app.post('/api/functions/complete-sale', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await handleSaleCreation(req.body, connection);

        // Audit - simplified for speed
        await logAuditEvent(connection, {
            userId: req.body.cashierId || req.body.user_id,
            userEmail: req.body.cashierEmail || 'unknown',
            eventType: 'SALE_CREATED',
            action: `Created sale ${result.transactionId}`,
            resourceType: 'sales',
            resourceId: result.saleId,
            ipAddress: req.ip
        });

        await connection.commit();
        res.json({ success: true, ...result });
    } catch (err) {
        await connection.rollback();
        logToFile(`SALE ERROR: ${err.message}`);
        console.error(err);
        res.status(500).json({ error: err.message });
    } finally {
        connection.release();
    }
});

app.post('/api/sales', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await handleSaleCreation(req.body, connection);

        // Log sale creation to audit
        const cashierEmail = req.body.cashierEmail || 'unknown';
        const cashierId = req.body.cashierId || req.body.user_id;

        await logAuditEvent(connection, {
            userId: cashierId,
            userEmail: cashierEmail,
            eventType: 'SALE_CREATED',
            action: `Created sale ${result.transactionId} - Total: ₦${req.body.total}`,
            resourceType: 'sales',
            resourceId: result.saleId,
            ipAddress: req.ip,
            userAgent: req.headers['user-agent']
        });

        await connection.commit();
        res.json({ success: true, ...result });
    } catch (err) {
        if (connection) await connection.rollback();
        console.error(`[Server] Sale Transaction FAILED: ${err.message}`);
        res.status(500).json({ error: 'Transaction failed', message: err.message });
    } finally {
        connection.release();
    }
});

// DELETED REPEATED CLOUD FUNCTION MOCK

// Cloud Function Mocks
app.post('/api/functions/create-user', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { email, password, name, first_name, last_name, role, username } = req.body;
        console.log(`[Server] CREATE-USER Attempt: Email="${email}" Role="${role}"`);

        // Handle name splitting if provided as single string
        let fName = first_name;
        let lName = last_name;
        if (name && !fName && !lName) {
            const parts = name.split(' ');
            fName = parts[0];
            lName = parts.slice(1).join(' ') || '';
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const userId = generateUUID();
        const profileId = generateUUID();
        const roleId = generateUUID();
        const finalRole = role || 'DISPENSER';

        // 1. Insert User
        await connection.query(
            'INSERT INTO users (id, email, password_hash, first_name, last_name, role) VALUES (?, ?, ?, ?, ?, ?)',
            [userId, email, passwordHash, fName, lName, finalRole]
        );

        // 2. Insert Profile
        await connection.query(
            'INSERT INTO profiles (id, user_id, name, username, updated_at) VALUES (?, ?, ?, ?, NOW())',
            [profileId, userId, name || `${fName} ${lName}`.trim(), username || email.split('@')[0]]
        );

        // 3. Insert Role
        await connection.query(
            'INSERT INTO user_roles (id, user_id, role, updated_at) VALUES (?, ?, ?, NOW())',
            [roleId, userId, finalRole]
        );

        await connection.commit();

        console.log(`[Server] User Created: ${email} (${finalRole})`);
        res.json({
            success: true,
            user: {
                id: userId,
                email,
                first_name: fName,
                last_name: lName,
                role: finalRole
            }
        });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('[Server] Create User Failed:', err);

        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'User already exists', details: 'Email or User ID already taken' });
        }
        res.status(500).json({ error: 'User creation failed', details: err.message });
    } finally {
        connection.release();
    }
});

app.post('/api/functions/reset-user-password', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { userId, newPassword } = req.body;

        if (!userId || !newPassword) {
            return res.status(400).json({ error: 'Missing userId or newPassword' });
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);

        await connection.query(
            'UPDATE users SET password_hash = ? WHERE id = ?',
            [passwordHash, userId]
        );

        console.log(`[Server] Password Reset Success for User ID: ${userId}`);
        res.json({ success: true });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('[Server] Password Reset Failed:', err);
        res.status(500).json({ error: 'Password reset failed', details: err.message });
    } finally {
        connection.release();
    }
});


app.post('/api/functions/update-user', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id, email, name, username, role, phone, department, notes } = req.body;

        if (!id) throw new Error('User ID is required');

        logToFile(`UPDATE-USER: ID="${id}" Payload=${JSON.stringify(req.body)}`);

        // 1. Update User (Email)
        if (email) {
            await connection.query('UPDATE users SET email = ? WHERE id = ?', [email, id]);
        }

        // 2. Update Profile (Name, Username, etc)
        const [existingProfile] = await connection.query('SELECT * FROM profiles WHERE user_id = ?', [id]);
        console.log(`[Server] DEBUG: Existing Profile found: ${existingProfile.length > 0}`);

        if (existingProfile.length > 0) {
            await connection.query(
                'UPDATE profiles SET name = ?, username = ?, updated_at = NOW() WHERE user_id = ?',
                [name, username, id]
            );
        } else {
            // Create profile if missing (resilience)
            console.log(`[Server] DEBUG: Inserting NEW Profile for User ID: "${id}"`);
            await connection.query(
                'INSERT INTO profiles (id, user_id, name, username) VALUES (?, ?, ?, ?)',
                [generateUUID(), id, name, username]
            );
        }

        // 3. Update Role
        const [existingRole] = await connection.query('SELECT * FROM user_roles WHERE user_id = ?', [id]);
        if (existingRole.length > 0) {
            await connection.query(
                'UPDATE user_roles SET role = ?, updated_at = NOW() WHERE user_id = ?',
                [role, id]
            );
        } else {
            // Create role if missing
            await connection.query(
                'INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, ?)',
                [generateUUID(), id, role]
            );
        }

        await connection.commit();
        console.log(`[Server] User Updated: ${id}`);
        res.json({ success: true });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('[Server] Update User Failed:', err);

        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Email already in use by another user' });
        }
        res.status(500).json({ error: 'Update failed', details: err.message });
    } finally {
        connection.release();
    }
});

app.post('/api/functions/delete-user', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { userId } = req.body;
        if (!userId) throw new Error('User ID is required');

        console.log(`[Server] DELETE USER: ${userId}`);

        // Delete in order: roles, profiles, then user (respects FK constraints)
        await connection.query('DELETE FROM user_roles WHERE user_id = ?', [userId]);
        await connection.query('DELETE FROM profiles WHERE user_id = ?', [userId]);
        await connection.query('DELETE FROM users WHERE id = ?', [userId]);

        await connection.commit();
        console.log(`[Server] User Deleted: ${userId}`);
        res.json({ success: true });

    } catch (err) {
        if (connection) await connection.rollback();
        console.error('[Server] Delete User Failed:', err);
        res.status(500).json({ error: 'Delete failed', details: err.message });
    } finally {
        connection.release();
    }
});
app.post('/api/functions/delete-user', async (req, res) => {
    // ... (existing code)
});

// --- CUSTOM HANDLER FOR RECEITPS (Fixes 500 Error on filtering) ---
app.get('/api/receipts', async (req, res) => {
    try {
        const cashierParams = Object.keys(req.query).find(k => k.startsWith('sales.cashier_id'));
        let query = 'SELECT r.* FROM receipts r';
        const params = [];

        if (cashierParams) {
            // Extract the UUID from "sales.cashier_id=eq.UUID"
            // Handles both simple query and PostgREST style
            const cashierId = req.query[cashierParams].replace('eq.', '');
            query += ' JOIN sales s ON r.sale_id = s.id WHERE s.cashier_id = ?';
            params.push(cashierId);
        }

        // Handle ordering
        const orderParam = req.query.order;
        if (orderParam) {
            const [col, dir] = orderParam.split('.');
            // Sanitize column name to allow only alphanumeric and underscores
            const safeCol = col.replace(/[^a-z0-9_]/gi, '');
            const safeDir = (dir && dir.toLowerCase() === 'desc') ? 'DESC' : 'ASC';
            query += ` ORDER BY r.${safeCol} ${safeDir}`;
        } else {
            query += ' ORDER BY r.created_at DESC';
        }

        const [rows] = await safeQuery(query, params);
        res.json(rows);
    } catch (err) {
        logToFile(`RECEIPTS ERROR: ${err.message}`);
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch receipts' });
    }
});

app.post('/api/functions/list-users', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT id, email, role, first_name, last_name FROM users');
        const users = rows.map(u => ({
            ...u,
            role: normalizeRole(u).role
        }));
        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: 'Failed to list users' });
    }
});

app.post('/api/rpc/:func', async (req, res) => {
    const { func } = req.params;
    console.log(`[Server] RPC Call: ${func}`);

    if (func === 'log_audit_event') {
        const connection = await pool.getConnection();
        try {
            const {
                p_user_id, p_user_email, p_user_role, p_event_type,
                p_action, p_status, p_resource_type, p_resource_id,
                p_details, p_error_message, p_ip_address, p_user_agent
            } = req.body;

            // Priority: explicit params > middleware session > system
            const finalUserId = p_user_id || (req.user ? req.user.id : 'system');
            const finalEmail = p_user_email || (req.user && !p_user_id ? req.user.email : null);
            const finalRole = p_user_role || (req.user && !p_user_id ? req.user.role : null);

            await logAuditEvent(connection, {
                userId: finalUserId,
                userEmail: finalEmail,
                userRole: finalRole,
                eventType: p_event_type,
                action: p_action,
                status: p_status,
                details: p_details,
                resourceType: p_resource_type,
                resourceId: p_resource_id,
                errorMessage: p_error_message,
                ipAddress: p_ip_address || req.ip,
                userAgent: p_user_agent || req.headers['user-agent']
            });
            res.json({ success: true });
        } catch (err) {
            console.error('[Server] RPC log_audit_event failed:', err);
            res.status(500).json({ error: 'Failed to log audit event' });
        } finally {
            connection.release();
        }
        return;
    }

    // Always return success for other mock RPCs
    res.json({ success: true, message: 'RPC handled by offline mock' });
});

// --- GENERIC DATA HANDLERS ---

app.get('/api/:table', async (req, res) => {
    try {
        const { table } = req.params;
        if (!/^[a-z0-9_]+$/i.test(table)) return res.status(400).json({ error: 'Invalid table' });

        let targetTable = table;
        // The profiles/user_roles remapping is no longer needed as we now have the tables
        // but we'll keep it as a fallback if the tables don't exist yet

        let sql = `SELECT * FROM ${targetTable}`;
        let params = [];
        const reservedParams = ['order', 'limit', 'select', 'offset'];
        const filters = Object.entries(req.query)
            .filter(([k, v]) => !reservedParams.includes(k) && String(v).includes('.'));

        if (filters.length > 0) {
            sql += ' WHERE ' + filters.map(([k, v]) => {
                let col = (targetTable === 'users' && k === 'user_id' ? 'id' : k);
                const parts = String(v).split('.');
                const op = parts[0];
                let val = parts.slice(1).join('.');

                // Robust Date Handling
                if (val.includes('202') && (val.includes('T') || val.includes('-'))) {
                    val = val.replace('T', ' ').replace('Z', '').replace('t', ' ').split('.')[0];
                }

                params.push(val);

                switch (op) {
                    case 'gt': return `${col} > ?`;
                    case 'gte': return `${col} >= ?`;
                    case 'lt': return `${col} < ?`;
                    case 'lte': return `${col} <= ?`;
                    case 'neq': return `${col} != ?`;
                    case 'like':
                    case 'ilike':
                        params[params.length - 1] = `%${val}%`;
                        return `${col} LIKE ?`;
                    case 'in':
                        const list = val.replace('(', '').replace(')', '').split(',');
                        params.pop();
                        params.push(...list);
                        return `${col} IN (${list.map(() => '?').join(',')})`;
                    default: return `${col} = ?`;
                }
            }).join(' AND ');
        }

        // --- Handle Order & Limit ---
        if (req.query.order) {
            const [col, dir] = req.query.order.split('.');
            sql += ` ORDER BY ${col} ${dir === 'desc' ? 'DESC' : 'ASC'}`;
        } else if (table === 'inventory') {
            sql += ` ORDER BY name ASC`;
        }

        if (req.query.limit) {
            sql += ` LIMIT ${parseInt(req.query.limit)}`;
        }

        let [rows] = await pool.query(sql, params);

        // --- INVENTORY MAPPING (Fix NaN Price & Missing Fields) ---
        if (table === 'inventory') {
            rows = rows.map(r => ({
                ...r,
                price: Number(r.unit_price) || 0,
                unit_price: Number(r.unit_price) || 0,
                reorderLevel: r.low_stock_threshold || 10,
                reorder_level: r.low_stock_threshold || 10,
                batch_number: r.batch_number,
                batchNumber: r.batch_number,
                expiry_date: r.expiry_date,
                expiryDate: r.expiry_date,
                sku: r.sku || `SKU-${r.id.slice(0, 8).toUpperCase()}`,
                unit: r.unit || 'pcs'
            }));
        }

        // --- SALES & SALES_ITEMS MAPPING ---
        if (table === 'sales') {
            rows = rows.map(r => ({
                ...r,
                total: Number(r.total) || 0,
                discount: Number(r.discount) || 0,
                manual_discount: Number(r.manual_discount) || 0,
                tax_amount: Number(r.tax_amount) || 0
            }));
        }

        if (table === 'sales_items') {
            rows = rows.map(r => ({
                ...r,
                price: Number(r.unit_price) || 0,
                unit_price: Number(r.unit_price) || 0,
                total: Number(r.total) || 0,
                discount: Number(r.discount) || 0
            }));
        }

        if (table === 'profiles') {
            return res.json(rows.map(r => ({
                ...r,
                name: r.name || 'User',
                username: r.username || 'user'
            })));
        }
        if (table === 'user_roles') {
            return res.json(rows.map(r => normalizeRole(r)));
        }

        res.json(rows);
    } catch (err) {
        console.error('[Server] Generic GET Error:', err.message);
        if (err.code === 'ER_NO_SUCH_TABLE') return res.json([]);
        res.status(500).json({ error: 'DB error', details: err.message });
    }
});

app.post('/api/:table', async (req, res) => {
    try {
        const { table } = req.params;

        // --- SAFE DATA EXTRACTION ---
        let body = req.body;
        if (Array.isArray(body)) body = body[0] || {};

        let data = {};
        if (typeof body === 'object' && body !== null) {
            Object.assign(data, body);
        }

        if (!data.id) {
            data.id = generateUUID();
            console.log(`[Server] Generating UUID for ${table}: ${data.id}`);
        }

        if (table === 'inventory') {
            // --- AUTO SKU GENERATION ---
            if (!data.sku || data.sku.trim() === '') {
                const catPrefix = (data.category || 'GEN').substring(0, 2).toUpperCase();
                const namePrefix = (data.name || 'PRD').substring(0, 3).toUpperCase();
                const randSuffix = Math.floor(1000 + Math.random() * 9000);
                data.sku = `PH-${catPrefix}-${namePrefix}-${randSuffix}`;
            }

            // --- Robust Mapping for Legacy/Variant Columns ---
            const mapKeys = {
                'price': 'unit_price',
                'reorderLevel': 'low_stock_threshold',
                'reorder_level': 'low_stock_threshold',
                'batchNumber': 'batch_number',
                'expiryDate': 'expiry_date'
            };

            for (const [key, dbCol] of Object.entries(mapKeys)) {
                if (data[key] !== undefined) {
                    data[dbCol] = data[key];
                    if (key !== dbCol) delete data[key];
                }
            }
        }

        // --- SALES MAPPING (CamelCase to SnakeCase) ---
        if (table === 'sales') {
            const mapKeys = {
                'manualDiscount': 'manual_discount',
                'customerName': 'customer_name',
                'customerPhone': 'customer_phone',
                'businessName': 'business_name',
                'businessAddress': 'business_address',
                'transactionId': 'transaction_id',
                'saleType': 'sale_type',
                'cashierId': 'cashier_id',
                'cashierName': 'cashier_name',
                'cashierEmail': 'cashier_email'
            };

            for (const [key, dbCol] of Object.entries(mapKeys)) {
                if (data[key] !== undefined) {
                    data[dbCol] = data[key];
                    if (key !== dbCol) delete data[key];
                }
            }
        }

        const keys = Object.keys(data);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
        const values = Object.values(data).map(v => (v && typeof v === 'object') ? JSON.stringify(v) : v);

        // --- DEBUG LOGGING ---
        logToFile(`POST /api/${table} SQL: ${sql} VALUES: ${JSON.stringify(values)}`);

        await pool.query(sql, values);
        console.log(`[Server] POST /api/${table} SUCCESS: ${data.id}`);

        // Audit logging for transaction-related tables
        if (['inventory', 'refunds'].includes(table)) {
            const connection = await pool.getConnection();
            try {
                const eventType = table === 'inventory' ? 'INVENTORY_CREATED' : 'REFUND_INITIATED';
                const action = table === 'inventory'
                    ? `Created inventory item: ${data.name || 'Unknown'}`
                    : `Initiated refund request`;

                // Identity Priority: explicit data > middleware > system
                const finalUserId = data.user_id || (req.user ? req.user.id : 'system');
                const finalEmail = (req.user && !data.user_id) ? req.user.email : null;
                const finalRole = (req.user && !data.user_id) ? req.user.role : null;

                await logAuditEvent(connection, {
                    userId: finalUserId,
                    userEmail: finalEmail,
                    userRole: finalRole,
                    eventType,
                    action,
                    resourceType: table,
                    resourceId: data.id,
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });
            } finally {
                connection.release();
            }
        }

        res.json({ success: true, id: data.id });
    } catch (err) {
        const errMsg = `[Server] POST /api/${req.params.table} FAILED: ${err.message}`;
        console.error(errMsg);
        logToFile(errMsg);
        if (err.sql) logToFile(`FAILED SQL: ${err.sql}`);
        res.status(500).json({ error: 'Insert failed', message: err.message });
    }
});

app.patch('/api/:table', async (req, res) => {
    logToFile(`[Server] Entering PATCH /api/${req.params.table}`);
    try {
        const { table } = req.params;
        let data = { ...req.body };
        const targetId = (req.query.id ? req.query.id.replace('eq.', '') : data.id);

        if (table === 'inventory') {
            // --- Robust Mapping for Legacy/Variant Columns ---
            const mapKeys = {
                'price': 'unit_price',
                'reorderLevel': 'low_stock_threshold',
                'reorder_level': 'low_stock_threshold',
                'batchNumber': 'batch_number',
                'expiryDate': 'expiry_date'
            };

            for (const [key, dbCol] of Object.entries(mapKeys)) {
                if (data[key] !== undefined) {
                    data[dbCol] = data[key];
                    if (key !== dbCol) delete data[key];
                }
            }
        }

        const updates = Object.keys(data).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
        const params = Object.keys(data)
            .filter(k => k !== 'id')
            .map(k => {
                let val = data[k];
                // Robustly format dates/times for MySQL
                if (k.toLowerCase().includes('_at') || k.toLowerCase().includes('date')) {
                    val = formatForMySQL(val);
                }
                return (val && typeof val === 'object') ? JSON.stringify(val) : val;
            });

        params.push(targetId);

        logToFile(`[Server] PATCH /api/${table} id=${targetId} STEP 1: Executing Update...`);
        const [updateResult] = await pool.query(`UPDATE ${table} SET ${updates} WHERE id = ?`, params);
        logToFile(`[Server] PATCH /api/${table} id=${targetId} STEP 2: Update Result: ${JSON.stringify(updateResult)}`);

        // --- SPECIAL LOGIC: Handle Refund Approval (Restore Inventory) ---
        if (table === 'refunds' && data.status === 'approved') {
            try {
                console.log(`[Server] Detected Approved Refund ${targetId}. Restoring inventory...`);
                logToFile(`[Server] Restoring inventory for refund ${targetId}`);

                const [refunds] = await pool.query('SELECT items, sale_id FROM refunds WHERE id = ?', [targetId]);
                if (refunds.length > 0 && refunds[0].items) {
                    const itemsData = refunds[0].items;
                    const items = typeof itemsData === 'string' ? JSON.parse(itemsData) : itemsData;

                    if (Array.isArray(items)) {
                        for (const item of items) {
                            const prodId = item.inventory_id || item.product_id || item.id;
                            const qty = parseInt(item.quantity) || 0;

                            if (prodId && qty > 0) {
                                await pool.query(
                                    'UPDATE inventory SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                                    [qty, prodId]
                                );
                                console.log(`[Server]   - Restored ${qty} to Inventory ID ${prodId}`);
                                logToFile(`[Server] Restored ${qty} to inventory ${prodId}`);
                            }
                        }
                    }
                }
                logToFile(`[Server] Inventory restoration completed for refund ${targetId}`);
            } catch (restoreErr) {
                console.error(`[Server] Inventory restoration failed for refund ${targetId}:`, restoreErr);
                logToFile(`[Server] Inventory restoration CRITICAL ERROR: ${restoreErr.message}`);
            }
        }

        // Audit logging for transaction-related updates
        if (['inventory', 'refunds'].includes(table)) {
            const connection = await pool.getConnection();
            try {
                let eventType, action;
                if (table === 'refunds' && data.status === 'approved') {
                    eventType = 'REFUND_APPROVED';
                    action = `Approved refund ${targetId}`;
                } else if (table === 'inventory') {
                    eventType = 'INVENTORY_UPDATED';
                    action = `Updated inventory item ${targetId}`;
                } else if (table === 'refunds') {
                    eventType = 'REFUND_UPDATED';
                    action = `Updated refund ${targetId}`;
                }

                if (eventType) {
                    // Identity Priority: explicit data > middleware > system
                    const finalUserId = data.user_id || (req.user ? req.user.id : 'system');
                    const finalEmail = (req.user && !data.user_id) ? req.user.email : null;
                    const finalRole = (req.user && !data.user_id) ? req.user.role : null;

                    await logAuditEvent(connection, {
                        userId: finalUserId,
                        userEmail: finalEmail,
                        userRole: finalRole,
                        eventType,
                        action,
                        resourceType: table,
                        resourceId: targetId,
                        ipAddress: req.ip,
                        userAgent: req.headers['user-agent']
                    });
                }
            } finally {
                connection.release();
            }
        }

        res.json({ success: true });
    } catch (err) {
        const errMsg = `[Server] PATCH /api/${req.params.table} FAILED: ${err.message}`;
        console.error(errMsg, err);
        logToFile(errMsg);
        if (err.stack) logToFile(`STACK: ${err.stack}`);
        res.status(500).json({ error: 'Update failed', message: err.message });
    }
});

app.delete('/api/:table', async (req, res) => {
    logToFile(`[Server] Entering DELETE /api/${req.params.table}`);
    try {
        const { table } = req.params;
        const query = req.query;
        let sql = `DELETE FROM ${table} WHERE `;
        let params = [];

        const conditions = [];
        for (const [key, value] of Object.entries(query)) {
            if (value.startsWith('eq.')) {
                conditions.push(`${key} = ?`);
                params.push(value.replace('eq.', ''));
            } else if (value.startsWith('in.')) {
                const values = value.replace('in.(', '').replace(')', '').split(',');
                conditions.push(`${key} IN (${values.map(() => '?').join(',')})`);
                params.push(...values);
            }
        }

        if (conditions.length === 0) {
            return res.status(400).json({ error: 'No delete condition provided' });
        }

        sql += conditions.join(' AND ');
        logToFile(`[Server] DELETE /api/${table} SQL: ${sql} PARAMS: ${JSON.stringify(params)}`);

        const [result] = await pool.query(sql, params);
        console.log(`[Server] DELETE /api/${table} SUCCESS: ${result.affectedRows} rows`);

        // Audit Logging
        if (['inventory', 'refunds', 'suppliers'].includes(table)) {
            const connection = await pool.getConnection();
            try {
                const finalUserId = req.user ? req.user.id : 'system';
                const finalEmail = req.user ? req.user.email : null;
                const finalRole = req.user ? req.user.role : null;

                await logAuditEvent(connection, {
                    userId: finalUserId,
                    userEmail: finalEmail,
                    userRole: finalRole,
                    eventType: `${table.toUpperCase()}_DELETED`,
                    action: `Deleted ${result.affectedRows} items from ${table}`,
                    resourceType: table,
                    resourceId: params[0] || 'multiple',
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent']
                });
            } finally {
                connection.release();
            }
        }

        res.json({ success: true, affectedRows: result.affectedRows });
    } catch (err) {
        const errMsg = `[Server] DELETE /api/${req.params.table} FAILED: ${err.message}`;
        console.error(errMsg);
        logToFile(errMsg);
        res.status(500).json({ error: 'Delete failed', message: err.message });
    }
});

// --- STATIC ASSETS & SPA ---
app.use(express.static(path.join(__dirname, '../dist')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// --- SERVER START ---
app.listen(PORT, () => {
    console.log(`[Server] Starting with DB_HOST: ${process.env.DB_HOST}, PORT: ${PORT}`);
    console.log(`
    🚀 PharmCare Offline Server Ready!
    -----------------------------------
    Access URL:  http://pharmcarepro/
    Admin:       admin@pharmcarepro.com / Admin@123!
    -----------------------------------
    `);
});

// IP Helper for LAN
function getLocalIP() {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) return net.address;
        }
    }
    return 'localhost';
}

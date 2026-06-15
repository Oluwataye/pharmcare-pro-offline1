import mysql from 'mysql2/promise';
import crypto from 'crypto';

const dbConfig = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '#1Olorunsogo',
  database: 'pharmcare_offline',
  connectionLimit: 50,
  waitForConnections: true,
  queueLimit: 0
};

const TEST_PRODUCT_ID = 'test-concurrent-eye-drop-id';
const STARTING_QTY = 1000;

async function setupTestProduct(pool) {
  const [rows] = await pool.query('SELECT id FROM inventory WHERE id = ?', [TEST_PRODUCT_ID]);
  if (rows.length === 0) {
    console.log('[Setup] Inserting test product...');
    await pool.query(
      `INSERT INTO inventory (id, name, quantity, unit_price, cost_price, category) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [TEST_PRODUCT_ID, 'Simulated Eye Drops 10ml', STARTING_QTY, 1500.00, 1000.00, 'Ophthalmology']
    );
  } else {
    console.log('[Setup] Resetting test product quantity...');
    await pool.query('UPDATE inventory SET quantity = ? WHERE id = ?', [STARTING_QTY, TEST_PRODUCT_ID]);
  }
}

async function simulateSingleSaleTransaction(pool, clientId, quantityToSell) {
  const connection = await pool.getConnection();
  const start = Date.now();
  try {
    // Disable strict mode as done in production server
    await connection.query("SET SESSION sql_mode = '';");
    
    await connection.beginTransaction();

    // 1. Lock Row FOR UPDATE to simulate stock check
    const [rows] = await connection.query(
      'SELECT id, name, quantity, cost_price FROM inventory WHERE id = ? FOR UPDATE',
      [TEST_PRODUCT_ID]
    );

    if (rows.length === 0) {
      throw new Error('Product not found');
    }

    const currentQty = rows[0].quantity;
    if (currentQty < quantityToSell) {
      throw new Error(`Out of stock. Available: ${currentQty}, Requested: ${quantityToSell}`);
    }

    // 2. Decrement Stock
    const [updateRes] = await connection.query(
      'UPDATE inventory SET quantity = quantity - ? WHERE id = ? AND quantity >= ?',
      [quantityToSell, TEST_PRODUCT_ID, quantityToSell]
    );

    if (updateRes.affectedRows === 0) {
      throw new Error('Concurrent update conflict detected');
    }

    // 3. Insert Sale Header
    const saleId = crypto.randomUUID();
    const txId = `TX-SIM-${clientId}-${Date.now()}`;
    await connection.query(
      `INSERT INTO sales (id, total, discount, payment_method, customer_name, transaction_id, cashier_name) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [saleId, quantityToSell * 1500.00, 0, 'Cash', `Patient-${clientId}`, txId, `Cashier-${clientId}`]
    );

    // 4. Insert Sale Item
    await connection.query(
      `INSERT INTO sales_items (id, sale_id, inventory_id, product_name, quantity, unit_price, total) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), saleId, TEST_PRODUCT_ID, 'Simulated Eye Drops 10ml', quantityToSell, 1500.00, quantityToSell * 1500.00]
    );

    // 5. Log Stock Movement
    await connection.query(
      `INSERT INTO stock_movements (id, product_id, quantity_change, previous_quantity, new_quantity, type, reason, reference_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), TEST_PRODUCT_ID, -quantityToSell, currentQty, currentQty - quantityToSell, 'SALE', `Simulated sale ${txId}`, saleId]
    );

    await connection.commit();
    return { success: true, duration: Date.now() - start };
  } catch (err) {
    await connection.rollback();
    return { success: false, error: err.message, duration: Date.now() - start };
  } finally {
    connection.release();
  }
}

async function runConcurrencyTest(pool, totalUsers) {
  console.log(`\n--- Starting Concurrency Test for ${totalUsers} Users ---`);
  await setupTestProduct(pool);

  const promises = [];
  for (let i = 0; i < totalUsers; i++) {
    promises.push(simulateSingleSaleTransaction(pool, i, 1));
  }

  const start = Date.now();
  const results = await Promise.all(promises);
  const totalDuration = Date.now() - start;

  let successCount = 0;
  let failureCount = 0;
  let totalLatency = 0;
  const errors = {};

  results.forEach(res => {
    totalLatency += res.duration;
    if (res.success) {
      successCount++;
    } else {
      failureCount++;
      errors[res.error] = (errors[res.error] || 0) + 1;
    }
  });

  const avgLatency = (totalLatency / totalUsers).toFixed(2);

  // Verify DB consistency
  const [rows] = await pool.query('SELECT quantity FROM inventory WHERE id = ?', [TEST_PRODUCT_ID]);
  const finalQty = rows[0].quantity;
  const expectedQty = STARTING_QTY - successCount;
  const consistent = finalQty === expectedQty;

  console.log(`Results for ${totalUsers} concurrent users:`);
  console.log(`  - Total Time: ${totalDuration} ms`);
  console.log(`  - Successful Transactions: ${successCount}`);
  console.log(`  - Failed Transactions: ${failureCount}`);
  console.log(`  - Avg Client Latency: ${avgLatency} ms`);
  if (failureCount > 0) {
    console.log(`  - Errors:`, errors);
  }
  console.log(`  - Database Consistency Check: ${consistent ? 'PASSED ✅' : 'FAILED ❌'} (Expected: ${expectedQty}, Got: ${finalQty})`);

  // Cleanup sales, items, movements, and resets quantity
  await pool.query('DELETE FROM sales_items WHERE inventory_id = ?', [TEST_PRODUCT_ID]);
  await pool.query('DELETE FROM stock_movements WHERE product_id = ?', [TEST_PRODUCT_ID]);
  await pool.query('DELETE FROM sales WHERE customer_name LIKE "Patient-%"');

  return { totalUsers, totalDuration, successCount, failureCount, avgLatency, consistent };
}

async function main() {
  const pool = mysql.createPool(dbConfig);
  try {
    const summary = [];
    summary.push(await runConcurrencyTest(pool, 5));
    summary.push(await runConcurrencyTest(pool, 10));
    summary.push(await runConcurrencyTest(pool, 20));
    summary.push(await runConcurrencyTest(pool, 50));

    console.log('\n======================================');
    console.log('         CONCURRENCY SUMMARY          ');
    console.log('======================================');
    console.table(summary);
  } catch (err) {
    console.error('Test run failed:', err);
  } finally {
    await pool.end();
  }
}

main();

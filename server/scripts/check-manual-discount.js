import mysql from 'mysql2/promise';

(async () => {
    const conn = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '#1Admin123',
        database: 'pharmcare_offline',
        port: 3307
    });

    console.log('=== MANUAL DISCOUNT DIAGNOSTIC ===\n');

    // Check if column exists
    const [columns] = await conn.query('DESCRIBE sales');
    const hasManualDiscount = columns.some(c => c.Field === 'manual_discount');
    console.log(`✓ manual_discount column exists: ${hasManualDiscount}\n`);

    // Check recent sales
    const [sales] = await conn.query(`
    SELECT id, total, discount, manual_discount, created_at 
    FROM sales 
    ORDER BY created_at DESC 
    LIMIT 10
  `);

    console.log('Recent Sales:');
    console.log('ID (short) | Total | Discount% | Manual₦ | Date');
    console.log('-'.repeat(70));

    sales.forEach(s => {
        const id = s.id.substring(0, 8);
        const date = new Date(s.created_at).toLocaleString();
        console.log(`${id}... | ₦${s.total} | ${s.discount}% | ₦${s.manual_discount || 0} | ${date}`);
    });

    // Calculate totals
    const totalPercentDiscount = sales.reduce((sum, s) => sum + (parseFloat(s.discount) || 0), 0);
    const totalManualDiscount = sales.reduce((sum, s) => sum + (parseFloat(s.manual_discount) || 0), 0);

    console.log('\n=== TOTALS (Last 10 Sales) ===');
    console.log(`Total Percentage Discounts: ${totalPercentDiscount}%`);
    console.log(`Total Manual Discounts: ₦${totalManualDiscount}`);
    console.log(`Combined Total: ₦${totalManualDiscount} + ${totalPercentDiscount}% of sales`);

    await conn.end();
    process.exit(0);
})();

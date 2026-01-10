import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001/api';

(async () => {
    console.log('=== TESTING API ENDPOINTS WITH VALID DATA ===');

    try {
        // 1. Get a valid user
        const usersRes = await fetch(`${API_BASE}/users?limit=1`);
        const users = await usersRes.json();
        if (!users.length) throw new Error('No users found');
        const userId = users[0].id;
        console.log(`Using User ID: ${userId}`);

        // 1b. Get a valid inventory item
        const invRes = await fetch(`${API_BASE}/inventory?limit=1`);
        const invItems = await invRes.json();
        if (!invItems.length) throw new Error('No inventory found');
        const validItem = invItems[0];
        console.log(`Using Inventory Item: ${validItem.name} (${validItem.id})`);

        // 2. Test Edge Function Endpoint (POST /api/functions/complete-sale)
        console.log('\n[TEST 2] POST /api/functions/complete-sale');
        const res = await fetch(`${API_BASE}/functions/complete-sale`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                items: [{
                    id: validItem.id,
                    inventory_id: validItem.id, // Some logic uses inventory_id
                    product_name: validItem.name,
                    quantity: 1,
                    unit_price: 100,
                    total: 100
                }],
                total: 50, // 100 - 50 discount
                manualDiscount: 50,
                saleType: 'retail',
                transactionId: `test-tx-${Date.now()}`,
                user_id: userId,
                cashierId: userId,
                payment_method: 'Cash'
            })
        });

        console.log(`Status: ${res.status}`);
        if (res.headers.get('content-type')?.includes('application/json')) {
            const data = await res.json();
            console.log('Response:', data);
        } else {
            const text = await res.text();
            console.log('Response Text:', text.substring(0, 100) + '...');
        }

    } catch (e) {
        console.error('Test Failed:', e.message);
    }
})();

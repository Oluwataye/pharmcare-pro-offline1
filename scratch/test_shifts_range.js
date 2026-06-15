// Run with node
async function runTests() {
    console.log('🧪 Starting Date Range Filtering Tests on Shifts...');

    // 1. Obtain Auth Token
    const loginRes = await fetch('http://localhost:3100/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@pharmcarepro.com', password: 'Admin@123!' })
    });
    
    if (!loginRes.ok) {
        throw new Error(`Auth failed with status ${loginRes.status}`);
    }
    const loginData = await loginRes.json();
    const token = loginData.access_token;
    console.log('✅ Successfully authenticated!');

    // 2. Fetch shifts with created_at limit only (preset behavior matching February 2026 shift)
    console.log('\n[Test 2] Querying shifts with start date only (gte from 2026-02-01)...');
    const startOfRange = '2026-02-01T00:00:00.000Z';
    const presetRes = await fetch(`http://localhost:3100/api/shifts?created_at=gte.${startOfRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`Preset query status: ${presetRes.status}`);
    const presetData = await presetRes.json();
    console.log(`Found ${presetData.length} shifts.`);
    if (presetData.length > 0) {
        console.log('Preset match date:', presetData[0].created_at);
    }

    // 3. Fetch shifts with created_at AND created_at_end (custom range in February 2026 matching the shift)
    console.log('\n[Test 3] Querying shifts with custom range (2026-02-01 to 2026-02-28)...');
    const endOfRange = '2026-02-28T23:59:59.999Z';
    const rangeRes = await fetch(`http://localhost:3100/api/shifts?created_at=gte.${startOfRange}&created_at_end=lte.${endOfRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`Range query status: ${rangeRes.status}`);
    const rangeData = await rangeRes.json();
    console.log(`Found ${rangeData.length} shifts.`);

    // 3.5. Fetch shifts with custom range ending BEFORE the shift (Feb 1 to Feb 15)
    console.log('\n[Test 3.5] Querying shifts with custom range ending BEFORE shift (2026-02-01 to 2026-02-15)...');
    const earlyEndOfRange = '2026-02-15T23:59:59.999Z';
    const earlyRangeRes = await fetch(`http://localhost:3100/api/shifts?created_at=gte.${startOfRange}&created_at_end=lte.${earlyEndOfRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`Early range query status: ${earlyRangeRes.status}`);
    const earlyRangeData = await earlyRangeRes.json();
    console.log(`Found ${earlyRangeData.length} shifts.`);
    if (earlyRangeData.length === 0) {
        console.log('✅ Correctly found 0 shifts when upper bound ends before the record!');
    } else {
        console.error('❌ FAILED: Found shifts outside upper bound!', earlyRangeData);
    }

    // 4. Test security validation of filter keys
    console.log('\n[Test 4] Testing invalid filter key rejection in GET...');
    const maliciousKey = "created_at` OR 1=1; --";
    const secureRes = await fetch(`http://localhost:3100/api/shifts?${encodeURIComponent(maliciousKey)}=gte.${startOfRange}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`Security test response status: ${secureRes.status}`);
    const secureData = await secureRes.json();
    console.log('Security response:', secureData);

    if (secureRes.status === 400 && secureData.error.includes('Invalid filter key')) {
        console.log('✅ Security validation test PASSED!');
    } else {
        console.error('❌ Security validation test FAILED!');
    }
}

runTests().catch(err => {
    console.error('Test run failed:', err);
    process.exit(1);
});

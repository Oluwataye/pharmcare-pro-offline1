
const mysql = require('mysql2/promise');

async function checkPort() {
    const ports = [3306, 3307, 3308];
    for (const port of ports) {
        try {
            const connection = await mysql.createConnection({
                host: '127.0.0.1',
                port: port,
                user: 'root',
                password: '#1Admin123',
                database: 'pharmcare_offline',
                connectTimeout: 2000
            });
            console.log(`SUCCESS: Connected on port ${port}`);
            await connection.end();
            process.exit(0);
        } catch (e) {
            console.log(`Failed on ${port}: ${e.message}`);
        }
    }
    console.log('FAILED: Could not connect on any standard port.');
}

checkPort();

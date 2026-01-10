import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logPath = path.join(__dirname, '../server_debug.log');

try {
    const stats = fs.statSync(logPath);
    const size = stats.size;
    const bufferSize = 20000; // Read last 20KB
    const start = Math.max(0, size - bufferSize);

    const buffer = Buffer.alloc(size - start);
    const fd = fs.openSync(logPath, 'r');
    fs.readSync(fd, buffer, 0, buffer.length, start);
    fs.closeSync(fd);

    const content = buffer.toString('utf8');
    const lines = content.split('\n');

    console.log('--- LOG TAIL ---');
    // Filter for relevant lines
    lines.forEach(line => {
        if (line.includes('POST') || line.includes('manualDiscount')) {
            console.log(line);
        }
    });
} catch (e) {
    console.error('Error reading log:', e);
}

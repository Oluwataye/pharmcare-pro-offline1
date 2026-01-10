
// Custom GET handler for receipts to support relational filtering by cashier
app.get('/api/receipts', async (req, res) => {
    try {
        const cashierParams = Object.keys(req.query).find(k => k.startsWith('sales.cashier_id'));
        let query = 'SELECT r.* FROM receipts r';
        const params = [];

        if (cashierParams) {
            // Extract the UUID from "sales.cashier_id=eq.UUID" or similar
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

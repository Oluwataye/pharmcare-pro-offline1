
-- Migration to support split payments
USE pharmcare_offline;

CREATE TABLE IF NOT EXISTS payment_records (
    id VARCHAR(36) PRIMARY KEY,
    sale_id VARCHAR(36) NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);

-- Add index for performance
CREATE INDEX idx_payment_records_sale_id ON payment_records(sale_id);
